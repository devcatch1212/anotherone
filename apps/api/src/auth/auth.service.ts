import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const { email, password, name } = data;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('이미 존재하는 이메일입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: false, employments: [] },
    };
  }

  async login(data: any) {
    const { email, password } = data;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (user.status === 'withdrawn') {
      throw new UnauthorizedException('탈퇴한 계정입니다.');
    }

    const payload = { sub: user.id, email: user.email };

    // login 응답에 employments/onboardingCompleted 포함 → setAuth가 currentEmploymentId를 정확히 설정할 수 있도록
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { employments: { include: { company: true } } },
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: fullUser!.id,
        name: fullUser!.name,
        email: fullUser!.email,
        onboardingCompleted: fullUser!.onboardingCompleted,
        status: fullUser!.status,
        employments: fullUser!.employments,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employments: {
          include: { company: true },
        },
      },
    });
    if (!user || user.status === 'withdrawn') {
      throw new UnauthorizedException('유저를 찾을 수 없거나 탈퇴한 계정입니다.');
    }
    const { password, ...result } = user;
    return result;
  }

  async logout() {
    return { success: true, message: '로그아웃되었습니다.' };
  }
}
