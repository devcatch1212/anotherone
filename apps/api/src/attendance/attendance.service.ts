import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto, CheckOutDto, OvertimeRequestDto } from './dto/attendance.dto';
import { differenceInMinutes } from 'date-fns';
import { AttendanceRecord, Employment } from '@prisma/client';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 지구 반지름 (미터 단위)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 미터 단위 거리 반환
}

function getKSTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, data: CheckInDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
      include: { company: true },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');
    if (!employment.isActive) throw new BadRequestException('이미 근무가 종료된 근무지입니다. 출근 체크를 할 수 없습니다.');

    const company = employment.company;
    const distance = getDistance(data.latitude, data.longitude, company.latitude, company.longitude);
    const allowedRadius = company.radiusMeters || 100;

    if (distance > allowedRadius) {
      throw new BadRequestException(
        `📍 근무지 인증 실패! 반경 ${allowedRadius}m 밖입니다. (현재 거리: ${Math.round(distance)}m)`
      );
    }

    const now = new Date();
    const dateStr = getKSTDateString(now);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        companyId: employment.companyId,
        date: dateStr,
      },
    });

    if (existing) {
      throw new BadRequestException('이미 오늘의 출근 기록이 존재합니다.');
    }

    // ─── 전일 미퇴근 자동 처리 ───────────────────────────────────────────────
    // 오늘 이전에 출근(checkIn)은 했지만 퇴근(checkOut)이 없는 기록을 조회하여 자동 퇴근 처리
    const previousUnfinished = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        companyId: employment.companyId,
        date: { lt: dateStr },      // 오늘보다 이전 날짜
        checkIn: { not: null },      // 출근 기록 있음
        checkOut: null,              // 퇴근 기록 없음
      },
      orderBy: { date: 'desc' },
    });

    if (previousUnfinished && previousUnfinished.checkIn) {
      // 계약 퇴근 시간(workEndTime)을 기준으로 자동 퇴근 시각 계산
      const autoCheckoutTime = this.calcAutoCheckoutTime(
        previousUnfinished.checkIn,
        previousUnfinished.date,
        employment,
      );
      await this.processAutoCheckout(previousUnfinished, employment, autoCheckoutTime, 'auto_checkout');
      this.logger.log(
        `[자동퇴근] userId=${userId} date=${previousUnfinished.date} → ${autoCheckoutTime.toISOString()} 자동 퇴근 처리`,
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 지각 여부 판별: workStartTime(HH:mm)과 실제 출근 시간 비교
    let status = 'normal';
    if (employment.workStartTime) {
      const [startH, startM] = employment.workStartTime.split(':').map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(startH, startM, 0, 0);
      // 1분 초과 시 지각 처리
      if (now.getTime() > scheduledStart.getTime() + 60 * 1000) {
        status = 'late';
      }
    }

    const attendance = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        companyId: employment.companyId,
        date: dateStr,
        checkIn: now,
        status,
        distance: Math.round(distance),
      },
    });

    return { message: status === 'late' ? '지각 처리되었습니다.' : '출근 처리되었습니다.', attendance };
  }


  async checkOut(userId: string, data: CheckOutDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
      include: { company: true },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');
    if (!employment.isActive) throw new BadRequestException('이미 근무가 종료된 근무지입니다. 퇴근 체크를 할 수 없습니다.');

    const company = employment.company;
    const distance = getDistance(data.latitude, data.longitude, company.latitude, company.longitude);
    const allowedRadius = company.radiusMeters || 100;

    if (distance > allowedRadius) {
      throw new BadRequestException(
        `📍 근무지 인증 실패! 반경 ${allowedRadius}m 밖입니다. (현재 거리: ${Math.round(distance)}m)`
      );
    }

    // 야근/자정 퇴근 대응: 최근 24시간 내 출근하고 퇴근 기록이 없는 기록 우선 조회
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        companyId: employment.companyId,
        checkIn: { gte: oneDayAgo },
        checkOut: null,
      },
      orderBy: { checkIn: 'desc' },
    });

    if (!existing || !existing.checkIn) {
      throw new BadRequestException('최근 24시간 내의 출근 기록이 없거나 이미 퇴근 처리되었습니다.');
    }

    const checkOutTime = new Date();
    const checkInTime = existing.checkIn;
    const workMinutes = differenceInMinutes(checkOutTime, checkInTime);

    // 동적 휴게 시간 책정 (4시간당 30분 기준)
    let breakTime = 0;
    if (workMinutes >= 8 * 60) {
      breakTime = employment.breakMinutes ?? 60;
    } else if (workMinutes >= 4 * 60) {
      breakTime = 30;
    }

    let actualWorkMinutes = Math.max(0, workMinutes - breakTime);

    // 30분 단위 내림 정산 (예: 14분 -> 0분, 44분 -> 30분)
    actualWorkMinutes = Math.floor(actualWorkMinutes / 30) * 30;

    // 야간근로시간 계산 (22:00 ~ 06:00)
    let nightMinutes = 0;
    let cur = new Date(checkInTime);
    while (cur < checkOutTime) {
      const h = cur.getHours();
      if (h >= 22 || h < 6) nightMinutes++;
      cur.setMinutes(cur.getMinutes() + 1);
    }
    nightMinutes = Math.floor(nightMinutes / 30) * 30;
    nightMinutes = Math.min(nightMinutes, actualWorkMinutes);

    // 계약된 일일 소정 근로 시간을 기준으로 연장 근로 계산 (기본값 8시간)
    const contractWorkMinutes = (employment.dailyWorkHours || 8) * 60;
    const overtimeMinutes = Math.max(0, actualWorkMinutes - contractWorkMinutes);

    // 시급 산출 (일급제인 경우에도 추가 수당 계산을 위해 역산)
    let hourlyWage = employment.hourlyWage ?? 0;
    if (employment.wageType === 'daily') {
      const dailyWorkHours = employment.dailyWorkHours || 8;
      hourlyWage = (employment.dailyWage ?? 0) / dailyWorkHours;
    }

    // 기본급
    let basePay = 0;
    if (employment.wageType === 'daily') {
      basePay = employment.dailyWage ?? 0;
    } else {
      basePay = Math.floor((actualWorkMinutes / 60) * hourlyWage);
    }

    // 연장근로수당 (통상시급의 50% 가산)
    const overtimePay = Math.floor((overtimeMinutes / 60) * hourlyWage * 0.5);
    // 야간근로수당 (통상시급의 50% 가산)
    const nightPay = Math.floor((nightMinutes / 60) * hourlyWage * 0.5);
    const earnedPay = basePay + overtimePay + nightPay;

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        workedMinutes: actualWorkMinutes,
        overtimeMinutes,
        nightMinutes,
        basePay,
        overtimePay,
        nightPay,
        earnedPay,
      },
    });

    return { message: '퇴근 처리되었습니다.', attendance: updated };
  }

  async getMonthlyAttendance(userId: string, employmentId: string, year: number, month: number) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        userId,
        companyId: employment.companyId,
        date: { startsWith: monthStr },
      },
      orderBy: { date: 'asc' },
    });

    return { records };
  }

  async requestOvertime(userId: string, data: OvertimeRequestDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');

    const overtimeRequest = await this.prisma.overtimeRequest.create({
      data: {
        userId,
        companyId: employment.companyId,
        date: data.date,
        startTime: data.start,
        endTime: data.end,
        reason: data.reason,
        status: 'pending',
      },
    });

    return { message: '초과근무 신청이 완료되었습니다.', overtimeRequest };
  }

  // ─── 자동 퇴근 공통 처리 (스케줄러 + checkIn에서 공유) ────────────────────

  /**
   * 자동 퇴근 처리 메서드 (외부에서도 호출 가능 - 스케줄러용)
   * @param record    대상 AttendanceRecord
   * @param employment 근로 계약 정보
   * @param checkOutTime 퇴근으로 기록할 시각
   * @param autoStatus  기록될 status ('auto_checkout' | 'overtime_auto_checkout')
   */
  async processAutoCheckout(
    record: AttendanceRecord,
    employment: Employment,
    checkOutTime: Date,
    autoStatus: string,
  ) {
    const checkInTime = record.checkIn!;
    const workMinutes = differenceInMinutes(checkOutTime, checkInTime);

    // 음수 방지: 퇴근 시각이 출근 시각보다 이전이면 최소 0분 처리
    const safeWorkMinutes = Math.max(0, workMinutes);

    // 동적 휴게 시간 책정
    let breakTime = 0;
    if (safeWorkMinutes >= 8 * 60) {
      breakTime = employment.breakMinutes ?? 60;
    } else if (safeWorkMinutes >= 4 * 60) {
      breakTime = 30;
    }

    let actualWorkMinutes = Math.max(0, safeWorkMinutes - breakTime);
    // 30분 단위 내림 정산
    actualWorkMinutes = Math.floor(actualWorkMinutes / 30) * 30;

    // 야간근로시간 계산 (22:00 ~ 06:00)
    let nightMinutes = 0;
    let cur = new Date(checkInTime);
    while (cur < checkOutTime) {
      const h = cur.getHours();
      if (h >= 22 || h < 6) nightMinutes++;
      cur.setMinutes(cur.getMinutes() + 1);
    }
    nightMinutes = Math.floor(nightMinutes / 30) * 30;
    nightMinutes = Math.min(nightMinutes, actualWorkMinutes);

    // 연장 근로 계산
    const contractWorkMinutes = (employment.dailyWorkHours || 8) * 60;
    const overtimeMinutes = Math.max(0, actualWorkMinutes - contractWorkMinutes);

    // 시급 산출
    let hourlyWage = employment.hourlyWage ?? 0;
    if (employment.wageType === 'daily') {
      const dailyWorkHours = employment.dailyWorkHours || 8;
      hourlyWage = (employment.dailyWage ?? 0) / dailyWorkHours;
    }

    // 기본급
    let basePay = 0;
    if (employment.wageType === 'daily') {
      basePay = employment.dailyWage ?? 0;
    } else {
      basePay = Math.floor((actualWorkMinutes / 60) * hourlyWage);
    }

    const overtimePay = Math.floor((overtimeMinutes / 60) * hourlyWage * 0.5);
    const nightPay = Math.floor((nightMinutes / 60) * hourlyWage * 0.5);
    const earnedPay = basePay + overtimePay + nightPay;

    await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOut: checkOutTime,
        status: autoStatus,
        workedMinutes: actualWorkMinutes,
        overtimeMinutes,
        nightMinutes,
        basePay,
        overtimePay,
        nightPay,
        earnedPay,
      },
    });
  }

  /**
   * 전일 미퇴근 자동 퇴근 시각 계산
   * workEndTime이 있으면 해당 날짜의 workEndTime으로,
   * 없으면 checkIn + dailyWorkHours로 계산
   */
  private calcAutoCheckoutTime(
    checkIn: Date,
    dateStr: string,             // YYYY-MM-DD
    employment: Employment,
  ): Date {
    if (employment.workEndTime) {
      const [endH, endM] = employment.workEndTime.split(':').map(Number);
      // 해당 날짜(KST) 기준으로 퇴근 시각 생성
      const [year, month, day] = dateStr.split('-').map(Number);
      // KST 시각을 UTC로 변환 (KST = UTC+9)
      const checkoutUTC = new Date(
        Date.UTC(year, month - 1, day, endH - 9 < 0 ? endH - 9 + 24 : endH - 9, endM, 0),
      );
      // endH < 9인 경우 날짜 보정 (예: 02:00 KST → 전날 17:00 UTC)
      if (endH < 9) {
        checkoutUTC.setUTCDate(checkoutUTC.getUTCDate() + 1);
      }
      return checkoutUTC;
    }

    // workEndTime이 없으면 checkIn + dailyWorkHours
    const dailyWorkMs = (employment.dailyWorkHours || 8) * 60 * 60 * 1000;
    return new Date(checkIn.getTime() + dailyWorkMs);
  }
}
