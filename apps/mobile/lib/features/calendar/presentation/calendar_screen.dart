import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
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

  // 상태별 이모지 및 색상 매핑 테마
  ({Color bg, Color text, String icon, String label}) _statusTheme(AttendanceRecord r) {
    final isOvertime = (r.workedMinutes ?? 0) > 480; // 8시간 초과 시 연장
    if (isOvertime) {
      return (
        bg: const Color(0xFFFFE0DE), // 파스텔 핑크
        text: const Color(0xFFFF3B30),
        icon: '😤',
        label: '연장',
      );
    }
    switch (r.status) {
      case AttendanceStatus.normal:
        return (
          bg: const Color(0xFFD1F2D9), // 파스텔 그린
          text: const Color(0xFF3E6872),
          icon: '😊',
          label: '정상',
        );
      case AttendanceStatus.late:
        return (
          bg: const Color(0xFFFFE0DE),
          text: const Color(0xFFFF9500),
          icon: '😤',
          label: '지각',
        );
      case AttendanceStatus.absent:
        return (
          bg: const Color(0xFFE0F4FD), // 파스텔 블루
          text: const Color(0xFF007AFF),
          icon: '😢',
          label: '결근',
        );
      case AttendanceStatus.vacation:
        return (
          bg: const Color(0xFFECEDF9), // 파스텔 퍼플
          text: const Color(0xFF5856D6),
          icon: '😌',
          label: '휴가',
        );
      case AttendanceStatus.holiday:
        return (
          bg: AppColors.bg,
          text: AppColors.textMuted,
          icon: '😌',
          label: '공휴일',
        );
    }
  }

  // 월별 예상 급여 합산 계산 (월급제/일급제 대응 패치)
  double _calculateEstimatedPay() {
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) return 0;
    
    double total = 0;
    for (final r in _recordMap.values) {
      if (emp.wageType == 'monthly' || emp.wageType == 'daily') {
        // 월급제나 일급제는 이미 계산된 하루치 정산 금액(earnedPay)을 누적
        total += (r.earnedPay ?? 0).toDouble();
      } else {
        // 시급제 등은 근무시간 * 시급으로 누적
        final workedHours = (r.workedMinutes ?? 0) / 60.0;
        total += workedHours * (emp.hourlyWage ?? 0.0);
      }
    }
    return total;
  }

  // 입사 D+Day 계산 (가장 빠른 출퇴근 기록일 기준 연산)
  int _getDDay() {
    if (_recordMap.isEmpty) return 1;
    try {
      final dates = _recordMap.keys.map((k) => DateTime.parse(k)).toList()
        ..sort((a, b) => a.compareTo(b));
      final earliest = dates.first;
      final diff = DateTime.now().difference(earliest).inDays;
      return diff >= 0 ? diff + 1 : 1;
    } catch (_) {
      return 12; // fallback
    }
  }

  @override
  Widget build(BuildContext context) {
    final emp = ref.watch(authProvider).value?.currentEmployment;
    final fmt = NumberFormat('#,###', 'ko');
    final dDay = _getDDay();
    final estimatedPay = _calculateEstimatedPay();

    // 이번 달 기록들을 날짜 순으로 정렬해서 리스트로 추출
    final sortedRecords = _recordMap.values.toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    return Scaffold(
      backgroundColor: const Color(0xFFEEF2F2),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 상단 네비바 (테두리/투명도 제거)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    onPressed: () => GoRouter.of(context).go('/'),
                    icon: const Icon(Icons.arrow_back_ios_rounded, size: 20, color: Color(0xFF3E6872)),
                  ),
                  Row(
                    children: [
                      if (_loading)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3E6872)),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _load(_focusedDay),
                color: const Color(0xFF3E6872),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 회사 정보 및 D-Day
                    if (emp != null) ...[
                      Row(
                        children: [
                          Text(
                            emp.company.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF3E6872),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF3E6872),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(
                              'D+$dDay',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],

                    // 급여 요약 영역 (이전/다음 달 이동 내포)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                GestureDetector(
                                  onTap: () {
                                    final prev = DateTime(_focusedDay.year, _focusedDay.month - 1);
                                    setState(() { _focusedDay = prev; });
                                    _load(prev);
                                  },
                                  child: const Icon(Icons.chevron_left_rounded, size: 20, color: AppColors.textMuted),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${_focusedDay.month}월',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                GestureDetector(
                                  onTap: () {
                                    final next = DateTime(_focusedDay.year, _focusedDay.month + 1);
                                    setState(() { _focusedDay = next; });
                                    _load(next);
                                  },
                                  child: const Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${fmt.format(estimatedPay.round())}원',
                              style: const TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF3E6872),
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_focusedDay.month}/1일부터 어제까지의 급여예요.',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        // 급여명세서 바로가기 버튼
                        OutlinedButton(
                          onPressed: () => GoRouter.of(context).go('/payroll'),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF3E6872), width: 1.0),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            backgroundColor: const Color(0xFFEEF2F2),
                            foregroundColor: const Color(0xFF3E6872),
                          ),
                          child: const Text(
                            '급여명세서',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // 달력 카드 (배경 EEF2F2, 테두리 제거)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: TableCalendar<AttendanceRecord>(
                        locale: 'ko_KR',
                        firstDay: DateTime(2020),
                        lastDay: DateTime(2030),
                        focusedDay: _focusedDay,
                        selectedDayPredicate: (d) => isSameDay(_selectedDay, d),
                        calendarFormat: CalendarFormat.month,
                        rowHeight: 48,
                        headerVisible: false, // 헤더 숨기기는 TableCalendar 인자로 이동
                        daysOfWeekStyle: const DaysOfWeekStyle(
                          weekdayStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                          weekendStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                        ),
                        calendarStyle: CalendarStyle(
                          todayDecoration: BoxDecoration(
                            color: Colors.transparent,
                            border: Border.all(color: AppColors.textPrimary, width: 1.0),
                            shape: BoxShape.circle,
                          ),
                          todayTextStyle: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13),
                          selectedDecoration: const BoxDecoration(
                            color: Color(0xFF2C2C2E),
                            shape: BoxShape.circle,
                          ),
                          selectedTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                          outsideDaysVisible: false,
                        ),
                        eventLoader: (day) {
                          final key = DateFormat('yyyy-MM-dd').format(day);
                          final r = _recordMap[key];
                          return r != null ? [r] : [];
                        },
                        calendarBuilders: CalendarBuilders(
                          // 이모지 대신 상태별 색상 원 + 날짜 숫자로 결합 표시
                          defaultBuilder: (context, day, focusedDay) {
                            final key = DateFormat('yyyy-MM-dd').format(day);
                            final r = _recordMap[key];
                            if (r != null) {
                              final th = _statusTheme(r);
                              return Center(
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: th.bg,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${day.day}',
                                      style: TextStyle(
                                        color: th.text,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }
                            return null;
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
                    const SizedBox(height: 20),

                    // 하단 근무 내역 리스트 (레퍼런스 형태의 직관적인 디자인)
                    const Text(
                      '근무 기록',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (sortedRecords.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Center(
                          child: Text(
                            '이번 달 근무 내역이 없습니다',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: sortedRecords.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final r = sortedRecords[i];
                          final th = _statusTheme(r);
                          final dailyWage = (emp?.wageType == 'monthly' || emp?.wageType == 'daily')
                              ? (r.earnedPay ?? 0)
                              : ((r.workedMinutes ?? 0) / 60 * (emp?.hourlyWage ?? 0)).round();

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                // 좌측 원형 상태 텍스트 뱃지 (이모지 걷어내고 심플하게)
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: th.bg,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      th.label,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: th.text,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                // 날짜 및 시간
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        DateFormat('d일 E요일', 'ko')
                                            .format(DateTime.parse(r.date)),
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${r.checkIn != null ? _fmt(r.checkIn!) : '--:--'} ~ ${r.checkOut != null ? _fmt(r.checkOut!) : '근무 중'}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // 급여
                                Text(
                                  '+${fmt.format(dailyWage)}원',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF3E6872),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
          ),
          ],
        ),
      ),
    );
  }

  String _fmt(String iso) {
    try {
      return DateFormat('HH:mm').format(DateTime.parse(iso).toLocal());
    } catch (_) {
      return '--:--';
    }
  }
}
