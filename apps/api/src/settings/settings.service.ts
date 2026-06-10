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
      },
    });

    // Update Employment
    const updatedEmployment = await this.prisma.employment.update({
      where: { id: employment.id },
      data: {
        wageType: data.wageType,
        hourlyWage: data.wageType === 'hourly' ? data.hourlyWage : null,
        dailyWage: data.wageType === 'daily' ? data.dailyWage : null,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        breakMinutes: data.breakMinutes,
        workDaysOfWeek: data.workDaysOfWeek,
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
}
