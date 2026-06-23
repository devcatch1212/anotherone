import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  int _year = DateTime.now().year;
  int _month = DateTime.now().month;
  List<AttendanceRecord> _records = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) { setState(() => _loading = false); return; }
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/attendance',
        queryParameters: {'employmentId': emp.id, 'year': _year, 'month': _month},
      );
      final list = (res['records'] as List<dynamic>? ?? [])
          .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));
      setState(() { _records = list; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  void _prevMonth() {
    setState(() {
      if (_month == 1) { _month = 12; _year--; } else { _month--; }
    });
    _load();
  }

  void _nextMonth() {
    final now = DateTime.now();
    if (_year == now.year && _month == now.month) return;
    setState(() {
      if (_month == 12) { _month = 1; _year++; } else { _month++; }
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final totalDays = _records.where((r) => r.checkIn != null).length;
    final totalMins = _records.fold<int>(0, (s, r) => s + (r.workedMinutes ?? 0));
    final lateCount = _records.where((r) => r.status == AttendanceStatus.late).length;
    final absentCount = _records.where((r) => r.status == AttendanceStatus.absent).length;

    final statusMap = {
      AttendanceStatus.normal: (label: '정상', color: AppColors.accentDark, bg: AppColors.accentLight),
      AttendanceStatus.late: (label: '지각', color: const Color(0xFFD97706), bg: const Color(0xFFFFFBEB)),
      AttendanceStatus.absent: (label: '결근', color: const Color(0xFFDC2626), bg: const Color(0xFFFEF2F2)),
      AttendanceStatus.vacation: (label: '휴가', color: const Color(0xFF7C3AED), bg: const Color(0xFFF5F3FF)),
      AttendanceStatus.holiday: (label: '공휴일', color: AppColors.textMuted, bg: AppColors.bg),
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 헤더
            Container(
              color: Colors.white.withOpacity(0.65),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Column(
                children: [
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('출퇴근 기록',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(onPressed: _prevMonth, icon: const Icon(Icons.chevron_left_rounded)),
                      Text(
                        '$_year년 $_month월',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      IconButton(onPressed: _nextMonth, icon: const Icon(Icons.chevron_right_rounded)),
                    ],
                  ),
                ],
              ),
            ),
            // 요약 카드
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Row(
                children: [
                  _summaryCard('근무일수', '$totalDays일', AppColors.primary),
                  const SizedBox(width: 8),
                  _summaryCard('총 근무', '${totalMins ~/ 60}h ${totalMins % 60}m', AppColors.accentDark),
                  const SizedBox(width: 8),
                  _summaryCard('지각', '$lateCount회', const Color(0xFFD97706)),
                  const SizedBox(width: 8),
                  _summaryCard('결근', '$absentCount회', const Color(0xFFDC2626)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _records.isEmpty
                      ? const Center(child: Text('출퇴근 기록이 없습니다', style: TextStyle(color: AppColors.textMuted)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                          itemCount: _records.length,
                          itemBuilder: (_, i) {
                            final r = _records[i];
                            final s = statusMap[r.status] ?? statusMap[AttendanceStatus.normal]!;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.white.withOpacity(0.5)),
                              ),
                              child: Row(
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        DateFormat('M/d (E)', 'ko').format(DateTime.parse(r.date)),
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${r.checkIn != null ? _fmt(r.checkIn!) : '--:--'}${r.checkOut != null ? ' ~ ${_fmt(r.checkOut!)}' : r.checkIn != null ? ' ~ 근무 중' : ''}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                  const Spacer(),
                                  if (r.workedMinutes != null)
                                    Text(
                                      '${r.workedMinutes! ~/ 60}h ${r.workedMinutes! % 60}m',
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: s.bg, borderRadius: BorderRadius.circular(99)),
                                    child: Text(s.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: s.color)),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard(String label, String value, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.15)),
          ),
          child: Column(
            children: [
              Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
              Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
            ],
          ),
        ),
      );

  String _fmt(String iso) {
    try { return DateFormat('HH:mm').format(DateTime.parse(iso).toLocal()); } catch (_) { return '--:--'; }
  }
}
