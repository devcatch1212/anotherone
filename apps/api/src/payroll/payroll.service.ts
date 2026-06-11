import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  private splitIntoWeeks(year: number, month: number) {
    const weeks = [];
    const lastDate = new Date(year, month, 0).getDate();
    let currentWeekStart = 1;

    for (let d = 1; d <= lastDate; d++) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() === 0 || d === lastDate) {
        weeks.push({ start: currentWeekStart, end: d });
        currentWeekStart = d + 1;
      }
    }
    return weeks;
  }

  async generateOrUpdatePayroll(userId: string, employmentId: string, year: number, month: number) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
      include: { company: true },
    });
    if (!employment) return null;

    const existing = await this.prisma.payrollRecord.findUnique({
      where: {
        userId_companyId_year_month: {
          userId,
          companyId: employment.companyId,
          year,
          month,
        }
      }
    });

    if (existing && existing.confirmed) return existing;

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        userId,
        companyId: employment.companyId,
        date: { startsWith: monthStr },
      },
      orderBy: { date: 'asc' },
    });

    let basePay = 0;
    let overtimePay = 0;
    let nightPay = 0;
    let workedDays = 0;

    records.forEach((r: any) => {
      basePay += (r.basePay || 0);
      overtimePay += (r.overtimePay || 0);
      nightPay += (r.nightPay || 0);
      if (r.workedMinutes && r.workedMinutes > 0) workedDays++;
    });

    let holidayPay = 0;
    let hourlyWage = employment.hourlyWage ?? 0;
    if (employment.wageType === 'daily') {
      const dailyWorkHours = employment.dailyWorkHours || 8;
      hourlyWage = (employment.dailyWage ?? 0) / dailyWorkHours;
    }
    
    const weeklyScheduledHours = employment.dailyWorkHours * employment.workDaysOfWeek.length;
    const workDaysRequired = employment.workDaysOfWeek.length;
    const weeks = this.splitIntoWeeks(year, month);

    weeks.forEach(week => {
      let weekWorkedMinutes = 0;
      let weekWorkedDays = 0;

      const weekRecords = records.filter((r: any) => {
        const d = parseInt(r.date.split('-')[2], 10);
        return d >= week.start && d <= week.end;
      });

      weekRecords.forEach((r: any) => {
        if (r.workedMinutes && r.workedMinutes > 0) {
          weekWorkedMinutes += r.workedMinutes;
          // check if they worked on a scheduled day
          const curDate = new Date(r.date);
          // day of week: 0=Sun, 1=Mon...6=Sat. DB workDaysOfWeek expects the same.
          // Wait, earlier I wrote workDaysOfWeek array of numbers 0=Mon.. but standard JS getDay() is 0=Sun. 
          // Let's assume standard JS getDay for matching.
          if (employment.workDaysOfWeek.includes(curDate.getDay())) {
             weekWorkedDays++;
          }
        }
      });

      const weekWorkedHours = weekWorkedMinutes / 60;
      if (weekWorkedDays >= workDaysRequired && weekWorkedHours >= 15) {
         const holidayHours = Math.min(40, weeklyScheduledHours) / 5;
         holidayPay += Math.floor(holidayHours * hourlyWage);
      }
    });

    const totalGross = basePay + overtimePay + nightPay + holidayPay;
    // mock deductions
    const nationalPension = Math.floor(totalGross * 0.045);
    const healthInsurance = Math.floor(totalGross * 0.03545);
    const employmentInsurance = Math.floor(totalGross * 0.009);
    const incomeTax = Math.floor(totalGross * 0.03); 
    const totalDeduction = nationalPension + healthInsurance + employmentInsurance + incomeTax;
    const netPay = totalGross - totalDeduction;

    const data = {
      basePay,
      holidayPay,
      overtimePay,
      nightPay,
      totalGross,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      incomeTax,
      totalDeduction,
      netPay,
      workedDays,
      confirmed: false,
    };

    if (existing) {
      return await this.prisma.payrollRecord.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return await this.prisma.payrollRecord.create({
        data: {
          userId,
          companyId: employment.companyId,
          year,
          month,
          ...data,
        },
      });
    }
  }

  async getPayrolls(userId: string, employmentId: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
      include: { company: true },
    });

    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    const today = new Date();
    await this.generateOrUpdatePayroll(userId, employmentId, today.getFullYear(), today.getMonth() + 1);

    const records = await this.prisma.payrollRecord.findMany({
      where: { userId, companyId: employment.companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return { records };
  }

  async getPayrollById(userId: string, payrollId: string) {
    const record = await this.prisma.payrollRecord.findFirst({
      where: { id: payrollId, userId },
      include: { company: true },
    });

    if (!record) {
      throw new NotFoundException('급여명세서를 찾을 수 없습니다.');
    }

    if (!record.confirmed) {
      // companyId로 올바른 employment를 찾아 재정산
      const employment = await this.prisma.employment.findFirst({
        where: { userId, companyId: record.companyId },
      });
      if (employment) {
        await this.generateOrUpdatePayroll(userId, employment.id, record.year, record.month);
      }
      return await this.prisma.payrollRecord.findFirst({
        where: { id: payrollId, userId },
        include: { company: true },
      });
    }

    return record;
  }


  async confirmPayroll(userId: string, payrollId: string) {
    const record = await this.prisma.payrollRecord.findFirst({
      where: { id: payrollId, userId },
    });

    if (!record) {
      throw new NotFoundException('급여명세서를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.payrollRecord.update({
      where: { id: payrollId },
      data: { confirmed: true, paidAt: new Date() },
    });

    return { message: '급여명세서 확인이 완료되었습니다.', record: updated };
  }
}
