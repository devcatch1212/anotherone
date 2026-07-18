// lib/core/services/notification_service.dart
// 로컬 알림 초기화 및 출퇴근 알림 예약/취소 서비스

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const int _checkInBaseId = 1000;
  static const int _checkOutBaseId = 2000;

  /// 앱 시작 시 1회 초기화 (main.dart에서 호출)
  /// - 타임존 초기화
  /// - 알림 채널 생성
  /// - Android 13+: 런타임 알림 권한 요청
  /// - iOS: DarwinInitializationSettings에서 권한 요청 자동 처리
  Future<void> init() async {
    try {
      tz.initializeTimeZones();
      tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');

      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _plugin.initialize(initSettings);

      const androidChannel = AndroidNotificationChannel(
        'attendance_alarm',
        '출퇴근 알림',
        description: '출근 및 퇴근 시간 전 알림',
        importance: Importance.high,
        playSound: true,
      );

      await _plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidChannel);

      if (Platform.isAndroid) {
        await _requestAndroidNotificationPermission();
      }
    } catch (e) {
      debugPrint('[NotificationService] 초기화 실패: $e');
    }
  }

  /// Android 알림 권한 요청
  Future<void> _requestAndroidNotificationPermission() async {
    try {
      final status = await Permission.notification.status;

      if (status.isGranted) return;

      if (status.isPermanentlyDenied) {
        debugPrint('[알림 권한] 영구 거부됨 - 설정에서 직접 허용 필요');
        return;
      }

      final result = await Permission.notification.request();
      debugPrint('[알림 권한] 요청 결과: $result');
    } catch (e) {
      debugPrint('[NotificationService] 권한 요청 오류: $e');
    }
  }

  /// 현재 알림 권한이 허용되어 있는지 확인
  Future<bool> isPermissionGranted() async {
    try {
      if (Platform.isIOS) {
        final iosImpl = _plugin.resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>();
        final granted = await iosImpl?.checkPermissions();
        return granted?.isEnabled ?? false;
      }
      return await Permission.notification.isGranted;
    } catch (e) {
      debugPrint('[NotificationService] 권한 확인 오류: $e');
      return false;
    }
  }

  /// 알림 권한 요청 (설정 화면에서 알림 토글 ON 시 호출)
  Future<bool> requestPermission() async {
    try {
      if (Platform.isIOS) {
        final iosImpl = _plugin.resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>();
        final granted = await iosImpl?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
        return granted ?? false;
      }

      final status = await Permission.notification.status;
      if (status.isGranted) return true;
      if (status.isPermanentlyDenied) {
        return false;
      }
      final result = await Permission.notification.request();
      return result.isGranted;
    } catch (e) {
      debugPrint('[NotificationService] 권한 팝업 요청 오류: $e');
      return false;
    }
  }

  /// 출근 알림 예약 (권한 없으면 스킵)
  Future<void> scheduleCheckInAlarm({
    required int id,
    required String companyName,
    required DateTime scheduledTime,
    required int minutesBefore,
  }) async {
    if (!await isPermissionGranted()) {
      debugPrint('[알림 권한] 권한 없음 - 출근 알림 예약 스킵');
      return;
    }

    final tzTime = tz.TZDateTime.from(scheduledTime, tz.local);

    await _plugin.zonedSchedule(
      _checkInBaseId + id,
      '⏰ 출근 시간이 다가옵니다',
      '$minutesBefore분 후 출근 시간입니다. [$companyName] 출근 체크를 진행해주세요.',
      tzTime,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'attendance_alarm',
          '출퇴근 알림',
          channelDescription: '출근 및 퇴근 시간 전 알림',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: null,
    );
  }

  /// 퇴근 알림 예약 (권한 없으면 스킵)
  Future<void> scheduleCheckOutAlarm({
    required int id,
    required String companyName,
    required DateTime scheduledTime,
    required int minutesBefore,
  }) async {
    if (!await isPermissionGranted()) {
      debugPrint('[알림 권한] 권한 없음 - 퇴근 알림 예약 스킵');
      return;
    }

    final tzTime = tz.TZDateTime.from(scheduledTime, tz.local);

    await _plugin.zonedSchedule(
      _checkOutBaseId + id,
      '⏰ 퇴근 시간이 다가옵니다',
      '$minutesBefore분 후 퇴근 시간입니다. [$companyName] 퇴근 체크를 진행해주세요.',
      tzTime,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'attendance_alarm',
          '출퇴근 알림',
          channelDescription: '출근 및 퇴근 시간 전 알림',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: null,
    );
  }

  /// 출근 알림 취소
  Future<void> cancelCheckInAlarm(int id) async {
    await _plugin.cancel(_checkInBaseId + id);
  }

  /// 퇴근 알림 취소
  Future<void> cancelCheckOutAlarm(int id) async {
    await _plugin.cancel(_checkOutBaseId + id);
  }

  /// 모든 출퇴근 알림 취소
  Future<void> cancelAllAlarms() async {
    await _plugin.cancelAll();
  }
}
