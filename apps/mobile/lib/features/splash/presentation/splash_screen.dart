import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/auth_provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/version_service.dart';
import '../../../core/widgets/update_dialog.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  bool _showRetry = false;
  String _retryMessage = '';
  String _errorDetail = '';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
    _navigate();
  }

  Future<void> _navigate({int retryCount = 0}) async {
    if (retryCount == 0) {
      await Future.delayed(const Duration(milliseconds: 1600));
    }
    if (!mounted) return;

    // 버전 체크 (5초 타임아웃, 실패해도 진행)
    if (retryCount == 0) {
      try {
        final versionService = ref.read(versionServiceProvider);
        final versionInfo = await versionService.checkVersion()
            .timeout(const Duration(seconds: 5), onTimeout: () => VersionInfo(
                  state: UpdateState.none,
                  currentVersion: '1.0.0',
                  latestVersion: '1.0.0',
                  storeUrl: '',
                ));
        if (!mounted) return;

        if (versionInfo.state == UpdateState.force) {
          await showDialog<void>(
            context: context,
            barrierDismissible: false,
            builder: (context) => UpdateDialog(versionInfo: versionInfo),
          );
          return;
        } else if (versionInfo.state == UpdateState.optional) {
          final updateSelected = await showDialog<bool>(
            context: context,
            barrierDismissible: true,
            builder: (context) => UpdateDialog(versionInfo: versionInfo),
          );
          if (updateSelected == true) return;
        }
      } catch (_) {
        // 버전 체크 실패 시 무시하고 계속 진행
      }
      if (!mounted) return;
    }

    // 서버 콜드 스타트 대응: 최대 2회 자동 재시도 (각 40초 타임아웃)
    try {
      if (retryCount > 0) {
        setState(() => _retryMessage = '서버를 깨우는 중... ($retryCount/2)');
      }
      final auth = await ref.read(authProvider.future)
          .timeout(const Duration(seconds: 40));
      if (!mounted) return;
      if (!auth.isAuthenticated) {
        if (retryCount < 2) {
          await ref.read(authProvider.notifier).build();
          return _navigate(retryCount: retryCount + 1);
        }
        setState(() { _showRetry = true; _retryMessage = ''; _errorDetail = '인증에 실패했습니다'; });
        return;
      }
      setState(() { _retryMessage = ''; _errorDetail = ''; });
      auth.onboardingCompleted ? context.go('/home') : context.go('/welcome');
    } catch (e) {
      if (!mounted) return;
      final errMsg = parseApiError(e);
      debugPrint('스플래시 인증 오류 ($retryCount회): $e');
      if (retryCount < 2) {
        await ref.read(authProvider.notifier).build();
        return _navigate(retryCount: retryCount + 1);
      }
      setState(() { _showRetry = true; _retryMessage = ''; _errorDetail = errMsg; });
    }
  }

  Future<void> _retry() async {
    setState(() { _showRetry = false; _retryMessage = ''; _errorDetail = ''; });
    await ref.read(authProvider.notifier).build();
    _navigate();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        color: AppColors.bg,
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.people_rounded,
                    size: 40,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  '근무관리',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '출퇴근 · 급여 · 휴가 한 번에',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 48),
                if (_showRetry) ...[
                  Text(
                    '서버에 연결할 수 없습니다',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 13,
                    ),
                  ),
                  if (_errorDetail.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      _errorDetail,
                      style: TextStyle(
                        color: AppColors.danger,
                        fontSize: 11,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: _retry,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('다시 시도'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                    ),
                  ),
                ] else ...[
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      color: AppColors.textMuted,
                      strokeWidth: 2,
                    ),
                  ),
                  if (_retryMessage.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      _retryMessage,
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
