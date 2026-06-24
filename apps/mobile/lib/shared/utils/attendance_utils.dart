import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../models/models.dart';

class AttendanceStatusStyle {
  final String label;
  final Color color;
  final Color bg;

  const AttendanceStatusStyle({
    required this.label,
    required this.color,
    required this.bg,
  });
}

abstract class AttendanceUtils {
  static const Map<AttendanceStatus, AttendanceStatusStyle> statusMap = {
    AttendanceStatus.normal: AttendanceStatusStyle(
      label: '정상',
      color: AppColors.accentDark,
      bg: AppColors.accentLight,
    ),
    AttendanceStatus.late: AttendanceStatusStyle(
      label: '지각',
      color: Color(0xFFD97706),
      bg: Color(0xFFFFFBEB),
    ),
    AttendanceStatus.absent: AttendanceStatusStyle(
      label: '결근',
      color: Color(0xFFDC2626),
      bg: Color(0xFFFEF2F2),
    ),
    AttendanceStatus.vacation: AttendanceStatusStyle(
      label: '휴가',
      color: Color(0xFF7C3AED),
      bg: Color(0xFFF5F3FF),
    ),
    AttendanceStatus.holiday: AttendanceStatusStyle(
      label: '공휴일',
      color: AppColors.textMuted,
      bg: AppColors.bg,
    ),
  };

  static AttendanceStatusStyle getStyle(AttendanceStatus status) {
    return statusMap[status] ?? statusMap[AttendanceStatus.normal]!;
  }
}
