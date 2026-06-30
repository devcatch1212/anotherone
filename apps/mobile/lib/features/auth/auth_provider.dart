// lib/features/auth/auth_provider.dart
// 기기 UUID 기반 자동 인증 상태관리 Riverpod Provider

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/models.dart';
import '../../core/storage/auth_storage.dart';
import '../../core/api/api_client.dart';
import '../../core/services/device_id_service.dart';

// ── 인증 상태 ──
class AuthState {
  final String? token;
  final User? user;
  final String? currentCompanyId;
  final String? currentEmploymentId;
  final bool isAuthenticated;
  final bool onboardingCompleted;

  const AuthState({
    this.token,
    this.user,
    this.currentCompanyId,
    this.currentEmploymentId,
    this.isAuthenticated = false,
    this.onboardingCompleted = false,
  });

  Employment? get currentEmployment {
    if (user == null) return null;
    return user!.employments.firstWhereOrNull(
          (e) => e.companyId == currentCompanyId && e.isActive,
        ) ??
        user!.employments.firstWhereOrNull((e) => e.isActive) ??
        (user!.employments.isNotEmpty ? user!.employments.first : null);
  }

  AuthState copyWith({
    String? token,
    User? user,
    String? currentCompanyId,
    String? currentEmploymentId,
    bool? isAuthenticated,
    bool? onboardingCompleted,
  }) =>
      AuthState(
        token: token ?? this.token,
        user: user ?? this.user,
        currentCompanyId: currentCompanyId ?? this.currentCompanyId,
        currentEmploymentId: currentEmploymentId ?? this.currentEmploymentId,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
      );
}

extension FirstWhereOrNull<T> on Iterable<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    for (final element in this) {
      if (test(element)) return element;
    }
    return null;
  }
}

// ── Notifier ──
class AuthNotifier extends AsyncNotifier<AuthState> {
  late AuthStorage _storage;
  late ApiClient _api;

  @override
  Future<AuthState> build() async {
    _storage = ref.read(authStorageProvider);
    _api = ApiClient(
      _storage,
      onUnauthorized: () async => logout(),
    );
    return _initAuth();
  }

  /// 앱 시작 시 저장된 토큰 확인 → 없으면 기기 UUID로 자동 로그인
  Future<AuthState> _initAuth() async {
    final token = await _storage.getToken();
    final user = await _storage.getUser();

    if (token != null && user != null) {
      // 기존 토큰 있음 → 바로 복원
      final activeEmployments = user.employments.where((e) => e.isActive).toList();
      final primary = activeEmployments.firstWhereOrNull((e) => e.isPrimary) ??
          activeEmployments.firstOrNull ??
          user.employments.firstOrNull;

      return AuthState(
        token: token,
        user: user,
        isAuthenticated: true,
        onboardingCompleted: user.onboardingCompleted,
        currentCompanyId: primary?.companyId,
        currentEmploymentId: primary?.id,
      );
    }

    // 토큰 없음 → 기기 UUID로 자동 신규 로그인
    return _loginWithDeviceId();
  }

  Future<AuthState> _loginWithDeviceId() async {
    try {
      final deviceId = await DeviceIdService.getOrCreate();
      final res = await _api.post<Map<String, dynamic>>(
        '/api/auth/device',
        data: {'deviceId': deviceId},
      );
      final token = res['access_token'] as String;
      final user = User.fromJson(res['user'] as Map<String, dynamic>);

      await _storage.saveToken(token);
      await _storage.saveUser(user);

      final activeEmployments = user.employments.where((e) => e.isActive).toList();
      final primary = activeEmployments.firstWhereOrNull((e) => e.isPrimary) ??
          activeEmployments.firstOrNull ??
          user.employments.firstOrNull;

      await _storage.saveCurrentCompanyId(primary?.companyId);
      await _storage.saveCurrentEmploymentId(primary?.id);

      return AuthState(
        token: token,
        user: user,
        isAuthenticated: true,
        onboardingCompleted: user.onboardingCompleted,
        currentCompanyId: primary?.companyId,
        currentEmploymentId: primary?.id,
      );
    } catch (e) {
      debugPrint('기기 자동 로그인 실패: $e');
      return const AuthState();
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    // 로그아웃 시에도 바로 기기 UUID로 재로그인
    state = const AsyncValue.loading();
    final newState = await _loginWithDeviceId();
    state = AsyncValue.data(newState);
  }

  Future<void> completeOnboarding() async {
    final current = state.value;
    if (current == null) return;
    final updatedUser = current.user?.copyWith(onboardingCompleted: true);
    if (updatedUser != null) await _storage.saveUser(updatedUser);
    state = AsyncValue.data(current.copyWith(
      user: updatedUser,
      onboardingCompleted: true,
    ));
  }

  Future<void> refreshUser() async {
    try {
      final res = await _api.get<Map<String, dynamic>>('/api/auth/me');
      final user = User.fromJson(res);
      await _storage.saveUser(user);
      final current = state.value ?? const AuthState();

      final activeEmployments = user.employments.where((e) => e.isActive).toList();
      final primary = activeEmployments.firstWhereOrNull((e) => e.isPrimary) ??
          activeEmployments.firstOrNull ??
          user.employments.firstOrNull;

      state = AsyncValue.data(current.copyWith(
        user: user,
        currentCompanyId: primary?.companyId,
        currentEmploymentId: primary?.id,
        onboardingCompleted: user.onboardingCompleted,
      ));
    } catch (e) {
      debugPrint('refreshUser 실패: $e');
    }
  }

  void setCurrentCompany(String companyId) {
    final current = state.value;
    if (current == null) return;
    final employment = current.user?.employments
        .firstWhereOrNull((e) => e.companyId == companyId && e.isActive);
    _storage.saveCurrentCompanyId(companyId);
    _storage.saveCurrentEmploymentId(employment?.id);
    state = AsyncValue.data(current.copyWith(
      currentCompanyId: companyId,
      currentEmploymentId: employment?.id,
    ));
  }

  Future<void> updateName(String name) async {
    try {
      await _api.put<Map<String, dynamic>>(
        '/api/settings/name',
        data: {'name': name.trim()},
      );
      await refreshUser();
    } catch (e) {
      debugPrint('이름 업데이트 실패: $e');
      rethrow;
    }
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
