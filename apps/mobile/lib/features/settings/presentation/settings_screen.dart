import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).value;
    final user = auth?.user;
    final employments = user?.employments ?? [];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              color: Colors.white.withOpacity(0.65),
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
                        gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 16, offset: const Offset(0, 6))],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.person_rounded, color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user?.name ?? '사용자',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                                Text(user?.email ?? '기기 계정',
                                    style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.8))),
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
                                color: Colors.white.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.white.withOpacity(0.5)),
                              ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: emp.isActive ? AppColors.primaryLight : AppColors.bg,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(Icons.business_rounded,
                                      color: emp.isActive ? AppColors.primary : AppColors.textMuted, size: 20),
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
                    const Text('일반', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 10),
                    _settingTile(
                      icon: Icons.add_business_rounded,
                      label: '근무지 추가 등록',
                      onTap: () => context.go('/onboarding'),
                    ),
                    const SizedBox(height: 20),

                    const Text('앱 정보', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 10),
                    _settingTile(
                      icon: Icons.info_outline_rounded,
                      label: '버전 정보',
                      trailing: const Text('1.0.0', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                    ),
                    const SizedBox(height: 20),

                    // 데이터 초기화 버튼
                    GestureDetector(
                      onTap: () async {
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
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.dangerLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.danger.withOpacity(0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.refresh_rounded, color: AppColors.danger, size: 20),
                            SizedBox(width: 12),
                            Text('데이터 초기화', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.danger)),
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
          color: Colors.white.withOpacity(0.7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.5)),
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
}
