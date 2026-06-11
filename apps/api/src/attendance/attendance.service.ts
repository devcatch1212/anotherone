import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { differenceInMinutes, format } from 'date-fns';

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

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, data: CheckInDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
      include: { company: true },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');

    const company = employment.company;
    const distance = getDistance(data.latitude, data.longitude, company.latitude, company.longitude);
    const allowedRadius = company.radiusMeters || 100;

    if (distance > allowedRadius) {
      throw new BadRequestException(
        `📍 근무지 인증 실패! 반경 ${allowedRadius}m 밖입니다. (현재 거리: ${Math.round(distance)}m)`
      );
    }

    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');

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

    const company = employment.company;
    const distance = getDistance(data.latitude, data.longitude, company.latitude, company.longitude);
    const allowedRadius = company.radiusMeters || 100;

    if (distance > allowedRadius) {
      throw new BadRequestException(
        `📍 근무지 인증 실패! 반경 ${allowedRadius}m 밖입니다. (현재 거리: ${Math.round(distance)}m)`
      );
    }

    const dateStr = format(new Date(), 'yyyy-MM-dd');

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        userId,
        companyId: employment.companyId,
        date: dateStr,
      },
    });

    if (!existing || !existing.checkIn) {
      throw new BadRequestException('오늘의 출근 기록이 없습니다.');
    }

    if (existing.checkOut) {
      throw new BadRequestException('이미 퇴근 처리가 완료되었습니다.');
    }

    const checkOutTime = new Date();
    const checkInTime = existing.checkIn;
    const workMinutes = differenceInMinutes(checkOutTime, checkInTime);
    const breakTime = employment.breakMinutes ?? 60;
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
    const overtimeMinutes = Math.max(0, actualWorkMinutes - (8 * 60)); // 8시간 초과시

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
}
