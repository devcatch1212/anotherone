import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 관리자 로그인 (인증 불필요)
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body.email, body.password);
  }

  // 전체 근무지 목록
  @UseGuards(AdminAuthGuard)
  @Get('companies')
  getCompanies() {
    return this.adminService.getCompanies();
  }

  // 근무지별 근로자 목록
  @UseGuards(AdminAuthGuard)
  @Get('companies/:id/employees')
  getEmployeesByCompany(@Param('id') id: string) {
    return this.adminService.getEmployeesByCompany(id);
  }

  // 근로자 고용 상세
  @UseGuards(AdminAuthGuard)
  @Get('employees/:employmentId')
  getEmployeeDetail(@Param('employmentId') employmentId: string) {
    return this.adminService.getEmployeeDetail(employmentId);
  }

  // 근로자 출퇴근 기록 (월별)
  @UseGuards(AdminAuthGuard)
  @Get('employees/:employmentId/attendance')
  getAttendance(
    @Param('employmentId') employmentId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.adminService.getAttendanceByEmployment(
      employmentId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  // 연차 신청 목록
  @UseGuards(AdminAuthGuard)
  @Get('leaves')
  getLeaves() {
    return this.adminService.getLeaves();
  }

  // 연차 승인
  @UseGuards(AdminAuthGuard)
  @Post('leaves/:id/approve')
  approveLeave(@Param('id') id: string) {
    return this.adminService.approveLeave(id);
  }

  // 연차 반려
  @UseGuards(AdminAuthGuard)
  @Post('leaves/:id/reject')
  rejectLeave(@Param('id') id: string) {
    return this.adminService.rejectLeave(id);
  }

  // 출퇴근 수정 요청 목록
  @UseGuards(AdminAuthGuard)
  @Get('attendance-corrections')
  getAttendanceCorrections() {
    return this.adminService.getAttendanceCorrections();
  }

  // 출퇴근 수정 요청 승인
  @UseGuards(AdminAuthGuard)
  @Post('attendance-corrections/:id/approve')
  approveAttendanceCorrection(@Param('id') id: string) {
    return this.adminService.approveAttendanceCorrection(id);
  }

  // 출퇴근 수정 요청 반려
  @UseGuards(AdminAuthGuard)
  @Post('attendance-corrections/:id/reject')
  rejectAttendanceCorrection(@Param('id') id: string) {
    return this.adminService.rejectAttendanceCorrection(id);
  }
}
