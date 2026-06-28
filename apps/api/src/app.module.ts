import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { LeaveModule } from './leave/leave.module';
import { SettingsModule } from './settings/settings.module';
import { SystemModule } from './system/system.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, AuthModule, OnboardingModule, AttendanceModule, PayrollModule, LeaveModule, SettingsModule, SystemModule, NotificationsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
