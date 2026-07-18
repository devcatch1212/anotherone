import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceScheduler } from './attendance.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AttendanceService, AttendanceScheduler],
  controllers: [AttendanceController],
})
export class AttendanceModule {}

