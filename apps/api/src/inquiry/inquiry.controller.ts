import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Controller('api/inquiries')
@UseGuards(JwtAuthGuard)
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  // 문의 등록
  @Post()
  async createInquiry(@Request() req: any, @Body() dto: CreateInquiryDto) {
    return this.inquiryService.createInquiry(req.user.id, dto);
  }

  // 내 문의 내역 목록 조회
  @Get()
  async getMyInquiries(@Request() req: any) {
    return this.inquiryService.getMyInquiries(req.user.id);
  }
}
