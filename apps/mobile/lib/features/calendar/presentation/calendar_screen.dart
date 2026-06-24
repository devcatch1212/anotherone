import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});
  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<String, AttendanceRecord> _recordMap = {};
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _load(_focusedDay);
  }

  Future<void> _load(DateTime month) async {
    setState(() => _loading = true);
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) { setState(() => _loading = false); return; }
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/attendance',
        queryParameters: {'employmentId': emp.id, 'year': month.year, 'month': month.month},
      );
      final list = (res['records'] as List<dynamic>? ?? [])
          .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>));
      final map = {for (final r in list) r.date: r};
      setState(() { _recordMap = map; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Color _dotColor(AttendanceStatus s) {
    switch (s) {
      case AttendanceStatus.normal: return AppColors.accentDark;
      case AttendanceStatus.late: return const Color(0xFFD97706);
      case AttendanceStatus.absent: return AppColors.danger;
      case AttendanceStatus.vacation: return const Color(0xFF7C3AED);
      case AttendanceStatus.holiday: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedKey = _selectedDay != null
        ? DateFormat('yyyy-MM-dd').format(_selectedDay!)
        : null;
    final selectedRecord = selectedKey != null ? _recordMap[selectedKey] : null;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              color: Colors.white.withOpacity(0.65),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
              child: Row(
                children: [
                  const Text('근무 캘린더',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const SizedBox(width: 8),
                  if (_loading)
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    Container(
                      color: Colors.white.withOpacity(0.65),
                      child: TableCalendar<AttendanceRecord>(
                        locale: 'ko_KR',
                        firstDay: DateTime(2020),
                        lastDay: DateTime(2030),
                        focusedDay: _focusedDay,
                        selectedDayPredicate: (d) => isSameDay(_selectedDay, d),
                        calendarFormat: CalendarFormat.month,
                        headerStyle: const HeaderStyle(
                          formatButtonVisible: false,
                          titleCentered: true,
                          titleTextStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        calendarStyle: CalendarStyle(
                          todayDecoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.15),
                            shape: BoxShape.circle,
                          ),
                          todayTextStyle: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                          selectedDecoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                          selectedTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                        eventLoader: (day) {
                          final key = DateFormat('yyyy-MM-dd').format(day);
                          final r = _recordMap[key];
                          return r != null ? [r] : [];
                        },
                        calendarBuilders: CalendarBuilders(
                          markerBuilder: (ctx, day, events) {
                            if (events.isEmpty) return null;
                            final r = events.first;
                            return Positioned(
                              bottom: 4,
                              child: Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _dotColor(r.status),
                                ),
                              ),
                            );
                          },
                        ),
                        onDaySelected: (selected, focused) {
                          setState(() {
                            _selectedDay = selected;
                            _focusedDay = focused;
                          });
                        },
                        onPageChanged: (focused) {
                          _focusedDay = focused;
                          _load(focused);
                        },
                      ),
                    ),
                    // 선택 날짜 상세
                    if (_selectedDay != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.7),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withOpacity(0.5)),
                          ),
                          child: selectedRecord == null
                              ? Column(
                                  children: [
                                    Text(
                                      DateFormat('M월 d일 (E)', 'ko').format(_selectedDay!),
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text('기록 없음', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                                  ],
                                )
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      DateFormat('M월 d일 (E)', 'ko').format(_selectedDay!),
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 12),
                                    _detailRow('출근', selectedRecord.checkIn != null ? _fmt(selectedRecord.checkIn!) : '-'),
                                    _detailRow('퇴근', selectedRecord.checkOut != null ? _fmt(selectedRecord.checkOut!) : selectedRecord.checkIn != null ? '근무 중' : '-'),
                                    if (selectedRecord.workedMinutes != null)
                                      _detailRow('근무시간', '${selectedRecord.workedMinutes! ~/ 60}시간 ${selectedRecord.workedMinutes! % 60}분'),
                                    _detailRow('상태', {
                                      AttendanceStatus.normal: '정상',
                                      AttendanceStatus.late: '지각',
                                      AttendanceStatus.absent: '결근',
                                      AttendanceStatus.vacation: '휴가',
                                      AttendanceStatus.holiday: '공휴일',
                                    }[selectedRecord.status] ?? '정상'),
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

  Widget _detailRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            SizedBox(
              width: 60,
              child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
            ),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          ],
        ),
      );

  String _fmt(String iso) {
    try { return DateFormat('HH:mm').format(DateTime.parse(iso).toLocal()); } catch (_) { return '--:--'; }
  }
}
