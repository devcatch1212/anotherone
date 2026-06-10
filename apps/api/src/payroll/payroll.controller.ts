import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetPayrollDto, ConfirmPayrollDto } from './dto/payroll.dto';

@Controller('api/payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  async getPayrolls(@Request() req: any, @Query() query: GetPayrollDto) {
    return this.payrollService.getPayrolls(req.user.id, query.employmentId);
  }

  @Get(':id')
  async getPayrollById(@Request() req: any, @Param('id') id: string) {
    return this.payrollService.getPayrollById(req.user.id, id);
  }

  @Post(':id/confirm')
  async confirmPayroll(@Request() req: any, @Param('id') id: string) {
    return this.payrollService.confirmPayroll(req.user.id, id);
  }
}
