import { Controller, Get, Param } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('api')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('app-config')
  async getAppConfig() {
    return this.systemService.getAppConfig();
  }

  @Get('legal/:type')
  async getLegalDocument(@Param('type') type: string) {
    return this.systemService.getLegalDocument(type);
  }
}
