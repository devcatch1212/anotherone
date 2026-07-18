// lib/features/onboarding/presentation/welcome_screen.dart
// iOS 미니멀 스타일 웰컴 스크린 - 연회색 배경 + 흰 카드 + 다크 텍스트

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _features = [
    {
      'icon': Icons.my_location_rounded,
      'title': '정확한 위치 인증 출퇴근',
      'desc': '근무지 반경 안에서 터치 한 번으로\n지연 없이 출퇴근을 기록하세요.',
      'color': AppColors.accent,
      'bgColor': AppColors.accentLight,
    },
    {
      'icon': Icons.payments_rounded,
      'title': '투명한 급여 자동 계산',
      'desc': '출퇴근 기록을 바탕으로 주휴수당과\n예상 급여 명세서를 바로 확인합니다.',
      'color': const Color(0xFFFF9500),
      'bgColor': const Color(0xFFFFF3E0),
    },
    {
      'icon': Icons.beach_access_rounded,
      'title': '자유로운 연차 신청',
      'desc': '남은 연차 일수를 실시간 동기화하고\n앱에서 간편하게 연차를 상신하세요.',
      'color': AppColors.vacation,
      'bgColor': AppColors.vacationLight,
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 48),

            // ── 브랜드 로고 및 앱 타이틀 ──
            Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.people_rounded,
                    size: 36,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  '오출완',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  '출퇴근 · 급여 · 연차를 스마트하게',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),

            const Expanded(child: SizedBox()),

            // ── 기능 소개 캐러셀 ──
            SizedBox(
              height: 260,
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemCount: _features.length,
                itemBuilder: (context, index) {
                  final item = _features[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Container(
                      padding: const EdgeInsets.all(28),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 12,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: item['bgColor'] as Color,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              item['icon'],
                              size: 32,
                              color: item['color'],
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            item['title'],
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            item['desc'],
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // ── 인디케이터 닷 ──
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _features.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 240),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _currentPage == index
                        ? AppColors.textPrimary
                        : AppColors.textMuted.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),

            const Expanded(child: SizedBox()),

            // ── 시작하기 버튼 ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: GestureDetector(
                onTap: () => context.go('/onboarding'),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface, // 홈 화면 근무시간 카드/출근버튼 배경색과 완전 일치
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF3E6872), width: 1.0),
                  ),
                  child: const Center(
                    child: Text(
                      '바로 시작하기',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF3E6872),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
