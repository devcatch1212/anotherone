import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyOnboardingDto } from './dto/onboarding.dto';

@Controller('api/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('company')
  async createCompanyAndEmployment(@Request() req: any, @Body() body: CompanyOnboardingDto) {
    return this.onboardingService.createCompanyAndEmployment(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('skip')
  async skipOnboarding(@Request() req: any) {
    return this.onboardingService.skipOnboarding(req.user.id);
  }
}
