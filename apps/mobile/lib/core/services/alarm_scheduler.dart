// lib/core/services/alarm_scheduler.dart
// 모든 활성 근무지의 workStartTime / workEndTime 기반으로 오늘의 알림을 예약하는 스케줄러

import '../../shared/models/models.dart';
import '../providers/alarm_settings_provider.dart';
import 'notification_service.dart';

class AlarmScheduler {
  static final AlarmScheduler _instance = AlarmScheduler._internal();
  factory AlarmScheduler() => _instance;
  AlarmScheduler._internal();

  final _notificationService = NotificationService();

  /// 로그인 성공 또는 앱 재시작 시 호출
  /// 모든 활성 근무지에 대해 오늘의 출퇴근 알림을 재예약합니다.
  Future<void> reschedule({
    required List<Employment> employments,
    required AlarmSettings settings,
  }) async {
    // 기존 예약된 모든 알림 취소 후 재예약
    await _notificationService.cancelAllAlarms();

    final now = DateTime.now();

    // 활성 근무지만 필터링
    final activeEmployments = employments.where((e) => e.isActive).toList();

    for (var i = 0; i < activeEmployments.length; i++) {
      final emp = activeEmployments[i];
      // 알림 ID 충돌 방지: 인덱스를 ID로 사용 (최대 1000개 근무지까지 안전)
      final alarmIndex = i;

      // ── 출근 알림 ─────────────────────────────────────────────
      if (settings.checkInEnabled && emp.workStartTime != null) {
        final checkInAlarmTime = _buildAlarmTime(
          emp.workStartTime!,
          settings.minutesBefore,
        );
        // 아직 지나지 않은 시각이어야 예약
        if (checkInAlarmTime != null && checkInAlarmTime.isAfter(now)) {
          await _notificationService.scheduleCheckInAlarm(
            id: alarmIndex,
            companyName: emp.company.name,
            scheduledTime: checkInAlarmTime,
            minutesBefore: settings.minutesBefore,
          );
        }
      }

      // ── 퇴근 알림 ─────────────────────────────────────────────
      if (settings.checkOutEnabled && emp.workEndTime != null) {
        final checkOutAlarmTime = _buildAlarmTime(
          emp.workEndTime!,
          settings.minutesBefore,
        );
        if (checkOutAlarmTime != null && checkOutAlarmTime.isAfter(now)) {
          await _notificationService.scheduleCheckOutAlarm(
            id: alarmIndex,
            companyName: emp.company.name,
            scheduledTime: checkOutAlarmTime,
            minutesBefore: settings.minutesBefore,
          );
        }
      }
    }
  }

  /// 모든 알림 취소 (로그아웃 시 호출)
  Future<void> cancelAll() async {
    await _notificationService.cancelAllAlarms();
  }

  /// "HH:mm" 형식의 시간 문자열 → 오늘 날짜 기준 알림 시각(N분 전) 계산
  /// 자정 넘어가는 야간 근무(예: workEndTime=02:00)도 처리
  DateTime? _buildAlarmTime(String timeStr, int minutesBefore) {
    try {
      final parts = timeStr.split(':');
      if (parts.length < 2) return null;
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);

      final now = DateTime.now();
      var base = DateTime(now.year, now.month, now.day, hour, minute);

      // 오늘 이미 지났으면 null 반환 (오늘 스케줄링 필요 없음)
      final alarmTime = base.subtract(Duration(minutes: minutesBefore));
      return alarmTime;
    } catch (_) {
      return null;
    }
  }
}
