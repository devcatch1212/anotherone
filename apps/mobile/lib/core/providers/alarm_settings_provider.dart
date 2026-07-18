// lib/core/providers/alarm_settings_provider.dart
// SharedPreferences 기반 출퇴근 알림 설정 저장/조회 Riverpod Provider

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kCheckInEnabled = 'alarm_checkIn_enabled';
const _kCheckOutEnabled = 'alarm_checkOut_enabled';
const _kMinutesBefore = 'alarm_minutes_before';

class AlarmSettings {
  final bool checkInEnabled;
  final bool checkOutEnabled;
  final int minutesBefore; // 5, 10, 15, 20, 30 중 하나

  const AlarmSettings({
    this.checkInEnabled = true,
    this.checkOutEnabled = true,
    this.minutesBefore = 10,
  });

  AlarmSettings copyWith({
    bool? checkInEnabled,
    bool? checkOutEnabled,
    int? minutesBefore,
  }) =>
      AlarmSettings(
        checkInEnabled: checkInEnabled ?? this.checkInEnabled,
        checkOutEnabled: checkOutEnabled ?? this.checkOutEnabled,
        minutesBefore: minutesBefore ?? this.minutesBefore,
      );
}

class AlarmSettingsNotifier extends AsyncNotifier<AlarmSettings> {
  @override
  Future<AlarmSettings> build() async {
    return _load();
  }

  Future<AlarmSettings> _load() async {
    final prefs = await SharedPreferences.getInstance();
    return AlarmSettings(
      checkInEnabled: prefs.getBool(_kCheckInEnabled) ?? true,
      checkOutEnabled: prefs.getBool(_kCheckOutEnabled) ?? true,
      minutesBefore: prefs.getInt(_kMinutesBefore) ?? 10,
    );
  }

  Future<void> setCheckInEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kCheckInEnabled, value);
    final current = state.value ?? const AlarmSettings();
    state = AsyncData(current.copyWith(checkInEnabled: value));
  }

  Future<void> setCheckOutEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kCheckOutEnabled, value);
    final current = state.value ?? const AlarmSettings();
    state = AsyncData(current.copyWith(checkOutEnabled: value));
  }

  Future<void> setMinutesBefore(int value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kMinutesBefore, value);
    final current = state.value ?? const AlarmSettings();
    state = AsyncData(current.copyWith(minutesBefore: value));
  }
}

final alarmSettingsProvider =
    AsyncNotifierProvider<AlarmSettingsNotifier, AlarmSettings>(
  AlarmSettingsNotifier.new,
);
