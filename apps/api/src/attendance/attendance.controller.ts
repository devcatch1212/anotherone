import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckInDto, CheckOutDto, GetAttendanceDto } from './dto/attendance.dto';

@Controller('api/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  async checkIn(@Request() req: any, @Body() body: CheckInDto) {
    return this.attendanceService.checkIn(req.user.id, body);
  }

  @Post('check-out')
  async checkOut(@Request() req: any, @Body() body: CheckOutDto) {
    return this.attendanceService.checkOut(req.user.id, body);
  }

  @Get()
  async getMonthlyAttendance(@Request() req: any, @Query() query: GetAttendanceDto) {
    return this.attendanceService.getMonthlyAttendance(
      req.user.id,
      query.employmentId,
      Number(query.year),
      Number(query.month)
    );
  }
}
