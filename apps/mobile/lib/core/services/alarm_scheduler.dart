// lib/core/services/alarm_scheduler.dart
// 모든 활성 근무지의 workStartTime / workEndTime 및 근무 요일(workDaysOfWeek) 기반으로
// 매주 반복(DateTimeComponents.dayOfWeekAndTime) 출퇴근 알림을 예약하는 스케줄러

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../shared/models/models.dart';
import '../providers/alarm_settings_provider.dart';
import 'notification_service.dart';

class AlarmScheduler {
  static final AlarmScheduler _instance = AlarmScheduler._internal();
  factory AlarmScheduler() => _instance;
  AlarmScheduler._internal();

  final _notificationService = NotificationService();

  /// 로그인 성공, 설정 변경, 또는 앱 시작 시 호출
  /// 모든 활성 근무지에 대해 근무 요일별 출퇴근 알림을 매주 반복(dayOfWeekAndTime)으로 예약합니다.
  Future<void> reschedule({
    required List<Employment> employments,
    required AlarmSettings settings,
  }) async {
    // 기존 예약된 모든 알림 취소 후 재예약
    await _notificationService.cancelAllAlarms();

    // 활성 근무지만 필터링
    final activeEmployments = employments.where((e) => e.isActive).toList();

    for (var i = 0; i < activeEmployments.length; i++) {
      final emp = activeEmployments[i];
      
      // 근무 요일 목록 확인 (0:월 ~ 6:일)
      List<int> targetDays = [];
      if (emp.workDaysOfWeek != null && emp.workDaysOfWeek!.isNotEmpty) {
        targetDays = List.from(emp.workDaysOfWeek!);
      } else {
        // 근무 요일 설정이 없을 경우 주 근무일수(weeklyWorkDays)만큼 기본 요일(월부터 순차) 배정
        final count = emp.weeklyWorkDays.clamp(1, 7);
        targetDays = List.generate(count, (idx) => idx);
      }

      // ── 출근 알림 (근무 요일별 매주 반복) ──────────────────────────
      if (settings.checkInEnabled && emp.workStartTime != null) {
        for (final day in targetDays) {
          final alarmTime = _buildNextAlarmTimeForDay(
            day,
            emp.workStartTime!,
            settings.minutesBefore,
          );
          if (alarmTime != null) {
            // 알림 ID: 근무지 인덱스 * 10 + 요일 (0~6)
            final alarmId = i * 10 + day;
            await _notificationService.scheduleCheckInAlarm(
              id: alarmId,
              companyName: emp.company.name,
              scheduledTime: alarmTime,
              minutesBefore: settings.minutesBefore,
              matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
            );
          }
        }
      }

      // ── 퇴근 알림 (근무 요일별 매주 반복) ──────────────────────────
      if (settings.checkOutEnabled && emp.workEndTime != null) {
        for (final day in targetDays) {
          final alarmTime = _buildNextAlarmTimeForDay(
            day,
            emp.workEndTime!,
            settings.minutesBefore,
          );
          if (alarmTime != null) {
            // 알림 ID: 근무지 인덱스 * 10 + 요일 (0~6)
            final alarmId = i * 10 + day;
            await _notificationService.scheduleCheckOutAlarm(
              id: alarmId,
              companyName: emp.company.name,
              scheduledTime: alarmTime,
              minutesBefore: settings.minutesBefore,
              matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
            );
          }
        }
      }
    }
  }

  /// 모든 알림 취소 (로그아웃 시 호출)
  Future<void> cancelAll() async {
    await _notificationService.cancelAllAlarms();
  }

  /// 특정 요일(0:월 ~ 6:일) 및 "HH:mm" 시간 기준 다음 도래하는 알림 시각(N분 전) 계산
  /// 오늘 이미 지난 시각이면 다음 주 동일 요일의 시각을 계산하여 반환
  DateTime? _buildNextAlarmTimeForDay(int dayOfWeek, String timeStr, int minutesBefore) {
    try {
      final parts = timeStr.split(':');
      if (parts.length < 2) return null;
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);

      final now = DateTime.now();
      // dayOfWeek: 0(월) ~ 6(일) -> DateTime.weekday: 1(월) ~ 7(일)
      final targetWeekday = dayOfWeek + 1;

      // 이번 주의 해당 요일 날짜 찾기
      var scheduledDate = DateTime(now.year, now.month, now.day);
      while (scheduledDate.weekday != targetWeekday) {
        scheduledDate = scheduledDate.add(const Duration(days: 1));
      }

      // 목표 시간에서 minutesBefore 분 차감한 실제 알림 시각
      final targetDateTime = DateTime(
        scheduledDate.year,
        scheduledDate.month,
        scheduledDate.day,
        hour,
        minute,
      );
      var alarmTime = targetDateTime.subtract(Duration(minutes: minutesBefore));

      // 만약 오늘이고 이미 알림 시간이 지났다면, 7일 뒤(다음 주 동일 요일)로 설정
      if (alarmTime.isBefore(now)) {
        alarmTime = alarmTime.add(const Duration(days: 7));
      }

      return alarmTime;
    } catch (_) {
      return null;
    }
  }
}
