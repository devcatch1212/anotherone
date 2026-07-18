// lib/core/services/notification_service.dart
// 로컬 알림 초기화 및 출퇴근 알림 예약/취소 서비스

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const int _checkInBaseId = 1000; // 출근 알림 ID 베이스
  static const int _checkOutBaseId = 2000; // 퇴근 알림 ID 베이스

  /// 앱 시작 시 1회 초기화 (main.dart에서 호출)
  Future<void> init() async {
    // 타임존 데이터 초기화
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    // 안드로이드 채널 설정
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS 설정 (권한 요청 포함)
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
      'attendance_alarm',         // 채널 ID
      '출퇴근 알림',               // 채널 이름
      description: '출근 및 퇴근 시간 전 알림',
      importance: Importance.high,
      playSound: true,
    );

    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // iOS 알림 권한 요청
    await _plugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  /// 출근 알림 예약
  /// [id] 알림 고유 ID (근무지별로 다르게 설정)
  /// [companyName] 회사 이름
  /// [scheduledTime] 알림을 보낼 시각 (KST)
  Future<void> scheduleCheckInAlarm({
    required int id,
    required String companyName,
    required DateTime scheduledTime,
    required int minutesBefore,
  }) async {
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

  /// 퇴근 알림 예약
  Future<void> scheduleCheckOutAlarm({
    required int id,
    required String companyName,
    required DateTime scheduledTime,
    required int minutesBefore,
  }) async {
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

  /// 출근 알림 취소 (특정 ID)
  Future<void> cancelCheckInAlarm(int id) async {
    await _plugin.cancel(_checkInBaseId + id);
  }

  /// 퇴근 알림 취소 (특정 ID)
  Future<void> cancelCheckOutAlarm(int id) async {
    await _plugin.cancel(_checkOutBaseId + id);
  }

  /// 모든 출퇴근 알림 취소
  Future<void> cancelAllAlarms() async {
    await _plugin.cancelAll();
  }
}
