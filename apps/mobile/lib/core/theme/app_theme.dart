// lib/core/theme/app_theme.dart
// 웹앱과 동일한 디자인 시스템

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand - 머스타드 옐로 계열 (캘린더 화면 메인 색상)
  static const primary = Color(0xFFE8C84A);        // 머스타드 옐로
  static const primaryDark = Color(0xFFC9A820);    // 진한 머스타드
  static const primaryLight = Color(0xFFFFFDE7);   // 연한 레몬

  // Accent - 초록 (정상 출근 체크)
  static const accent = Color(0xFF22C55E);
  static const accentDark = Color(0xFF16A34A);
  static const accentLight = Color(0xFFDCFCE7);

  // Semantic
  static const success = Color(0xFF22C55E);
  static const successLight = Color(0xFFDCFCE7);
  static const danger = Color(0xFFEF4444);
  static const dangerLight = Color(0xFFFEE2E2);
  static const warning = Color(0xFFF97316);        // 오렌지 (연장근무)
  static const warningLight = Color(0xFFFFEDD5);
  static const info = Color(0xFF7C3AED);           // 퍼플 뱃지
  static const infoLight = Color(0xFFEDE9FE);
  static const vacation = Color(0xFF3B82F6);       // 휴가는 파란색 유지
  static const vacationLight = Color(0xFFEFF6FF);

  // Neutral - 크림 옐로 배경
  static const bg = Color(0xFFF5F375);             // 정확한 배경 옐로 #F5F375
  static const surface = Color(0xFFFCFCBE);        // 카드 배경 (더 밝은 크림)
  static const border = Color(0xFFE0D84A);         // 노란 테두리
  static const textPrimary = Color(0xFF1A1A1A);    // 거의 검정
  static const textSecondary = Color(0xFF5A5A3A);  // 올리브 그린 톤 텍스트
  static const textMuted = Color(0xFF9A9A6A);      // 흐린 올리브

  // Glassmorphism - 노란 틴트 글래스
  static const glassWhite = Color(0xCCFFFDE7);     // 레몬빛 반투명
  static const glassBorder = Color(0x99F0E850);    // 노란 테두리

  // Gradient
  static const gradientStart = Color(0xFFF5F375);  // 배경 옐로
  static const gradientEnd = Color(0xFFE8C84A);    // 머스타드
}

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        surface: AppColors.surface,
        background: AppColors.bg,
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
          backgroundColor: AppColors.bg,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          shadowColor: Colors.transparent,
          side: const BorderSide(color: Color(0xFFCCCCCC), width: 1.2),
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
        fillColor: Colors.white.withOpacity(0.7),
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
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
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

// 노란 배경 웜 그라디언트 페인터 (캘린더 화면 스타일)
class AuroraPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..blendMode = BlendMode.srcOver;

    // 중앙 밝은 옐로 하이라이트
    final centerGlow = RadialGradient(
      center: Alignment.topCenter,
      radius: 1.4,
      colors: [
        const Color(0xFFFFFF80).withOpacity(0.4),
        Colors.transparent,
      ],
    );
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      paint
        ..shader = centerGlow.createShader(
          Rect.fromLTWH(0, 0, size.width, size.height),
        ),
    );

    // 하단 머스타드 그라디언트
    final bottomWarm = RadialGradient(
      center: const Alignment(0, 1.2),
      radius: 1.0,
      colors: [
        const Color(0xFFE8C84A).withOpacity(0.25),
        Colors.transparent,
      ],
    );
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      paint
        ..shader = bottomWarm.createShader(
          Rect.fromLTWH(0, 0, size.width, size.height),
        ),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
