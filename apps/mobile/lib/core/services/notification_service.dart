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
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS: 초기화 시 권한 팝업 자동 표시
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

    // 안드로이드 알림 채널 생성
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

    // Android 13+ (API 33+): 런타임 알림 권한 요청
    // iOS는 DarwinInitializationSettings에서 자동 처리되므로 Android만 해당
    if (Platform.isAndroid) {
      await _requestAndroidNotificationPermission();
    }
  }

  /// Android 알림 권한 요청
  /// - 이미 허용된 경우: 아무 것도 하지 않음
  /// - 거부된 경우: 시스템 권한 팝업 표시
  /// - 영구 거부(permanentlyDenied): 설정 앱으로 안내
  Future<void> _requestAndroidNotificationPermission() async {
    final status = await Permission.notification.status;

    if (status.isGranted) return; // 이미 허용됨

    if (status.isPermanentlyDenied) {
      // 사용자가 "다시 묻지 않음"을 선택한 경우 → 설정에서 직접 허용
      debugPrint('[알림 권한] 영구 거부됨 - 설정에서 직접 허용 필요');
      return;
    }

    // 권한 요청 팝업 표시
    final result = await Permission.notification.request();
    debugPrint('[알림 권한] 요청 결과: $result');
  }

  /// 현재 알림 권한이 허용되어 있는지 확인
  Future<bool> isPermissionGranted() async {
    if (Platform.isIOS) {
      final iosImpl = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await iosImpl?.checkPermissions();
      return granted?.isEnabled ?? false;
    }
    // Android
    return await Permission.notification.isGranted;
  }

  /// 알림 권한 요청 (설정 화면에서 알림 토글 ON 시 호출)
  /// 반환값: 권한 허용 여부 (true = 허용, false = 거부 또는 영구 거부)
  Future<bool> requestPermission() async {
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

    // Android 13+
    final status = await Permission.notification.status;
    if (status.isGranted) return true;
    if (status.isPermanentlyDenied) {
      // 영구 거부 시 false 반환 → 호출부에서 설정 앱 안내 UI 처리
      return false;
    }
    final result = await Permission.notification.request();
    return result.isGranted;
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
