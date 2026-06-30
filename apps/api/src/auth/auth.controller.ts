import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('logout')
  async logout() {
    return this.authService.logout();
  }

  @Post('anonymous')
  async registerAnonymous() {
    return this.authService.anonymousRegister();
  }

  @UseGuards(JwtAuthGuard)
  @Post('convert')
  async convertAnonymous(@Request() req: any, @Body() body: RegisterDto) {
    return this.authService.convertAnonymous(req.user.id, body);
  }

  @Post('device')
  async deviceLogin(@Body() body: { deviceId: string }) {
    return this.authService.deviceLogin(body.deviceId);
  }
}
