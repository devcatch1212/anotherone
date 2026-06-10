import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { differenceInMinutes, format } from 'date-fns';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, data: CheckInDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');

    const dateStr = format(new Date(), 'yyyy-MM-dd');

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

    const attendance = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        companyId: employment.companyId,
        date: dateStr,
        checkIn: new Date(),
        status: 'normal',
        distance: 0,
      },
    });

    return { message: '출근 처리되었습니다.', attendance };
  }

  async checkOut(userId: string, data: CheckOutDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
    });
    if (!employment) throw new NotFoundException('유효하지 않은 근로계약입니다.');

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
