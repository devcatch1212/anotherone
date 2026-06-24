import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});
  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  List<LeaveRecord> _records = [];
  double _remaining = 0;
  double _total = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) { setState(() => _loading = false); return; }

    final weeklyWorkHours = emp.effectiveWeeklyWorkDays * emp.dailyWorkHours;
    double totalDays = 0;
    if (weeklyWorkHours >= 40) totalDays = 15;
    else if (weeklyWorkHours >= 15) totalDays = (15 * weeklyWorkHours / 40 * 10).round() / 10;

    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/leave',
        queryParameters: {'employmentId': emp.id},
      );
      final list = (res['records'] as List<dynamic>? ?? [])
          .map((e) => LeaveRecord.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.appliedAt.compareTo(a.appliedAt));
      final used = list
          .where((l) => l.status == LeaveStatus.approved && (l.type == LeaveType.annual || l.type == LeaveType.half))
          .fold<double>(0, (s, l) => s + l.days);
      setState(() {
        _records = list;
        _total = totalDays;
        _remaining = (totalDays - used).clamp(0, double.infinity);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = parseApiError(e); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusStyle = {
      LeaveStatus.pending: (label: '대기', color: AppColors.warning, bg: AppColors.warningLight),
      LeaveStatus.approved: (label: '승인', color: AppColors.success, bg: AppColors.successLight),
      LeaveStatus.rejected: (label: '반려', color: AppColors.danger, bg: AppColors.dangerLight),
    };
    final typeLabel = {
      LeaveType.annual: '연차',
      LeaveType.half: '반차',
      LeaveType.sick: '병가',
      LeaveType.official: '공가',
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              color: Colors.white.withOpacity(0.65),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('휴가 관리',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  GestureDetector(
                    onTap: () => context.go('/leave/apply'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.primary, AppColors.info]),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('신청하기', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
                              const SizedBox(height: 12),
                              Text(_error!, style: const TextStyle(color: AppColors.textSecondary)),
                              const SizedBox(height: 16),
                              TextButton(
                                onPressed: _load,
                                child: const Text('다시 시도', style: TextStyle(color: AppColors.primary)),
                              ),
                            ],
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                          child: Column(
                            children: [
                          // 연차 현황 카드
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 16, offset: const Offset(0, 6))],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('남은 연차', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.baseline,
                                        textBaseline: TextBaseline.alphabetic,
                                        children: [
                                          Text('$_remaining', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800)),
                                          const SizedBox(width: 4),
                                          Text('일 / $_total일', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.beach_access_rounded, color: Colors.white, size: 48),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text('신청 내역', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                          ),
                          const SizedBox(height: 10),
                          if (_records.isEmpty)
                            const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('휴가 신청 내역이 없습니다', style: TextStyle(color: AppColors.textMuted))))
                          else
                            ...(_records.map((r) {
                              final s = statusStyle[r.status] ?? statusStyle[LeaveStatus.pending]!;
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
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(typeLabel[r.type] ?? '연차',
                                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                              const SizedBox(width: 6),
                                              Text('${r.days}일',
                                                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                                            ],
                                          ),
                                          Text(
                                            '${r.startDate} ~ ${r.endDate}',
                                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                          ),
                                          if (r.reason.isNotEmpty)
                                            Text(r.reason, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(color: s.bg, borderRadius: BorderRadius.circular(99)),
                                      child: Text(s.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: s.color)),
                                    ),
                                  ],
                                ),
                              );
                            }).toList()),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
