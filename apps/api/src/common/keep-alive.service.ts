import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);

  onModuleInit() {
    // production 환경에서만 keep-alive 활성화
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Keep-alive disabled (non-production)');
      return;
    }

    // 14분(840,000ms)마다 자신의 health endpoint를 호출하여 Render Free 플랜 슬립 방지
    const interval = 14 * 60 * 1000;
    const url =
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${process.env.PORT || 3001}`;

    setInterval(async () => {
      try {
        const res = await fetch(`${url}/api/health`);
        this.logger.log(`Keep-alive ping: ${res.status}`);
      } catch (e: any) {
        this.logger.warn(`Keep-alive ping failed: ${e.message}`);
      }
    }, interval);

    this.logger.log(
      `Keep-alive started (interval: ${interval / 1000}s, url: ${url})`,
    );
  }
}
