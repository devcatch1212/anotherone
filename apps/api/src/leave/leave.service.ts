import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
        reason: data.reason ?? '',
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
    const updatedBalance = await this.recalculateAnnualLeaveBalance(userId, employmentId);

    const records = await this.prisma.leaveRecord.findMany({
      where: { userId, companyId: employment.companyId },
      orderBy: { appliedAt: 'desc' },
    });

    return { records, annualLeaveBalance: updatedBalance };
  }

  async cancelLeave(userId: string, leaveId: string) {
    const leave = await this.prisma.leaveRecord.findUnique({
      where: { id: leaveId },
    });

    if (!leave) throw new NotFoundException('휴가 신청 내역을 찾을 수 없습니다.');
    if (leave.userId !== userId) throw new ForbiddenException('본인의 휴가만 취소할 수 있습니다.');
    if (leave.status !== 'pending') throw new BadRequestException('대기 중인 휴가 신청만 취소할 수 있습니다.');

    await this.prisma.leaveRecord.update({
      where: { id: leaveId },
      data: { status: 'cancelled' },
    });

    return { message: '휴가 신청이 취소되었습니다.' };
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

    // 입사일부터 오늘까지의 전체 기간
    const diffTime = Math.abs(today.getTime() - hireDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    let remainingLeaveBalance = 0;

    if (years < 1) {
      // ─── 1년 미만 근속자: 월별 1일 (최대 11일) ───────────────────────────
      // 입사 1주년 전이므로 연차 소멸 시점이 아직 안 됨 → 전체 사용량 차감
      let totalLeaveDays = 0;
      let checkDate = new Date(hireDate);
      let months = 0;

      while (true) {
        const nextMonthDate = new Date(checkDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        if (nextMonthDate > today) break;

        const absentCount = await this.prisma.attendanceRecord.count({
          where: {
            userId,
            companyId: employment.companyId,
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

      const usedDaysRes = await this.prisma.leaveRecord.aggregate({
        where: {
          userId,
          companyId: employment.companyId,
          status: 'approved',
          type: { in: ['annual', 'half'] },
        },
        _sum: { days: true },
      });
      const usedDays = usedDaysRes._sum.days || 0;
      remainingLeaveBalance = Math.max(0, totalLeaveDays - usedDays);

    } else {
      // ─── 1년 이상 근속자: 연도별 15일 + 가산 (소멸 처리 포함) ──────────
      // 근로기준법 제60조 제7항: 연차는 발생일로부터 1년 내 미사용 시 소멸
      //
      // 연도 y (0부터 시작):
      //   근무 기간: hireDate+y년 ~ hireDate+(y+1)년
      //   연차 발생일: hireDate + (y+1)년  (입사 y+1 주년)
      //   연차 소멸일: hireDate + (y+2)년  (발생 후 1년)
      //
      // today >= 소멸일 → 해당 연도 연차 소멸 → 계산에서 제외
      const completedYears = Math.floor(years);
      let totalLeaveDays = 0;
      let validLeaveEarnedDate: Date | null = null; // 유효한 연차 중 가장 오래된 발생일

      for (let y = 0; y < completedYears; y++) {
        // 이 연도의 근무 기간
        const yearStartDate = new Date(hireDate);
        yearStartDate.setFullYear(yearStartDate.getFullYear() + y);
        const yearEndDate = new Date(hireDate);
        yearEndDate.setFullYear(yearEndDate.getFullYear() + y + 1);

        // 연차 소멸일 = 발생 후 1년 = hireDate + (y+2)년
        const leaveExpiresDate = new Date(hireDate);
        leaveExpiresDate.setFullYear(leaveExpiresDate.getFullYear() + y + 2);

        // 소멸된 연차는 계산에서 제외
        if (today >= leaveExpiresDate) continue;

        // 해당 연도 소정근로일수 계산 (근무 요일 기준)
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
            userId,
            companyId: employment.companyId,
            status: { in: ['normal', 'late'] },
            date: {
              gte: yearStartDate.toISOString().substring(0, 10),
              lt: yearEndDate.toISOString().substring(0, 10),
            },
          },
        });

        const attendanceRate = scheduledDays > 0 ? (attendedDays / scheduledDays) * 100 : 0;

        if (attendanceRate >= 80) {
          // 출근율 80% 이상: 15일 + 가산 연차 (3년차부터 2년마다 +1일, 최대 +10일)
          const additionalDays = Math.min(10, Math.floor(y / 2));
          totalLeaveDays += 15 + additionalDays;
        } else {
          // 출근율 80% 미만: 월별 개근 체크
          let checkDate = new Date(yearStartDate);
          for (let m = 0; m < 12; m++) {
            const nextMonthDate = new Date(checkDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

            const absentCount = await this.prisma.attendanceRecord.count({
              where: {
                userId,
                companyId: employment.companyId,
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

        // 유효한 연차 중 가장 오래된 발생일 기록 (FIFO 차감 기준점)
        if (validLeaveEarnedDate === null) {
          validLeaveEarnedDate = yearEndDate;
        }
      }

      if (validLeaveEarnedDate !== null) {
        // 유효한 연차 발생일 이후에 사용한 연차만 차감
        // (소멸 기간 이전 사용분은 이미 소멸된 연차에서 차감된 것으로 간주)
        const usedDaysRes = await this.prisma.leaveRecord.aggregate({
          where: {
            userId,
            companyId: employment.companyId,
            status: 'approved',
            type: { in: ['annual', 'half'] },
            startDate: {
              gte: (validLeaveEarnedDate as Date).toISOString().substring(0, 10),
            },
          },
          _sum: { days: true },
        });
        const usedDays = usedDaysRes._sum.days || 0;
        remainingLeaveBalance = Math.max(0, totalLeaveDays - usedDays);
      } else {
        // 모든 연차가 소멸됨
        remainingLeaveBalance = 0;
      }
    }

    // DB 업데이트
    await this.prisma.employment.update({
      where: { id: employmentId },
      data: { annualLeaveBalance: remainingLeaveBalance },
    });

    return remainingLeaveBalance;
  }
}
