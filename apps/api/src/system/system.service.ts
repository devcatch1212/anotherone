import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // DB 초기 데이터 (Mock Seed)
    const existingConfig = await this.prisma.appConfig.findFirst();
    if (!existingConfig) {
      await this.prisma.appConfig.create({
        data: {
          latestVersion: '1.0.0',
          minVersion: '1.0.0',
          forceUpdate: false,
          maintenanceMode: false,
        },
      });
    }

    const existingTerms = await this.prisma.legalDocument.findFirst({ where: { type: 'terms' } });
    if (!existingTerms) {
      await this.prisma.legalDocument.create({
        data: {
          type: 'terms',
          version: 'v1.0',
          content: '제1조(목적)\\n본 약관은 회사(이하 "회사"라 함)가 제공하는 서비스 이용에 관한 사항을 규정합니다.',
        },
      });
    }

    const existingPrivacy = await this.prisma.legalDocument.findFirst({ where: { type: 'privacy' } });
    if (!existingPrivacy) {
      await this.prisma.legalDocument.create({
        data: {
          type: 'privacy',
          version: 'v1.0',
          content: '1. 개인정보의 수집 및 이용 목적\\n회사는 다음의 목적을 위해 개인정보를 처리합니다.',
        },
      });
    }
  }

  async getAppConfig() {
    let config = await this.prisma.appConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) {
      config = {
        id: 'mock',
        latestVersion: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
        maintenanceMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return config;
  }

  async getLegalDocument(type: string) {
    let doc = await this.prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) {
      doc = {
        id: 'mock',
        type,
        version: 'v1.0',
        content: `${type === 'terms' ? '이용약관' : '개인정보처리방침'} 준비중입니다.`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return doc;
  }
}
