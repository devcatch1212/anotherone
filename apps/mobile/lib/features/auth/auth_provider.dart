// lib/features/auth/auth_provider.dart
// 인증 상태관리 Riverpod Provider

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/models.dart';
import '../../core/storage/auth_storage.dart';
import '../../core/api/api_client.dart';

// ── 인증 상태 ──
class AuthState {
  final String? token;
  final User? user;
  final String? currentCompanyId;
  final String? currentEmploymentId;
  final bool isAuthenticated;
  final bool onboardingCompleted;
  final bool isGuest;

  const AuthState({
    this.token,
    this.user,
    this.currentCompanyId,
    this.currentEmploymentId,
    this.isAuthenticated = false,
    this.onboardingCompleted = false,
    this.isGuest = false,
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
    bool? isGuest,
  }) =>
      AuthState(
        token: token ?? this.token,
        user: user ?? this.user,
        currentCompanyId: currentCompanyId ?? this.currentCompanyId,
        currentEmploymentId: currentEmploymentId ?? this.currentEmploymentId,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
        isGuest: isGuest ?? this.isGuest,
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
    // 401 자동 로그아웃: logout 콜백을 ApiClient에 직접 주입
    _api = ApiClient(
      _storage,
      onUnauthorized: () async => logout(),
    );
    return _loadFromStorage();
  }

  Future<AuthState> _loadFromStorage() async {
    final token = await _storage.getToken();
    final user = await _storage.getUser();
    if (token == null || user == null) return const AuthState();

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

  Future<void> login(String email, String password, bool remember) async {
    try {
      final res = await _api.post<Map<String, dynamic>>(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      final token = res['access_token'] as String;
      final user = User.fromJson(res['user'] as Map<String, dynamic>);

      await _storage.saveToken(token);
      await _storage.saveUser(user);
      await _storage.saveRememberMe(remember);

      final activeEmployments = user.employments.where((e) => e.isActive).toList();
      final primary = activeEmployments.firstWhereOrNull((e) => e.isPrimary) ??
          activeEmployments.firstOrNull ??
          user.employments.firstOrNull;

      await _storage.saveCurrentCompanyId(primary?.companyId);
      await _storage.saveCurrentEmploymentId(primary?.id);

      state = AsyncValue.data(AuthState(
        token: token,
        user: user,
        isAuthenticated: true,
        onboardingCompleted: user.onboardingCompleted,
        currentCompanyId: primary?.companyId,
        currentEmploymentId: primary?.id,
      ));
    } catch (e, st) {
      state = AsyncValue.data(state.value ?? const AuthState());
      rethrow;
    }
  }

  Future<void> register(String name, String email, String password) async {
    try {
      await _api.post<Map<String, dynamic>>(
        '/api/auth/register',
        data: {'name': name, 'email': email, 'password': password},
      );
      // 가입 후 바로 로그인
      await login(email, password, false);
    } catch (e, st) {
      state = AsyncValue.data(state.value ?? const AuthState());
      rethrow;
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    state = const AsyncValue.data(AuthState());
  }

  Future<void> loginAsGuest() async {
    state = const AsyncValue.loading();
    try {
      final response = await _api.post<Map<String, dynamic>>('/api/auth/anonymous');
      
      final token = response['access_token'] as String;
      final userData = response['user'];
      final user = User.fromJson(userData as Map<String, dynamic>);

      await _storage.saveToken(token);
      await _storage.saveUser(user);

      state = AsyncValue.data(AuthState(
        token: token,
        user: user,
        isAuthenticated: true,
        onboardingCompleted: user.onboardingCompleted,
        isGuest: true,
        currentCompanyId: null,
        currentEmploymentId: null,
      ));
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
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
      state = AsyncValue.data(current.copyWith(user: user));
    } catch (e) {
      // 사용자 정보 갱신 실패는 치명적이지 않으므로 로그만 남김
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

  Future<void> convertToRealUser({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/api/auth/convert',
        data: {
          'email': email.trim(),
          'password': password,
          'name': name.trim(),
        },
      );

      final token = response['access_token'] as String;
      final userData = response['user'];
      final user = User.fromJson(userData as Map<String, dynamic>);

      await _storage.saveToken(token);
      await _storage.saveUser(user);

      final activeEmployments = user.employments.where((e) => e.isActive).toList();
      final primary = activeEmployments.firstWhereOrNull((e) => e.isPrimary) ??
          activeEmployments.firstOrNull ??
          user.employments.firstOrNull;

      state = AsyncValue.data(AuthState(
        token: token,
        user: user,
        isAuthenticated: true,
        onboardingCompleted: user.onboardingCompleted,
        isGuest: false,
        currentCompanyId: primary?.companyId,
        currentEmploymentId: primary?.id,
      ));
    } catch (e, stack) {
      state = AsyncValue.data(state.value ?? const AuthState());
      rethrow;
    }
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
