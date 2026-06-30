// lib/core/services/device_id_service.dart
// 기기 고유 UUID 생성 및 로컬 저장 서비스

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

const _kDeviceIdKey = 'device_id';

class DeviceIdService {
  static const _uuid = Uuid();

  /// 앱 최초 실행 시 UUID 생성, 이후에는 동일한 UUID 반환
  static Future<String> getOrCreate() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_kDeviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final newId = _uuid.v4();
    await prefs.setString(_kDeviceIdKey, newId);
    return newId;
  }
}
