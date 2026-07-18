import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../core/providers/alarm_settings_provider.dart';
import '../../../core/services/alarm_scheduler.dart';
import '../../../core/services/notification_service.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).value;
    final user = auth?.user;
    final employments = user?.employments ?? [];
    final alarmAsync = ref.watch(alarmSettingsProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              color: Colors.transparent,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: const Align(
                alignment: Alignment.centerLeft,
                child: Text('설정',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 프로필
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 16, offset: const Offset(0, 4))],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: const Color(0xFF3E6872).withOpacity(0.08),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.person_rounded, color: Color(0xFF3E6872), size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(user?.name ?? '사용자',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () => _showEditNameDialog(context, ref, user?.name ?? ''),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF3E6872).withOpacity(0.08),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.edit_rounded, color: Color(0xFF3E6872), size: 14),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 근무지 목록
                    if (employments.isNotEmpty) ...[
                      const Text('근무지', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                      const SizedBox(height: 10),
                      ...employments.map((emp) => GestureDetector(
                            onTap: () => context.go('/settings/workplace/edit', extra: emp),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: emp.isActive ? const Color(0xFF3E6872).withOpacity(0.08) : AppColors.bg,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(Icons.business_rounded,
                                        color: emp.isActive ? const Color(0xFF3E6872) : AppColors.textMuted, size: 20),
                                  ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(emp.company.name,
                                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                      Text(emp.position,
                                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: emp.isActive ? AppColors.successLight : AppColors.bg,
                                    borderRadius: BorderRadius.circular(99),
                                  ),
                                  child: Text(
                                    emp.isActive ? '활성' : '비활성',
                                    style: TextStyle(
                                      fontSize: 11, fontWeight: FontWeight.w700,
                                      color: emp.isActive ? AppColors.success : AppColors.textMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ))),
                      const SizedBox(height: 20),
                    ],

                    // 설정 항목들
                    // const Text('일반', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    // const SizedBox(height: 10),
                    // _settingTile(
                    //   icon: Icons.add_business_rounded,
                    //   label: '근무지 추가 등록',
                    //   onTap: () => context.go('/onboarding'),
                    // ),
                    // const SizedBox(height: 20),

                    const Text('앱 정보', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 10),
                    _settingTile(
                      icon: Icons.info_outline_rounded,
                      label: '버전 정보',
                      trailing: const Text('1.0.0', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                    ),
                    const SizedBox(height: 8),
                    _settingTile(
                      icon: Icons.description_outlined,
                      label: '서비스 이용약관',
                      onTap: () => context.go('/settings/legal?type=terms'),
                    ),
                    const SizedBox(height: 8),
                    _settingTile(
                      icon: Icons.privacy_tip_outlined,
                      label: '개인정보처리방침',
                      onTap: () => context.go('/settings/legal?type=privacy'),
                    ),
                    const SizedBox(height: 32),

                    const Text('알림 설정', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 10),
                    alarmAsync.when(
                      loading: () => const SizedBox(height: 80, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (settings) => Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            // 출근 알림 토글
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.login_rounded, color: AppColors.textSecondary, size: 20),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Text('출근 알림', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                  ),
                                  Switch(
                                    value: settings.checkInEnabled,
                                    activeThumbColor: const Color(0xFF3E6872),
                                    onChanged: (value) async {
                                      if (value) {
                                        // 토글 ON 시 권한 확인 및 요청
                                        final granted = await NotificationService().requestPermission();
                                        if (!granted) {
                                          // 영구 거부 시 설정 앱 안내
                                          if (context.mounted) {
                                            _showPermissionDeniedSnackBar(context);
                                          }
                                          return; // 토글 ON 취소
                                        }
                                      }
                                      await ref.read(alarmSettingsProvider.notifier).setCheckInEnabled(value);
                                      _rescheduleAlarms(ref, employments);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1, indent: 48),
                            // 퇴근 알림 토글
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.logout_rounded, color: AppColors.textSecondary, size: 20),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Text('퇴근 알림', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                  ),
                                  Switch(
                                    value: settings.checkOutEnabled,
                                    activeThumbColor: const Color(0xFF3E6872),
                                    onChanged: (value) async {
                                      if (value) {
                                        final granted = await NotificationService().requestPermission();
                                        if (!granted) {
                                          if (context.mounted) {
                                            _showPermissionDeniedSnackBar(context);
                                          }
                                          return;
                                        }
                                      }
                                      await ref.read(alarmSettingsProvider.notifier).setCheckOutEnabled(value);
                                      _rescheduleAlarms(ref, employments);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            // 알림 시간 선택 (출근 또는 퇴근 알림이 하나라도 켜진 경우만 표시)
                            if (settings.checkInEnabled || settings.checkOutEnabled) ...[
                              const Divider(height: 1, indent: 48),
                              GestureDetector(
                                onTap: () => _showMinutesPickerSheet(context, ref, settings.minutesBefore, employments),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.timer_outlined, color: AppColors.textSecondary, size: 20),
                                      const SizedBox(width: 12),
                                      const Expanded(
                                        child: Text('알림 시간', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                      ),
                                      Text(
                                        '${settings.minutesBefore}분 전',
                                        style: const TextStyle(fontSize: 14, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 데이터 초기화 버튼 (눈에 띄지 않게 텍스트 형태로 하단 배치)
                    Center(
                      child: TextButton(
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              title: const Text('데이터 초기화', style: TextStyle(fontWeight: FontWeight.w800)),
                              content: const Text('기기 데이터를 초기화하면 새 계정으로 시작합니다. 온보딩부터 다시 진행해야 합니다.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx, true),
                                  child: const Text('초기화', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                                ),
                              ],
                            ),
                          );
                          if (confirm == true) {
                            await ref.read(authProvider.notifier).logout();
                          }
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFFFF3B30).withOpacity(0.7),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.refresh_rounded, size: 16),
                            SizedBox(width: 6),
                            Text(
                              '데이터 초기화',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _settingTile({required IconData icon, required String label, VoidCallback? onTap, Widget? trailing}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
            trailing ?? (onTap != null ? const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted) : const SizedBox.shrink()),
          ],
        ),
      ),
    );
  }

  void _showEditNameDialog(BuildContext context, WidgetRef ref, String currentName) {
    final controller = TextEditingController(text: currentName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('닉네임 수정', style: TextStyle(fontWeight: FontWeight.w800)),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: '새로운 닉네임을 입력하세요',
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          maxLength: 15,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isEmpty) return;
              try {
                await ref.read(authProvider.notifier).updateName(newName);
                if (ctx.mounted) Navigator.pop(ctx);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('닉네임 변경에 실패했습니다: $e')),
                  );
                }
              }
            },
            child: const Text('저장', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _showMinutesPickerSheet(
    BuildContext context,
    WidgetRef ref,
    int currentMinutes,
    List<dynamic> employments,
  ) {
    const options = [5, 10, 15, 20, 30];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.textMuted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 8, left: 20),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('알림 시간 선택', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
              ),
              ...options.map((min) => ListTile(
                    title: Text('$min분 전', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    trailing: min == currentMinutes
                        ? const Icon(Icons.check_rounded, color: Color(0xFF3E6872))
                        : null,
                    onTap: () async {
                      Navigator.pop(ctx);
                      await ref.read(alarmSettingsProvider.notifier).setMinutesBefore(min);
                      _rescheduleAlarms(ref, employments);
                    },
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _rescheduleAlarms(WidgetRef ref, List<dynamic> employments) {
    Future(() async {
      try {
        final settings = await ref.read(alarmSettingsProvider.future);
        await AlarmScheduler().reschedule(
          employments: employments.cast(),
          settings: settings,
        );
      } catch (e) {
        debugPrint('설정 화면 알람 재예약 실패: $e');
      }
    });
  }

  /// 알림 권한 영구 거부 시 설정 앱으로 안내하는 스낵바 표시
  void _showPermissionDeniedSnackBar(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          '알림 권한이 거부되었습니다.\n설정 > 앱 > 알림에서 직접 허용해주세요.',
        ),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: '설정 열기',
          onPressed: () => openAppSettings(), // permission_handler 제공
        ),
      ),
    );
  }
}

