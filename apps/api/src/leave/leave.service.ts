import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async applyLeave(userId: string, data: ApplyLeaveDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
      include: { company: true },
    });

    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    const leave = await this.prisma.leaveRecord.create({
      data: {
        userId,
        companyId: employment.companyId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days: data.days,
        reason: data.reason,
        status: 'pending',
      },
    });

    return { message: '휴가 신청이 완료되었습니다.', leave };
  }

  async getLeaves(userId: string, employmentId: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
    });

    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    // 연차 정보 실시간 계산 및 DB 업데이트
    await this.recalculateAnnualLeaveBalance(userId, employmentId);

    const records = await this.prisma.leaveRecord.findMany({
      where: { userId, companyId: employment.companyId },
      orderBy: { appliedAt: 'desc' },
    });

    return { records };
  }

  async recalculateAnnualLeaveBalance(userId: string, employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
    });

    if (!employment) return 0;

    const { employeeCount, dailyWorkHours, weeklyWorkDays, hireDate } = employment;

    // 1. 5인 미만(under5) 이면 연차 0개
    if (employeeCount === 'under5') {
      await this.prisma.employment.update({
        where: { id: employmentId },
        data: { annualLeaveBalance: 0 },
      });
      return 0;
    }

    // 2. 주간 소정근로시간이 15시간 미만이면 연차 0개
    const weeklyWorkHours = weeklyWorkDays * dailyWorkHours;
    if (weeklyWorkHours < 15) {
      await this.prisma.employment.update({
        where: { id: employmentId },
        data: { annualLeaveBalance: 0 },
      });
      return 0;
    }

    // 입사일이 지정되어 있지 않으면 계산 불가하므로 0일
    if (!hireDate) {
      await this.prisma.employment.update({
        where: { id: employmentId },
        data: { annualLeaveBalance: 0 },
      });
      return 0;
    }

    const today = new Date();
    
    // 입사일부터 오늘까지의 전체 기간 개근월수 및 출근율 계산
    const diffTime = Math.abs(today.getTime() - hireDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    let totalLeaveDays = 0;

    if (years < 1) {
      // 1년 미만 근속자:
      // 최근 1개월 개근이면 연차 1일 발생 (매 월 단위 개근 체크, 입사월 기준 최대 11일)
      let months = 0;
      let checkDate = new Date(hireDate);
      
      while (true) {
        const nextMonthDate = new Date(checkDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        if (nextMonthDate > today) break;

        const absentCount = await this.prisma.attendanceRecord.count({
          where: {
            employmentId,
            status: 'absent',
            date: {
              gte: checkDate.toISOString().substring(0, 10),
              lt: nextMonthDate.toISOString().substring(0, 10),
            },
          },
        });

        if (absentCount === 0) {
          totalLeaveDays += 1;
        }

        months++;
        checkDate = nextMonthDate;
        if (months >= 11) break; // 최대 11일
      }
    } else {
      // 1년 이상 근속자:
      // 출근율이 80% 이상이면 연차 15일 발생
      // 출근율이 80% 미만이면 월 개근 기준으로 계산
      const completedYears = Math.floor(years);
      
      for (let y = 0; y < completedYears; y++) {
        const yearStartDate = new Date(hireDate);
        yearStartDate.setFullYear(yearStartDate.getFullYear() + y);
        const yearEndDate = new Date(hireDate);
        yearEndDate.setFullYear(yearEndDate.getFullYear() + y + 1);

        // 해당 년도 소정근로일수 구하기 (기본적으로 근무요일에 해당하는 일수)
        let scheduledDays = 0;
        let tempDate = new Date(yearStartDate);
        const workDaysSet = new Set(employment.workDaysOfWeek);
        
        while (tempDate < yearEndDate) {
          const jsDay = tempDate.getDay();
          const dbDay = jsDay === 0 ? 6 : jsDay - 1;
          if (workDaysSet.has(dbDay)) {
            scheduledDays++;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }

        // 실제 출근일수 (normal, late)
        const attendedDays = await this.prisma.attendanceRecord.count({
          where: {
            employmentId,
            status: { in: ['normal', 'late'] },
            date: {
              gte: yearStartDate.toISOString().substring(0, 10),
              lt: yearEndDate.toISOString().substring(0, 10),
            },
          },
        });

        const attendanceRate = scheduledDays > 0 ? (attendedDays / scheduledDays) * 100 : 0;

        if (attendanceRate >= 80) {
          const additionalDays = Math.min(10, Math.floor(y / 2));
          totalLeaveDays += (15 + additionalDays);
        } else {
          // 80% 미만: 1년 동안 월별 개근일수 체크
          let checkDate = new Date(yearStartDate);
          for (let m = 0; m < 12; m++) {
            const nextMonthDate = new Date(checkDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

            const absentCount = await this.prisma.attendanceRecord.count({
              where: {
                employmentId,
                status: 'absent',
                date: {
                  gte: checkDate.toISOString().substring(0, 10),
                  lt: nextMonthDate.toISOString().substring(0, 10),
                },
              },
            });

            if (absentCount === 0) {
              totalLeaveDays += 1;
            }
            checkDate = nextMonthDate;
          }
        }
      }
    }

    // 이미 사용 및 승인 완료된 연차 개수 계산
    const usedDaysRes = await this.prisma.leaveRecord.aggregate({
      where: {
        userId,
        companyId: employment.companyId,
        status: 'approved',
        type: { in: ['annual', 'half'] },
      },
      _sum: {
        days: true,
      },
    });

    const usedDays = usedDaysRes._sum.days || 0;
    const remainingLeaveBalance = Math.max(0, totalLeaveDays - usedDays);

    // DB 업데이트
    await this.prisma.employment.update({
      where: { id: employmentId },
      data: { annualLeaveBalance: remainingLeaveBalance },
    });

    return remainingLeaveBalance;
  }
}
