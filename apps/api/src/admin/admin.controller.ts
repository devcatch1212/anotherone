import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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

  // 오늘의 전체 직원 근태 현황 집계
  @UseGuards(AdminAuthGuard)
  @Get('attendance/today')
  getTodayAttendance(@Query('companyId') companyId?: string) {
    return this.adminService.getTodayAttendance(companyId);
  }

  // 월별 전체 직원 그리드 데이터
  @UseGuards(AdminAuthGuard)
  @Get('attendance/grid')
  getMonthlyAttendanceGrid(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('companyId') companyId?: string,
  ) {
    const now = new Date();
    return this.adminService.getMonthlyAttendanceGrid(
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
      companyId,
    );
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

  // ─── 전자계약 관리 API ──────────────────────────────────────────────────────
  // 전자계약 목록 조회
  @UseGuards(AdminAuthGuard)
  @Get('contracts')
  getContracts(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getContracts(companyId, status, type);
  }

  // 전자계약서 작성 및 발송
  @UseGuards(AdminAuthGuard)
  @Post('contracts')
  createContract(@Body() body: {
    userId: string;
    companyId: string;
    type: 'labor' | 'salary' | 'nda' | 'privacy';
    title: string;
    content: string;
    employmentId?: string;
  }) {
    return this.adminService.createContract(body);
  }

  // 특정 전자계약서 상세
  @UseGuards(AdminAuthGuard)
  @Get('contracts/:id')
  getContractDetail(@Param('id') id: string) {
    return this.adminService.getContractDetail(id);
  }

  // 서명 요청 알림 재발송
  @UseGuards(AdminAuthGuard)
  @Post('contracts/:id/remind')
  sendContractRemind(@Param('id') id: string) {
    return this.adminService.sendContractRemind(id);
  }

  // 전자계약서 삭제
  @UseGuards(AdminAuthGuard)
  @Delete('contracts/:id')
  deleteContract(@Param('id') id: string) {
    return this.adminService.deleteContract(id);
  }

  // 앱 설정 조회
  @UseGuards(AdminAuthGuard)
  @Get('app-config')
  getAppConfig() {
    return this.adminService.getAppConfig();
  }

  // 앱 설정 수정
  @UseGuards(AdminAuthGuard)
  @Patch('app-config')
  updateAppConfig(@Body() body: {
    latestVersionAndroid?: string;
    minVersionAndroid?: string;
    latestVersionIos?: string;
    minVersionIos?: string;
    forceUpdate?: boolean;
    maintenanceMode?: boolean;
  }) {
    return this.adminService.updateAppConfig(body);
  }

  // ─── ① 근무지 등록 ────────────────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Post('companies')
  createCompany(@Body() body: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }) {
    return this.adminService.createCompany(body);
  }

  // ─── ① 근무지 정보 수정 ───────────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Patch('companies/:id')
  updateCompany(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
    },
  ) {
    return this.adminService.updateCompany(id, body);
  }

  // ─── ② 근로자 계약 정보 직접 수정 ────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Patch('employments/:id')
  updateEmployment(
    @Param('id') id: string,
    @Body() body: {
      position?: string;
      department?: string;
      wageType?: string;
      hourlyWage?: number | null;
      dailyWage?: number | null;
      weeklyWage?: number | null;
      monthlyWage?: number | null;
      dailyWorkHours?: number;
      weeklyWorkDays?: number;
      workStartTime?: string | null;
      workEndTime?: string | null;
      workDaysOfWeek?: number[];
      breakMinutes?: number | null;
      hireDate?: string | null;
      memo?: string | null;
      employeeCount?: string;
    },
  ) {
    return this.adminService.updateEmployment(id, body);
  }

  // ─── ③ 출퇴근 기록 직접 생성 ─────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Post('attendance')
  createAttendanceRecord(@Body() body: {
    employmentId: string;
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status: string;
  }) {
    return this.adminService.createAttendanceRecord(body);
  }

  // ─── ③ 출퇴근 기록 직접 수정 ─────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Patch('attendance/:recordId')
  updateAttendanceRecord(
    @Param('recordId') recordId: string,
    @Body() body: { checkIn?: string | null; checkOut?: string | null; status?: string },
  ) {
    return this.adminService.updateAttendanceRecord(recordId, body);
  }

  // ─── ③ 출퇴근 기록 삭제 ──────────────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Delete('attendance/:recordId')
  deleteAttendanceRecord(@Param('recordId') recordId: string) {
    return this.adminService.deleteAttendanceRecord(recordId);
  }

  // ─── ④ 연차 잔여일수 수동 조정 ───────────────────────────────────────────
  @UseGuards(AdminAuthGuard)
  @Patch('employments/:id/leave-balance')
  updateLeaveBalance(
    @Param('id') id: string,
    @Body() body: { balance: number },
  ) {
    return this.adminService.updateLeaveBalance(id, body.balance);
  }
}
