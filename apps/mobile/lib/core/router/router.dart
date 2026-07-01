// lib/core/router/router.dart
// go_router 라우팅 설정 (기기 UUID 기반 자동 인증 및 웰컴 인트로)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/models.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/attendance/presentation/attendance_screen.dart';
import '../../features/payroll/presentation/payroll_screen.dart';
import '../../features/payroll/presentation/payroll_detail_screen.dart';
import '../../features/calendar/presentation/calendar_screen.dart';
import '../../features/leave/presentation/leave_screen.dart';
import '../../features/leave/presentation/leave_apply_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/settings/presentation/workplace_edit_screen.dart';
import '../../features/settings/presentation/legal_detail_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/onboarding/presentation/welcome_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../widgets/main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authAsync = ref.read(authProvider);
      final loc = state.uri.path;

      // 기기 자동 로그인 중 → 스플래시 유지
      if (authAsync.isLoading) return '/';

      final auth = authAsync.value;
      final isAuthenticated = auth?.isAuthenticated ?? false;
      final onboardingCompleted = auth?.onboardingCompleted ?? false;

      debugPrint('▶ [Router Guard] loc: $loc, isAuthenticated: $isAuthenticated, onboardingCompleted: $onboardingCompleted');

      // 인증 실패(네트워크 오류 등) → 스플래시에서 재시도 대기
      if (!isAuthenticated && loc != '/') return '/';

      // 스플래시에서 인증 완료 시 최초 사용자는 /welcome, 기존 사용자는 /home으로 이동
      if (isAuthenticated && loc == '/') {
        return onboardingCompleted ? '/home' : '/welcome';
      }

      // 온보딩 미완료 상태에서 /welcome과 /onboarding 외의 페이지 접근 차단
      if (isAuthenticated && !onboardingCompleted) {
        if (loc != '/welcome' && loc != '/onboarding') {
          return '/welcome';
        }
      }

      // 온보딩이 이미 완료되었는데 /welcome 이나 /onboarding에 들어오면 /home으로 보냄
      if (isAuthenticated && onboardingCompleted && (loc == '/welcome' || loc == '/onboarding')) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: '/welcome',
        builder: (_, __) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: '/attendance',
            builder: (_, __) => const AttendanceScreen(),
          ),
          GoRoute(
            path: '/calendar',
            builder: (_, __) => const CalendarScreen(),
          ),
          GoRoute(
            path: '/leave',
            builder: (_, __) => const LeaveScreen(),
          ),
          GoRoute(
            path: '/leave/apply',
            builder: (_, __) => const LeaveApplyScreen(),
          ),
          GoRoute(
            path: '/payroll',
            builder: (_, __) => const PayrollScreen(),
          ),
          GoRoute(
            path: '/payroll/:id',
            builder: (_, state) =>
                PayrollDetailScreen(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (_, __) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/settings/workplace/edit',
            builder: (_, state) {
              final employment = state.extra as Employment?;
              if (employment == null) {
                return const Scaffold(
                  body: Center(
                    child: Text('근무지 고용 정보가 없습니다.'),
                  ),
                );
              }
              return WorkplaceEditScreen(employment: employment);
            },
          ),
          GoRoute(
            path: '/settings/legal',
            builder: (_, state) {
              final type = state.uri.queryParameters['type'] ?? 'terms';
              return LegalDetailScreen(type: type);
            },
          ),
        ],
      ),
    ],
  );

  ref.listen(authProvider, (previous, next) {
    router.refresh();
  });

  return router;
});
