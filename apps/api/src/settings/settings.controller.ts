import { Controller, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, UpdatePasswordDto } from './dto/settings.dto';

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Put('profile')
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    return this.settingsService.updateProfile(req.user.id, body);
  }

  @Put('password')
  async updatePassword(@Request() req: any, @Body() body: UpdatePasswordDto) {
    return this.settingsService.updatePassword(req.user.id, body);
  }

  @Post('withdraw')
  async withdraw(@Request() req: any) {
    return this.settingsService.withdraw(req.user.id);
  }

  @Post('employment/end')
  async endEmployment(@Request() req: any, @Body() body: { employmentId: string }) {
    return this.settingsService.endEmployment(req.user.id, body.employmentId);
  }
}
