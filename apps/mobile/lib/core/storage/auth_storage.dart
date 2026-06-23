// lib/core/storage/auth_storage.dart
// JWT 토큰 및 인증 정보 보안 저장소

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../shared/models/models.dart';

final authStorageProvider = Provider<AuthStorage>((ref) => AuthStorage());

class AuthStorage {
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';
  static const _rememberMeKey = 'remember_me';
  static const _onboardingKey = 'onboarding_completed';
  static const _currentCompanyKey = 'current_company_id';
  static const _currentEmploymentKey = 'current_employment_id';

  final _secure = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── 토큰 ──
  Future<void> saveToken(String token) =>
      _secure.write(key: _tokenKey, value: token);

  Future<String?> getToken() => _secure.read(key: _tokenKey);

  Future<void> deleteToken() => _secure.delete(key: _tokenKey);

  // ── 유저 ──
  Future<void> saveUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    final json = {
      'id': user.id,
      'name': user.name,
      'email': user.email,
      'image': user.image,
      'onboardingCompleted': user.onboardingCompleted,
      'employments': user.employments.map((e) => _employmentToJson(e)).toList(),
    };
    await prefs.setString(_userKey, jsonEncode(json));
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_userKey);
    if (str == null) return null;
    try {
      return User.fromJson(jsonDecode(str) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> deleteUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
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
    await _secure.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
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
