import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiryService {
  constructor(private readonly prisma: PrismaService) {}

  async createInquiry(userId: string, dto: CreateInquiryDto) {
    return this.prisma.inquiry.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId,
        companyId: dto.companyId ?? null,
      },
    });
  }

  async getMyInquiries(userId: string) {
    const inquiries = await this.prisma.inquiry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
      },
    });
    return { inquiries };
  }
}
