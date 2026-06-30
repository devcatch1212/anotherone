import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UpdatePasswordDto } from './dto/settings.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: data.employmentId, userId },
      include: { company: true },
    });

    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    // Update Company
    await this.prisma.company.update({
      where: { id: employment.companyId },
      data: {
        name: data.companyName,
        address: data.companyAddress,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    // Update Employment
    const updatedEmployment = await this.prisma.employment.update({
      where: { id: employment.id },
      data: {
        position: data.position || '직원',
        department: data.department || null,
        wageType: data.wageType,
        hourlyWage: data.wageType === 'hourly' ? data.hourlyWage : null,
        dailyWage: data.wageType === 'daily' ? data.dailyWage : null,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        breakMinutes: data.breakMinutes,
        workDaysOfWeek: data.workDaysOfWeek,
        weeklyWorkDays: data.workDaysOfWeek.length,
      },
      include: { company: true },
    });

    return { message: '설정이 저장되었습니다.', employment: updatedEmployment };
  }

  async updatePassword(userId: string, data: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new BadRequestException('비밀번호를 설정할 수 없는 계정입니다.');
    }

    const isMatch = await bcrypt.compare(data.current, user.password);
    if (!isMatch) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
    }

    const hashed = await bcrypt.hash(data.next, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  async withdraw(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (user.status === 'withdrawn') {
      throw new BadRequestException('이미 탈퇴한 회원입니다.');
    }

    const uniqueSuffix = `_withdrawn_${Date.now()}`;
    const newEmail = user.email ? `${user.email}${uniqueSuffix}` : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'withdrawn',
        email: newEmail,
      },
    });

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  async endEmployment(userId: string, employmentId: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
    });
    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }
    if (!employment.isActive) {
      throw new BadRequestException('이미 종료된 근로계약입니다.');
    }

    const updated = await this.prisma.employment.update({
      where: { id: employmentId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
      include: { company: true },
    });

    return { message: '근무가 종료 처리되었습니다.', employment: updated };
  }

  async updateName(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('이름은 비워둘 수 없습니다.');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });
    return { message: '사용자 이름이 성공적으로 변경되었습니다.', user: updatedUser };
  }
}
