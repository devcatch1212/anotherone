import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

/**
 * 연장근무 자동 퇴근 스케줄러
 *
 * 승인된 초과근무(OvertimeRequest.status = 'approved') 의 endTime에
 * 해당 사용자를 자동으로 퇴근 처리합니다.
 */
@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * 매 분마다 실행: 현재 시각(KST)과 endTime이 일치하는 approved 연장근무 기록 조회 후 자동 퇴근 처리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleOvertimeAutoCheckout() {
    try {
      const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const todayStr = `${nowKST.getUTCFullYear()}-${String(nowKST.getUTCMonth() + 1).padStart(2, '0')}-${String(nowKST.getUTCDate()).padStart(2, '0')}`;
      const currentHour = String(nowKST.getUTCHours()).padStart(2, '0');
      const currentMinute = String(nowKST.getUTCMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;

      // 오늘 날짜의 approved 연장근무 신청 중 endTime이 현재 시각과 일치하는 것을 조회
      const overtimeRequests = await this.prisma.overtimeRequest.findMany({
        where: {
          date: todayStr,
          endTime: currentTimeStr,
          status: 'approved',
        },
      });

      if (overtimeRequests.length === 0) return;

      this.logger.log(
        `[연장근무 자동퇴근] ${todayStr} ${currentTimeStr} 처리 대상: ${overtimeRequests.length}건`,
      );

      for (const req of overtimeRequests) {
        // 해당 사용자 + 회사 기준으로 오늘의 미퇴근 출근 기록 조회
        const record = await this.prisma.attendanceRecord.findFirst({
          where: {
            userId: req.userId,
            companyId: req.companyId,
            date: todayStr,
            checkIn: { not: null },
            checkOut: null,
          },
        });

        if (!record || !record.checkIn) {
          this.logger.warn(
            `[연장근무 자동퇴근] userId=${req.userId} 미퇴근 출근 기록 없음 - 스킵`,
          );
          continue;
        }

        // employment 정보 조회
        const employment = await this.prisma.employment.findFirst({
          where: {
            userId: req.userId,
            companyId: req.companyId,
            isActive: true,
          },
        });

        if (!employment) {
          this.logger.warn(
            `[연장근무 자동퇴근] userId=${req.userId} 활성 employment 없음 - 스킵`,
          );
          continue;
        }

        // 퇴근 시각: 연장근무 endTime 기준으로 오늘 날짜에 KST 시각 생성
        const [endH, endM] = req.endTime.split(':').map(Number);
        const checkOutTime = new Date(
          Date.UTC(
            nowKST.getUTCFullYear(),
            nowKST.getUTCMonth(),
            nowKST.getUTCDate(),
            endH - 9 < 0 ? endH - 9 + 24 : endH - 9, // KST → UTC 변환
            endM,
            0,
          ),
        );

        await this.attendanceService.processAutoCheckout(
          record,
          employment,
          checkOutTime,
          'overtime_auto_checkout',
        );

        this.logger.log(
          `[연장근무 자동퇴근] userId=${req.userId} companyId=${req.companyId} → ${req.endTime} 자동 퇴근 완료`,
        );
      }
    } catch (error) {
      this.logger.error('[연장근무 자동퇴근] 스케줄러 실행 중 오류 발생', error);
    }
  }
}
