import {
  Controller,
  Post,
  Get,
  Patch,
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
  rejectLeave(@Param('id') id: string, @Body() body: { rejectReason?: string }) {
    return this.adminService.rejectLeave(id, body.rejectReason);
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
  rejectAttendanceCorrection(@Param('id') id: string, @Body() body: { rejectReason?: string }) {
    return this.adminService.rejectAttendanceCorrection(id, body.rejectReason);
  }

  // 설정 화면 통합 데이터 조회
  @UseGuards(AdminAuthGuard)
  @Get('settings-data')
  getSettingsData() {
    return this.adminService.getSettingsData();
  }

  // 근무지 활성/비활성 업데이트
  @UseGuards(AdminAuthGuard)
  @Patch('companies/:id/status')
  updateCompanyStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.updateCompanyStatus(id, body.isActive);
  }

  // 근로자 계약 활성/비활성(퇴사) 업데이트
  @UseGuards(AdminAuthGuard)
  @Patch('employments/:id/status')
  updateEmploymentStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.updateEmploymentStatus(id, body.isActive);
  }

  // 연장 근무 신청 목록
  @UseGuards(AdminAuthGuard)
  @Get('overtimes')
  getOvertimes() {
    return this.adminService.getOvertimes();
  }

  // 연장 근무 승인
  @UseGuards(AdminAuthGuard)
  @Post('overtimes/:id/approve')
  approveOvertime(@Param('id') id: string) {
    return this.adminService.approveOvertime(id);
  }

  // 연장 근무 반려
  @UseGuards(AdminAuthGuard)
  @Post('overtimes/:id/reject')
  rejectOvertime(@Param('id') id: string, @Body() body: { rejectReason?: string }) {
    return this.adminService.rejectOvertime(id, body.rejectReason);
  }

  // 월별 급여 정산 대장 조회
  @UseGuards(AdminAuthGuard)
  @Get('payrolls')
  getPayrolls(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('companyId') companyId?: string,
  ) {
    const now = new Date();
    return this.adminService.getPayrolls(
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
      companyId,
    );
  }

  // 급여 명세서 일괄 발행
  @UseGuards(AdminAuthGuard)
  @Post('payrolls/issue')
  issuePayrolls(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('companyId') companyId: string | undefined,
    @Body() body: { items: any[] },
  ) {
    const now = new Date();
    return this.adminService.issuePayrolls(
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
      companyId,
      body.items,
    );
  }

  // 외근/출장 신청 목록 조회
  @UseGuards(AdminAuthGuard)
  @Get('outworks')
  getOutworks() {
    return this.adminService.getOutworks();
  }

  // 외근/출장 승인
  @UseGuards(AdminAuthGuard)
  @Post('outworks/:id/approve')
  approveOutwork(@Param('id') id: string) {
    return this.adminService.approveOutwork(id);
  }

  // 외근/출장 반려
  @UseGuards(AdminAuthGuard)
  @Post('outworks/:id/reject')
  rejectOutwork(@Param('id') id: string) {
    return this.adminService.rejectOutwork(id);
  }
}
