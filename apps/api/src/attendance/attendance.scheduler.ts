import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

/**
 * 근태 자동 처리 스케줄러
 *
 * 1) 매 분마다: 승인된 초과근무(OvertimeRequest.status = 'approved') 의 endTime에
 *    해당 사용자를 자동으로 퇴근 처리.
 * 2) 매 시간마다: 퇴근 시간이 지났는데 미퇴근 상태이고, 승인된 연장근무 신청이
 *    없는 사용자를 workEndTime 기준으로 자동 퇴근 처리.
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

  /**
   * 매 시간(정시)마다 실행: 퇴근 시간이 지났는데 미퇴근 상태인 사용자 자동 퇴근 처리
   *
   * 처리 조건:
   *  - 오늘 출근 기록이 있고 퇴근 기록이 없음
   *  - employment.workEndTime(KST)이 설정되어 있고, 현재 KST 시각보다 이전
   *  - 오늘 날짜에 approved 상태의 연장근무(OvertimeRequest) 신청이 없음
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleMissedCheckout() {
    try {
      const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const todayStr = `${nowKST.getUTCFullYear()}-${String(nowKST.getUTCMonth() + 1).padStart(2, '0')}-${String(nowKST.getUTCDate()).padStart(2, '0')}`;

      // 현재 KST 시각을 "HH:mm" 문자열로 변환
      const nowHHmm = `${String(nowKST.getUTCHours()).padStart(2, '0')}:${String(nowKST.getUTCMinutes()).padStart(2, '0')}`;

      // 오늘 출근했지만 퇴근 미처리인 모든 기록 조회
      const unfinishedRecords = await this.prisma.attendanceRecord.findMany({
        where: {
          date: todayStr,
          checkIn: { not: null },
          checkOut: null,
        },
      });

      if (unfinishedRecords.length === 0) return;

      this.logger.log(
        `[미퇴근 자동처리] ${todayStr} ${nowHHmm} 검사 대상: ${unfinishedRecords.length}건`,
      );

      for (const record of unfinishedRecords) {
        // 활성 employment 조회
        const employment = await this.prisma.employment.findFirst({
          where: {
            userId: record.userId,
            companyId: record.companyId,
            isActive: true,
          },
        });

        if (!employment) {
          this.logger.warn(
            `[미퇴근 자동처리] userId=${record.userId} 활성 employment 없음 - 스킵`,
          );
          continue;
        }

        // workEndTime이 없으면 자동 처리 불가 → 스킵
        if (!employment.workEndTime) {
          this.logger.warn(
            `[미퇴근 자동처리] userId=${record.userId} workEndTime 미설정 - 스킵`,
          );
          continue;
        }

        // 퇴근 시각(KST HH:mm)이 현재 KST 시각보다 이전인지 확인
        // 자정 넘김 대응: workEndTime < workStartTime인 경우(야간근무) 는 다음날 처리
        if (employment.workEndTime >= nowHHmm) {
          // 아직 퇴근 시각이 지나지 않음 → 스킵
          continue;
        }

        // 오늘 날짜에 approved 연장근무 신청이 있으면 스킵
        const approvedOvertime = await this.prisma.overtimeRequest.findFirst({
          where: {
            userId: record.userId,
            companyId: record.companyId,
            date: todayStr,
            status: 'approved',
          },
        });

        if (approvedOvertime) {
          this.logger.log(
            `[미퇴근 자동처리] userId=${record.userId} 승인된 연장근무 신청 있음 - 스킵`,
          );
          continue;
        }

        // 퇴근 시각: workEndTime 기준으로 오늘 날짜 UTC 변환
        const [endH, endM] = employment.workEndTime.split(':').map(Number);
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

        // endH < 9 이면 UTC 날짜가 하루 밀렸으므로 보정
        // (예: 02:00 KST = 전날 17:00 UTC → Date.UTC 계산 시 하루 더해야 함)
        if (endH < 9) {
          checkOutTime.setUTCDate(checkOutTime.getUTCDate() + 1);
        }

        await this.attendanceService.processAutoCheckout(
          record,
          employment,
          checkOutTime,
          'auto_checkout',
        );

        this.logger.log(
          `[미퇴근 자동처리] userId=${record.userId} companyId=${record.companyId} → ${employment.workEndTime} 기준 자동 퇴근 완료`,
        );
      }
    } catch (error) {
      this.logger.error('[미퇴근 자동처리] 스케줄러 실행 중 오류 발생', error);
    }
  }
}
