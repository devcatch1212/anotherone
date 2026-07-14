import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 관리자 로그인
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    if (!user.isAdmin) {
      throw new UnauthorizedException('관리자 계정이 아닙니다.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = { sub: user.id, email: user.email, isAdmin: true };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { id: user.id, name: user.name, email: user.email },
    };
  }

  // 전체 근무지 목록 (근로자 수 포함)
  async getCompanies() {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { employments: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      latitude: c.latitude,
      longitude: c.longitude,
      radiusMeters: c.radiusMeters,
      activeEmployeeCount: c._count.employments,
      createdAt: c.createdAt,
    }));
  }

  // 근무지별 근로자 목록
  async getEmployeesByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('근무지를 찾을 수 없습니다.');

    const employments = await this.prisma.employment.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      company: { id: company.id, name: company.name, address: company.address },
      employees: employments.map((e) => ({
        employmentId: e.id,
        userId: e.userId,
        name: e.user.name,
        email: e.user.email ?? '',
        position: e.position,
        department: e.department,
        wageType: e.wageType,
        hourlyWage: e.hourlyWage,
        dailyWage: e.dailyWage,
        weeklyWage: e.weeklyWage,
        monthlyWage: e.monthlyWage,
        workStartTime: e.workStartTime,
        workEndTime: e.workEndTime,
        weeklyWorkDays: e.weeklyWorkDays,
        isActive: e.isActive,
        isPrimary: e.isPrimary,
        userStatus: e.user.status,
        joinedAt: e.createdAt,
        hireDate: e.hireDate,
        memo: e.memo,
      })),
    };
  }

  // 근로자 고용 상세 정보
  async getEmployeeDetail(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            status: true,
          },
        },
        company: true,
      },
    });
    if (!employment) throw new NotFoundException('고용 정보를 찾을 수 없습니다.');

    return employment;
  }

  // 근로자별 출퇴근 기록 (월별)
  async getAttendanceByEmployment(
    employmentId: string,
    year: number,
    month: number,
  ) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: { user: true, company: true },
    });
    if (!employment) throw new NotFoundException('고용 정보를 찾을 수 없습니다.');

    // 해당 월의 날짜 범위 계산
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        userId: employment.userId,
        companyId: employment.companyId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const totalWorkedMinutes = records.reduce(
      (sum, r) => sum + (r.workedMinutes ?? 0),
      0,
    );
    const normalCount = records.filter((r) => r.status === 'normal').length;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;

    return {
      employee: {
        name: employment.user.name,
        email: employment.user.email ?? '',
        position: employment.position,
        department: employment.department,
      },
      company: { name: employment.company.name },
      period: { year, month },
      summary: {
        totalDays: records.filter((r) => r.checkIn).length,
        totalWorkedMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 10) / 10,
        normalCount,
        lateCount,
        absentCount,
      },
      records,
    };
  }

  // 연차 신청 목록 조회
  async getLeaves() {
    return this.prisma.leaveRecord.findMany({
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  // 연차 승인
  async approveLeave(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRecord.findUnique({ where: { id } });
      if (!leave) throw new NotFoundException('연차 신청 기록을 찾을 수 없습니다.');
      if (leave.status !== 'pending') throw new Error('대기 중인 신청만 승인할 수 있습니다.');

      // 1. 상태 변경
      const updatedLeave = await tx.leaveRecord.update({
        where: { id },
        data: { status: 'approved' },
      });

      // 2. 근로계약의 연차 잔액 차감
      const employment = await tx.employment.findFirst({
        where: { userId: leave.userId, companyId: leave.companyId, isActive: true },
      });
      if (employment) {
        await tx.employment.update({
          where: { id: employment.id },
          data: { annualLeaveBalance: { decrement: leave.days } },
        });
      }

      // 3. 출퇴근 기록(AttendanceRecord)에 휴가(vacation) 상태의 레코드 생성/갱신
      // 휴가 기간 동안 매일의 기록을 생성
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const dates: string[] = [];
      const current = new Date(start);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const date = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${date}`);
        current.setDate(current.getDate() + 1);
      }

      for (const date of dates) {
        await tx.attendanceRecord.upsert({
          where: { userId_companyId_date: { userId: leave.userId, companyId: leave.companyId, date } },
          update: { status: 'vacation', workedMinutes: 0 },
          create: {
            userId: leave.userId,
            companyId: leave.companyId,
            date,
            status: 'vacation',
            workedMinutes: 0,
          },
        });
      }

      // 4. 알림 발송
      await tx.notification.create({
        data: {
          userId: leave.userId,
          companyId: leave.companyId,
          type: 'leave_approved',
          title: '연차 신청 승인',
          body: `[${leave.startDate} ~ ${leave.endDate}] 연차 신청이 승인되었습니다. (${leave.days}일 차감)`,
        },
      });

      return updatedLeave;
    });
  }

  // 연차 반려
  async rejectLeave(id: string, rejectReason?: string) {
    const leave = await this.prisma.leaveRecord.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('연차 신청 기록을 찾을 수 없습니다.');
    if (leave.status !== 'pending') throw new Error('대기 중인 신청만 반려할 수 있습니다.');

    const updatedLeave = await this.prisma.leaveRecord.update({
      where: { id },
      data: { status: 'rejected' },
    });

    await this.prisma.notification.create({
      data: {
        userId: leave.userId,
        companyId: leave.companyId,
        type: 'leave_rejected',
        title: '연차 신청 반려',
        body: `[${leave.startDate} ~ ${leave.endDate}] 연차 신청이 반려되었습니다.${
          rejectReason && rejectReason.trim() ? ` (사유: ${rejectReason.trim()})` : ''
        }`,
      },
    });

    return updatedLeave;
  }

  // 출퇴근 수정 요청 목록 조회
  async getAttendanceCorrections() {
    return this.prisma.attendanceCorrection.findMany({
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 출퇴근 수정 요청 승인
  async approveAttendanceCorrection(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const correction = await tx.attendanceCorrection.findUnique({ where: { id } });
      if (!correction) throw new NotFoundException('수정 요청을 찾을 수 없습니다.');
      if (correction.status !== 'pending') throw new Error('대기 중인 요청만 승인할 수 있습니다.');

      // 1. 상태 변경
      const updatedCorrection = await tx.attendanceCorrection.update({
        where: { id },
        data: { status: 'approved' },
      });

      // 2. 근무 시간(분) 계산
      let workedMinutes = null;
      if (correction.proposedCheckIn && correction.proposedCheckOut) {
        const diffMs = new Date(correction.proposedCheckOut).getTime() - new Date(correction.proposedCheckIn).getTime();
        workedMinutes = Math.max(0, Math.floor(diffMs / 1000 / 60));
      }

      // 3. 임금 재계산 (정정된 시간 비례)
      let basePay = null;
      let earnedPay = null;

      const employment = await tx.employment.findFirst({
        where: { userId: correction.userId, companyId: correction.companyId, isActive: true },
      });

      if (employment && workedMinutes !== null) {
        let hourlyWage = employment.hourlyWage ?? 0;
        if (employment.wageType === 'daily') {
          const dailyWorkHours = employment.dailyWorkHours || 8;
          hourlyWage = (employment.dailyWage ?? 0) / dailyWorkHours;
        }

        if (employment.wageType === 'daily') {
          basePay = employment.dailyWage ?? 0;
        } else {
          basePay = Math.floor((workedMinutes / 60) * hourlyWage);
        }
        earnedPay = basePay; // 다른 가산 수당은 연장근무 승인 시 등에 갱신되므로 기본 1배로 시작
      }

      // 4. 실제 출퇴근 레코드(AttendanceRecord) 생성/갱신
      await tx.attendanceRecord.upsert({
        where: {
          userId_companyId_date: {
            userId: correction.userId,
            companyId: correction.companyId,
            date: correction.date,
          },
        },
        update: {
          checkIn: correction.proposedCheckIn,
          checkOut: correction.proposedCheckOut,
          workedMinutes,
          basePay,
          earnedPay,
          status: 'normal', // 승인 시 정상 근태로 인정
        },
        create: {
          userId: correction.userId,
          companyId: correction.companyId,
          date: correction.date,
          checkIn: correction.proposedCheckIn,
          checkOut: correction.proposedCheckOut,
          workedMinutes,
          basePay,
          earnedPay,
          status: 'normal',
        },
      });

      // 4. 알림 발송
      await tx.notification.create({
        data: {
          userId: correction.userId,
          companyId: correction.companyId,
          type: 'overtime_approved', // 기존 양식 재활용 혹은 임의지정
          title: '출퇴근 수정 요청 승인',
          body: `[${correction.date}] 출퇴근 정보 수정 요청이 승인되었습니다.`,
        },
      });

      return updatedCorrection;
    });
  }

  // 출퇴근 수정 요청 반려
  async rejectAttendanceCorrection(id: string, rejectReason?: string) {
    const correction = await this.prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!correction) throw new NotFoundException('수정 요청을 찾을 수 없습니다.');
    if (correction.status !== 'pending') throw new Error('대기 중인 요청만 반려할 수 있습니다.');

    const updatedCorrection = await this.prisma.attendanceCorrection.update({
      where: { id },
      data: { status: 'rejected' },
    });

    await this.prisma.notification.create({
      data: {
        userId: correction.userId,
        companyId: correction.companyId,
        type: 'overtime_rejected',
        title: '출퇴근 수정 요청 반려',
        body: `[${correction.date}] 출퇴근 정보 수정 요청이 반려되었습니다.${
          rejectReason && rejectReason.trim() ? ` (사유: ${rejectReason.trim()})` : ''
        }`,
      },
    });

    return updatedCorrection;
  }

  // 설정 메뉴용 전체 데이터 (비활성화 대상 포함)
  async getSettingsData() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const employments = await this.prisma.employment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { companies, employments };
  }

  // 근무지 활성/비활성 상태 변경
  async updateCompanyStatus(id: string, isActive: boolean) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('근무지를 찾을 수 없습니다.');

    return this.prisma.company.update({
      where: { id },
      data: { isActive: isActive as any },
    });
  }

  // 근로자 고용계약 재직/퇴사 상태 변경
  async updateEmploymentStatus(id: string, isActive: boolean) {
    const employment = await this.prisma.employment.findUnique({ where: { id } });
    if (!employment) throw new NotFoundException('고용 계약을 찾을 수 없습니다.');

    return this.prisma.employment.update({
      where: { id },
      data: {
        isActive: isActive as any,
        endedAt: isActive ? null : new Date(),
      },
    });
  }

  // 연장 근무 신청 목록 조회
  async getOvertimes() {
    return this.prisma.overtimeRequest.findMany({
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 연장 근무 승인
  async approveOvertime(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.overtimeRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('연장 근무 신청 기록을 찾을 수 없습니다.');
      if (request.status !== 'pending') throw new Error('대기 중인 신청만 승인할 수 있습니다.');

      // 1. 상태 변경
      const updatedRequest = await tx.overtimeRequest.update({
        where: { id },
        data: { status: 'approved' },
      });

      // startTime, endTime (HH:mm) 파싱하여 분 차이 계산
      const [startH, startM] = request.startTime.split(':').map(Number);
      const [endH, endM] = request.endTime.split(':').map(Number);
      
      let overtimeMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (overtimeMinutes < 0) {
        overtimeMinutes += 24 * 60; // 자정 넘김 대응
      }

      // 2. 해당 일자의 출퇴근 기록(AttendanceRecord) 조회 및 갱신
      const record = await tx.attendanceRecord.findFirst({
        where: { userId: request.userId, companyId: request.companyId, date: request.date },
      });

      if (record) {
        // 근로계약 정보에서 시급 산출
        const employment = await tx.employment.findFirst({
          where: { userId: request.userId, companyId: request.companyId, isActive: true },
        });

        if (employment) {
          let hourlyWage = employment.hourlyWage ?? 0;
          if (employment.wageType === 'daily') {
            const dailyWorkHours = employment.dailyWorkHours || 8;
            hourlyWage = (employment.dailyWage ?? 0) / dailyWorkHours;
          }

          // 연장 근무 수당 정산 (통상 시급의 1.5배 기준)
          const overtimePay = Math.floor((overtimeMinutes / 60) * hourlyWage * 1.5);
          const earnedPay = (record.basePay ?? 0) + overtimePay + (record.nightPay ?? 0);

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              overtimeMinutes,
              overtimePay,
              earnedPay,
            },
          });
        }
      }

      // 3. 알림 발송
      await tx.notification.create({
        data: {
          userId: request.userId,
          companyId: request.companyId,
          type: 'overtime_approved',
          title: '연장 근무 승인',
          body: `[${request.date}] 연장 근무 신청이 승인되었습니다. (${request.startTime} ~ ${request.endTime}, 총 ${overtimeMinutes}분)`,
        },
      });

      return updatedRequest;
    });
  }

  // 연장 근무 반려
  async rejectOvertime(id: string, rejectReason?: string) {
    const request = await this.prisma.overtimeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('연장 근무 신청 기록을 찾을 수 없습니다.');
    if (request.status !== 'pending') throw new Error('대기 중인 신청만 반려할 수 있습니다.');

    const updatedRequest = await this.prisma.overtimeRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });

    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        companyId: request.companyId,
        type: 'overtime_rejected',
        title: '연장 근무 반려',
        body: `[${request.date}] 연장 근무 신청이 반려되었습니다.${
          rejectReason && rejectReason.trim() ? ` (사유: ${rejectReason.trim()})` : ''
        }`,
      },
    });

    return updatedRequest;
  }

  // 월별 급여 대장 집계 및 조회
  async getPayrolls(year: number, month: number, companyId?: string) {
    // 1. 해당 연월의 시작일과 종료일 계산
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    // 2. 대상 고용 계약(Employment) 조회 (당월 재직자 + 당월 내 퇴사자 포함)
    const employments = await this.prisma.employment.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: [
          { isActive: true },
          {
            isActive: false,
            endedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate + 'T23:59:59.999Z'),
            },
          },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });

    const payrolls = [];

    for (const emp of employments) {
      // 3. 해당 월의 출퇴근 기록 조회
      const records = await this.prisma.attendanceRecord.findMany({
        where: {
          userId: emp.userId,
          companyId: emp.companyId,
          date: { gte: startDate, lte: endDate },
        },
      });

      // 4. 근태 요약 합산
      const workedDays = records.filter(r => r.checkIn).length;
      const basePaySum = records.reduce((sum, r) => sum + (r.basePay ?? 0), 0);
      const overtimePaySum = records.reduce((sum, r) => sum + (r.overtimePay ?? 0), 0);
      const nightPaySum = records.reduce((sum, r) => sum + (r.nightPay ?? 0), 0);

      // 주휴수당 간단 산출 (주 15시간 근무 시 1일분 시급 지급)
      const hourlyWage = emp.hourlyWage ?? 0;
      const weeklyHours = emp.dailyWorkHours * emp.weeklyWorkDays;
      let holidayPay = 0;
      if (weeklyHours >= 15 && workedDays > 0) {
        // 대략 주당 1일치의 주휴수당 부여 (한 달은 평균 4.34주)
        holidayPay = Math.floor(hourlyWage * emp.dailyWorkHours * 4.34);
      }

      const totalGross = basePaySum + overtimePaySum + nightPaySum + holidayPay;

      // 4대보험 공제액 연산 (대한민국 표준 간이 계산)
      const nationalPension = Math.floor(totalGross * 0.045); // 국민연금 4.5%
      const healthInsurance = Math.floor(totalGross * 0.0354); // 건강보험 3.54%
      const employmentInsurance = Math.floor(totalGross * 0.009); // 고용보험 0.9%
      const incomeTax = Math.floor(totalGross * 0.015); // 근로소득세 대략 1.5%
      const totalDeduction = nationalPension + healthInsurance + employmentInsurance + incomeTax;
      const netPay = Math.max(0, totalGross - totalDeduction);

      // 5. 이미 발행 완료된 명세서가 있는지 조회
      const existingPayroll = await this.prisma.payrollRecord.findUnique({
        where: {
          userId_companyId_year_month: {
            userId: emp.userId,
            companyId: emp.companyId,
            year,
            month,
          },
        },
      });

      payrolls.push({
        userId: emp.userId,
        userName: emp.user.name,
        userEmail: emp.user.email ?? '',
        companyId: emp.companyId,
        companyName: emp.company.name,
        position: emp.position,
        workedDays,
        basePay: existingPayroll ? existingPayroll.basePay : basePaySum,
        holidayPay: existingPayroll ? existingPayroll.holidayPay : holidayPay,
        overtimePay: existingPayroll ? existingPayroll.overtimePay : overtimePaySum,
        nightPay: existingPayroll ? existingPayroll.nightPay : nightPaySum,
        totalGross: existingPayroll ? existingPayroll.totalGross : totalGross,
        nationalPension: existingPayroll ? existingPayroll.nationalPension : nationalPension,
        healthInsurance: existingPayroll ? existingPayroll.healthInsurance : healthInsurance,
        employmentInsurance: existingPayroll ? existingPayroll.employmentInsurance : employmentInsurance,
        incomeTax: existingPayroll ? existingPayroll.incomeTax : incomeTax,
        totalDeduction: existingPayroll ? existingPayroll.totalDeduction : totalDeduction,
        netPay: existingPayroll ? existingPayroll.netPay : netPay,
        confirmed: existingPayroll ? existingPayroll.confirmed : false,
        paidAt: existingPayroll ? existingPayroll.paidAt : null,
      });
    }

    return payrolls;
  }

  // 월별 급여 명세서 일괄 발행
  async issuePayrolls(year: number, month: number, companyId: string | undefined, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      const issuedRecords = [];

      for (const item of items) {
        // 1. PayrollRecord Upsert (발행 데이터 저장)
        const payroll = await tx.payrollRecord.upsert({
          where: {
            userId_companyId_year_month: {
              userId: item.userId,
              companyId: item.companyId,
              year,
              month,
            },
          },
          update: {
            basePay: item.basePay,
            holidayPay: item.holidayPay,
            overtimePay: item.overtimePay,
            nightPay: item.nightPay,
            totalGross: item.totalGross,
            nationalPension: item.nationalPension,
            healthInsurance: item.healthInsurance,
            employmentInsurance: item.employmentInsurance,
            incomeTax: item.incomeTax,
            totalDeduction: item.totalDeduction,
            netPay: item.netPay,
            confirmed: true,
            paidAt: new Date(),
            workedDays: item.workedDays,
          },
          create: {
            userId: item.userId,
            companyId: item.companyId,
            year,
            month,
            basePay: item.basePay,
            holidayPay: item.holidayPay,
            overtimePay: item.overtimePay,
            nightPay: item.nightPay,
            totalGross: item.totalGross,
            nationalPension: item.nationalPension,
            healthInsurance: item.healthInsurance,
            employmentInsurance: item.employmentInsurance,
            incomeTax: item.incomeTax,
            totalDeduction: item.totalDeduction,
            netPay: item.netPay,
            confirmed: true,
            paidAt: new Date(),
            workedDays: item.workedDays,
          },
        });

        // 2. 모바일 푸시용 알림 발송
        await tx.notification.create({
          data: {
            userId: item.userId,
            companyId: item.companyId,
            type: 'payroll_issued',
            title: '급여 명세서 발행',
            body: `[${year}년 ${month}월] 급여 명세서가 발행되었습니다. 실수령액: ${item.netPay.toLocaleString()}원`,
          },
        });

        issuedRecords.push(payroll);
      }

      return { success: true, count: issuedRecords.length };
    });
  }
}
