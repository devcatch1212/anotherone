import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOutworkDto } from './dto/outwork.dto';

@Injectable()
export class OutworkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, employmentId: string, data: CreateOutworkDto) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId, isActive: true },
    });
    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    // 이미 동일 날짜에 승인 또는 대기 중인 신청이 있는지 검증
    const existing = await this.prisma.outworkRequest.findFirst({
      where: {
        userId,
        companyId: employment.companyId,
        date: data.date,
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existing) {
      throw new BadRequestException('해당 날짜에 이미 대기 중이거나 승인된 외근/출장 신청이 존재합니다.');
    }

    const request = await this.prisma.outworkRequest.create({
      data: {
        userId,
        companyId: employment.companyId,
        date: data.date,
        type: data.type,
        reason: data.reason,
        status: 'pending',
      },
    });

    return { message: '외근/출장 신청이 완료되었습니다.', request };
  }

  async findAll(userId: string, employmentId: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id: employmentId, userId },
    });
    if (!employment) {
      throw new NotFoundException('유효하지 않은 근로계약입니다.');
    }

    const records = await this.prisma.outworkRequest.findMany({
      where: {
        userId,
        companyId: employment.companyId,
      },
      orderBy: { date: 'desc' },
    });

    return { records };
  }

  async remove(userId: string, id: string) {
    const request = await this.prisma.outworkRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('존재하지 않는 신청 내역입니다.');
    }

    if (request.userId !== userId) {
      throw new BadRequestException('본인의 신청 내역만 취소할 수 있습니다.');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('대기 상태인 신청만 취소할 수 있습니다.');
    }

    await this.prisma.outworkRequest.delete({
      where: { id },
    });

    return { message: '신청이 취소되었습니다.' };
  }

  async approve(id: string) {
    const request = await this.prisma.outworkRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('존재하지 않는 신청 내역입니다.');
    }

    const updated = await this.prisma.outworkRequest.update({
      where: { id },
      data: { status: 'approved' },
    });

    return { message: '승인 처리되었습니다.', request: updated };
  }

  async reject(id: string) {
    const request = await this.prisma.outworkRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('존재하지 않는 신청 내역입니다.');
    }

    const updated = await this.prisma.outworkRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });

    return { message: '반려 처리되었습니다.', request: updated };
  }
}
