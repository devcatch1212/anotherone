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
          latestVersionAndroid: '1.0.0',
          minVersionAndroid: '1.0.0',
          latestVersionIos: '1.0.0',
          minVersionIos: '1.0.0',
          forceUpdate: false,
          maintenanceMode: false,
        },
      });
    }

    const existingTerms = await this.prisma.legalDocument.findFirst({ where: { type: 'terms' } });
    const longTerms = `제1조 (목적)
본 약관은 "anotherone"(이하 "서비스")을 제공하는 회사와 이를 이용하는 회원의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "회원"이란 서비스에 접속하여 본 약관에 따라 동의하고 서비스를 이용하는 고객을 말합니다.
2. "출퇴근 기록"이란 회원이 서비스를 통해 기록한 출근 및 퇴근 시각, 근무 시간 등의 데이터를 의미합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공시함으로써 효력이 발생합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.

제4조 (서비스의 제공 및 변경)
1. 서비스는 회원에게 출퇴근 기록 관리, 연차 관리, 급여 자동 계산 등의 기능을 제공합니다.
2. 서비스의 기술적 사양 변경 등의 경우에는 제공할 서비스의 내용을 변경할 수 있습니다.`;

    if (!existingTerms) {
      await this.prisma.legalDocument.create({
        data: {
          type: 'terms',
          version: 'v1.0',
          content: longTerms,
        },
      });
    } else if (existingTerms.content.length < 100) {
      await this.prisma.legalDocument.update({
        where: { id: existingTerms.id },
        data: { content: longTerms },
      });
    }

    const existingPrivacy = await this.prisma.legalDocument.findFirst({ where: { type: 'privacy' } });
    const longPrivacy = `1. 개인정보의 수집 및 이용 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 관련 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
- 회원 가입 및 관리: 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리 등
- 서비스 제공 및 관리: 출퇴근 기록 관리, 근로계약 설정 정보 관리, 연차 현황 및 급여 계산 데이터 제공 등

2. 수집하는 개인정보 항목
회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.
- 필수 항목: 이메일 주소, 비밀번호, 이름, 근로계약 정보 (시급/일급 설정값, 소정 근로시간, 근무요일)
- 선택 항목 (GPS 기반 출퇴근 인증 사용 시): 실시간 위치 정보 (위도, 경도)

3. 개인정보의 보유 및 파기
회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 회원 탈퇴 시 기존 출퇴근 이력 데이터 및 급여 계산 정보는 소프트 딜리트 처리 후 이력 보존을 위해 별도 보관될 수 있습니다.`;

    if (!existingPrivacy) {
      await this.prisma.legalDocument.create({
        data: {
          type: 'privacy',
          version: 'v1.0',
          content: longPrivacy,
        },
      });
    } else if (existingPrivacy.content.length < 100) {
      await this.prisma.legalDocument.update({
        where: { id: existingPrivacy.id },
        data: { content: longPrivacy },
      });
    }
  }

  async getAppConfig() {
    const config = await this.prisma.appConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) {
      return {
        android: {
          latestVersion: '1.0.0',
          minVersion: '1.0.0',
        },
        ios: {
          latestVersion: '1.0.0',
          minVersion: '1.0.0',
        },
        forceUpdate: false,
        maintenanceMode: false,
      };
    }
    return {
      android: {
        latestVersion: config.latestVersionAndroid,
        minVersion: config.minVersionAndroid,
      },
      ios: {
        latestVersion: config.latestVersionIos,
        minVersion: config.minVersionIos,
      },
      forceUpdate: config.forceUpdate,
      maintenanceMode: config.maintenanceMode,
    };
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
