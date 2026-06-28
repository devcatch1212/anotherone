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
}
