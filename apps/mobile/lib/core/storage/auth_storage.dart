// lib/core/storage/auth_storage.dart
// JWT 토큰 및 인증 정보 보안 저장소

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../shared/models/models.dart';

final authStorageProvider = Provider<AuthStorage>((ref) => AuthStorage());

class AuthStorage {
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';
  static const _rememberMeKey = 'remember_me';
  static const _currentCompanyKey = 'current_company_id';
  static const _currentEmploymentKey = 'current_employment_id';

  final _secure = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // 앱 업데이트 시 keystore 손상으로 읽기 실패할 경우 자동 초기화 후 재생성
      resetOnError: true,
    ),
  );

  // ── 토큰 ──
  Future<void> saveToken(String token) async {
    try {
      await _secure.write(key: _tokenKey, value: token).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] saveToken 오류: $e');
    }
  }

  Future<String?> getToken() async {
    try {
      return await _secure.read(key: _tokenKey).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] getToken 오류: $e');
      return null;
    }
  }

  Future<void> deleteToken() async {
    try {
      await _secure.delete(key: _tokenKey).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] deleteToken 오류: $e');
    }
  }

  // ── 유저 ──
  Future<void> saveUser(User user) async {
    try {
      final json = {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'image': user.image,
        'onboardingCompleted': user.onboardingCompleted,
        'employments': user.employments.map((e) => _employmentToJson(e)).toList(),
      };
      await _secure.write(key: _userKey, value: jsonEncode(json)).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] saveUser 오류: $e');
    }
  }

  Future<User?> getUser() async {
    try {
      final str = await _secure.read(key: _userKey).timeout(const Duration(seconds: 5));
      if (str == null) return null;
      return User.fromJson(jsonDecode(str) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AuthStorage] getUser 오류: $e');
      return null;
    }
  }

  Future<void> deleteUser() async {
    try {
      await _secure.delete(key: _userKey).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] deleteUser 오류: $e');
    }
  }

  // ── 기타 설정 ──
  Future<void> saveRememberMe(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_rememberMeKey, value);
  }

  Future<bool> getRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_rememberMeKey) ?? false;
  }

  Future<void> saveCurrentCompanyId(String? id) async {
    final prefs = await SharedPreferences.getInstance();
    if (id == null) {
      await prefs.remove(_currentCompanyKey);
    } else {
      await prefs.setString(_currentCompanyKey, id);
    }
  }

  Future<String?> getCurrentCompanyId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentCompanyKey);
  }

  Future<void> saveCurrentEmploymentId(String? id) async {
    final prefs = await SharedPreferences.getInstance();
    if (id == null) {
      await prefs.remove(_currentEmploymentKey);
    } else {
      await prefs.setString(_currentEmploymentKey, id);
    }
  }

  Future<String?> getCurrentEmploymentId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentEmploymentKey);
  }

  // ── 전체 삭제 (device_id는 기기 식별을 위해 보존) ──
  Future<void> clearAll() async {
    try {
      // deleteAll() 대신 인증 관련 키만 개별 삭제 (다른 보안 저장소 데이터 보존)
      await _secure.delete(key: _tokenKey).timeout(const Duration(seconds: 5));
      await _secure.delete(key: _userKey).timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[AuthStorage] clearAll secure storage 오류: $e');
    }
    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 5));
      await prefs.remove(_rememberMeKey);
      await prefs.remove(_currentCompanyKey);
      await prefs.remove(_currentEmploymentKey);
      // device_id 키는 절대 삭제하지 않음 (기기 식별자 보존)
    } catch (e) {
      debugPrint('[AuthStorage] clearAll shared preferences 오류: $e');
    }
  }

  // ── 헬퍼 ──
  Map<String, dynamic> _employmentToJson(Employment e) => {
        'id': e.id,
        'userId': e.userId,
        'companyId': e.companyId,
        'company': {
          'id': e.company.id,
          'name': e.company.name,
          'address': e.company.address,
          'latitude': e.company.latitude,
          'longitude': e.company.longitude,
          'radiusMeters': e.company.radiusMeters,
        },
        'position': e.position,
        'wageType': e.wageType == WageType.hourly ? 'hourly' : 'daily',
        'hourlyWage': e.hourlyWage,
        'dailyWage': e.dailyWage,
        'dailyWorkHours': e.dailyWorkHours,
        'weeklyWorkDays': e.weeklyWorkDays,
        'workStartTime': e.workStartTime,
        'workEndTime': e.workEndTime,
        'workDaysOfWeek': e.workDaysOfWeek,
        'breakMinutes': e.breakMinutes,
        'isPrimary': e.isPrimary,
        'isActive': e.isActive,
        'endedAt': e.endedAt,
      };
}
