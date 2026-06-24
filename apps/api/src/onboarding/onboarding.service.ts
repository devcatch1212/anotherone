import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async createCompanyAndEmployment(userId: string, data: any) {
    const {
      companyName,
      address,
      latitude,
      longitude,
      radiusMeters,
      position,
      department,
      wageType,
      hourlyWage,
      dailyWage,
      dailyWorkHours,
      weeklyWorkDays,
      workStartTime,
      workEndTime,
      workDaysOfWeek,
      breakMinutes,
    } = data;

    // 1. 회사 생성 (이 데모에서는 항상 새로 생성한다고 가정)
    const company = await this.prisma.company.create({
      data: {
        name: companyName,
        address,
        latitude,
        longitude,
        radiusMeters: radiusMeters || 100,
      },
    });

    // 2. 근로 계약(Employment) 생성
    // 기존에 isPrimary인 계약이 있으면 해제하고 새 계약을 Primary로 설정
    await this.prisma.employment.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    const employment = await this.prisma.employment.create({
      data: {
        userId,
        companyId: company.id,
        position: position || '직원',
        department: department || null,
        wageType,
        hourlyWage,
        dailyWage,
        dailyWorkHours,
        weeklyWorkDays,
        workStartTime,
        workEndTime,
        workDaysOfWeek,
        breakMinutes,
        isPrimary: true, // 가장 최근에 추가된 근무지를 Primary로 설정
      },
    });

    // 3. User의 온보딩 완료 상태 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return { company, employment };
  }

  async skipOnboarding(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
    return { success: true, user };
  }
}
