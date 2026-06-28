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
        email: e.user.email,
        position: e.position,
        department: e.department,
        wageType: e.wageType,
        hourlyWage: e.hourlyWage,
        dailyWage: e.dailyWage,
        workStartTime: e.workStartTime,
        workEndTime: e.workEndTime,
        weeklyWorkDays: e.weeklyWorkDays,
        isActive: e.isActive,
        isPrimary: e.isPrimary,
        userStatus: e.user.status,
        joinedAt: e.createdAt,
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
        email: employment.user.email,
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
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
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
  async rejectLeave(id: string) {
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
        body: `[${leave.startDate} ~ ${leave.endDate}] 연차 신청이 반려되었습니다.`,
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

      // 3. 실제 출퇴근 레코드(AttendanceRecord) 생성/갱신
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
          status: 'normal', // 승인 시 정상 근태로 인정
        },
        create: {
          userId: correction.userId,
          companyId: correction.companyId,
          date: correction.date,
          checkIn: correction.proposedCheckIn,
          checkOut: correction.proposedCheckOut,
          workedMinutes,
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
  async rejectAttendanceCorrection(id: string) {
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
        body: `[${correction.date}] 출퇴근 정보 수정 요청이 반려되었습니다.`,
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
}
