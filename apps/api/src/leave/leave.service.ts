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

    const records = await this.prisma.leaveRecord.findMany({
      where: { userId, companyId: employment.companyId },
      orderBy: { appliedAt: 'desc' },
    });

    return { records };
  }
}
