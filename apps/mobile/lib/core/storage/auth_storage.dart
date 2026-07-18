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
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── 토큰 ──
  Future<void> saveToken(String token) async {
    try {
      await _secure.write(key: _tokenKey, value: token).timeout(const Duration(seconds: 2));
    } catch (e) {
      debugPrint('[AuthStorage] saveToken 오류: $e');
    }
  }

  Future<String?> getToken() async {
    try {
      return await _secure.read(key: _tokenKey).timeout(const Duration(seconds: 2));
    } catch (e) {
      debugPrint('[AuthStorage] getToken 오류: $e');
      return null;
    }
  }

  Future<void> deleteToken() async {
    try {
      await _secure.delete(key: _tokenKey).timeout(const Duration(seconds: 2));
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
      await _secure.write(key: _userKey, value: jsonEncode(json)).timeout(const Duration(seconds: 2));
    } catch (e) {
      debugPrint('[AuthStorage] saveUser 오류: $e');
    }
  }

  Future<User?> getUser() async {
    try {
      final str = await _secure.read(key: _userKey).timeout(const Duration(seconds: 2));
      if (str == null) return null;
      return User.fromJson(jsonDecode(str) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AuthStorage] getUser 오류: $e');
      return null;
    }
  }

  Future<void> deleteUser() async {
    try {
      await _secure.delete(key: _userKey).timeout(const Duration(seconds: 2));
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

  // ── 전체 삭제 ──
  Future<void> clearAll() async {
    try {
      await _secure.deleteAll().timeout(const Duration(seconds: 2));
    } catch (e) {
      debugPrint('[AuthStorage] clearAll secure storage 오류: $e');
    }
    try {
      final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 2));
      await prefs.clear();
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
