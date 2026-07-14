import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApplyLeaveDto, GetLeaveDto } from './dto/leave.dto';

@Controller('api/leave')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  async applyLeave(@Request() req: any, @Body() body: ApplyLeaveDto) {
    return this.leaveService.applyLeave(req.user.id, body);
  }

  @Get()
  async getLeaves(@Request() req: any, @Query() query: GetLeaveDto) {
    return this.leaveService.getLeaves(req.user.id, query.employmentId);
  }

  @Delete(':id')
  async cancelLeave(@Request() req: any, @Param('id') id: string) {
    return this.leaveService.cancelLeave(req.user.id, id);
  }
}
