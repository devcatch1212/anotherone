// lib/core/theme/app_theme.dart
// iOS 스타일 미니멀 디자인 시스템 (캘린더 레퍼런스 기반)

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand - iOS 스타일 미니멀 다크
  static const primary = Color(0xFF1C1C1E);        // iOS 다크 (메인 텍스트/버튼)
  static const primaryDark = Color(0xFF000000);    // 순수 블랙
  static const primaryLight = Color(0xFFF2F2F7);   // iOS 시스템 그레이6

  // Accent - 파스텔 그린 (정상 출근)
  static const accent = Color(0xFF34C759);          // iOS 그린
  static const accentDark = Color(0xFF248A3D);
  static const accentLight = Color(0xFFD1F2D9);     // 파스텔 그린 써클

  // Semantic - 파스텔 계열 (캘린더 아이콘 색상)
  static const success = Color(0xFF34C759);         // iOS 그린
  static const successLight = Color(0xFFD1F2D9);   // 파스텔 초록 (정상 써클)
  static const danger = Color(0xFFFF3B30);          // iOS 레드
  static const dangerLight = Color(0xFFFFE0DE);
  static const warning = Color(0xFFF5A3A3);         // 파스텔 핑크 (연장근무 써클)
  static const warningLight = Color(0xFFFCECEC);
  static const info = Color(0xFFAFB4F5);            // 파스텔 퍼플 (기타)
  static const infoLight = Color(0xFFECEDF9);
  static const vacation = Color(0xFF5AC8FA);        // iOS 라이트블루 (휴가)
  static const vacationLight = Color(0xFFE0F4FD);

  // Neutral - iOS 시스템 팔레트
  static const bg = Color(0xFFEEEEF0);             // iOS 배경 (연한 회색)
  static const surface = Color(0xFFFFFFFF);         // 카드 순백
  static const border = Color(0xFFE5E5EA);          // iOS 구분선
  static const textPrimary = Color(0xFF1C1C1E);    // iOS 다크
  static const textSecondary = Color(0xFF6C6C70);  // iOS 세컨더리 그레이
  static const textMuted = Color(0xFFAEAEB2);      // iOS 뮤트

  // Glassmorphism
  static const glassWhite = Color(0xCCFFFFFF);
  static const glassBorder = Color(0x33E5E5EA);

  // Gradient (뱃지용)
  static const gradientStart = Color(0xFF1C1C1E);
  static const gradientEnd = Color(0xFF3A3A3C);
}

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        surface: AppColors.surface,
      ),
      scaffoldBackgroundColor: AppColors.bg,
      textTheme: GoogleFonts.notoSansKrTextTheme(
        const TextTheme(
          displayLarge: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.5,
          ),
          headlineLarge: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
          ),
          headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.3,
          ),
          headlineSmall: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
          titleLarge: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
          titleMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          titleSmall: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
          bodyLarge: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: AppColors.textPrimary,
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: AppColors.textPrimary,
          ),
          bodySmall: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.textSecondary,
          ),
          labelLarge: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
          labelSmall: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.textMuted,
          ),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        foregroundColor: AppColors.textPrimary,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFF4F4F5),
          foregroundColor: const Color(0xFF3E6872),
          elevation: 0,
          shadowColor: Colors.transparent,
          side: const BorderSide(color: Color(0xFF3E6872), width: 1.2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.textPrimary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
      ),
    );
  }
}

// iOS 스타일 미니멀 배경 페인터 (은은한 그레이톤)
class AuroraPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // 플랫 디자인 - 배경 그라디언트 없음
    // scaffoldBackgroundColor로 단순하게 처리
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
