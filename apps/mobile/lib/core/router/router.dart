// lib/core/router/router.dart
// go_router 라우팅 설정

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/models.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
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
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../widgets/main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authAsync = ref.read(authProvider);
      final loc = state.uri.path;
      // 아직 로딩 중이면 스플래시에 머무름 (단, 로그인/회원가입 화면 유지)
      if (authAsync.isLoading) {
        if (loc == '/login' || loc == '/register') return null;
        return '/';
      }

      final auth = authAsync.value;
      final isAuthenticated = auth?.isAuthenticated ?? false;
      final onboardingCompleted = auth?.onboardingCompleted ?? false;

      debugPrint('▶ [Router Guard] loc: $loc, isAuthenticated: $isAuthenticated, onboardingCompleted: $onboardingCompleted');

      // 비인증 상태에서 인증 필요 페이지 접근
      final publicRoutes = ['/', '/login', '/register'];
      if (!isAuthenticated && !publicRoutes.contains(loc)) {
        debugPrint('▶ [Router Guard] 비인증 이탈 → /login 으로 강제 튕김');
        return '/login';
      }

      // 인증 상태에서 로그인/스플래시 접근
      if (isAuthenticated && (loc == '/login' || loc == '/register')) {
        if (!onboardingCompleted) return '/onboarding';
        return '/home';
      }

      // 온보딩 미완료
      if (isAuthenticated && !onboardingCompleted && loc != '/onboarding') {
        return '/onboarding';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (_, __) => const RegisterScreen(),
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
        ],
      ),
    ],
  );

  ref.listen(authProvider, (previous, next) {
    router.refresh();
  });

  return router;
});
