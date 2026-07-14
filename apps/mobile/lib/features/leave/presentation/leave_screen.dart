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
    if (totalDays <= 0) {
      totalDays = emp.annualLeaveBalance > 15 ? emp.annualLeaveBalance : 15.0;
    }

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
        _remaining = emp.annualLeaveBalance;
        _total = _remaining + used > totalDays ? _remaining + used : totalDays;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = parseApiError(e); });
    }
  }

  Future<void> _cancelLeave(String leaveId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('휴가 취소', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        content: const Text('해당 휴가 신청을 취소하시겠습니까?', style: TextStyle(fontSize: 14)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('닫기', style: TextStyle(color: AppColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('취소', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await ref.read(apiClientProvider).delete<dynamic>('/api/leave/$leaveId');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('휴가 신청이 취소되었습니다', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            backgroundColor: AppColors.textSecondary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(parseApiError(e), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusStyle = {
      LeaveStatus.pending: (label: '대기', color: AppColors.warning, bg: AppColors.warningLight),
      LeaveStatus.approved: (label: '승인', color: AppColors.success, bg: AppColors.successLight),
      LeaveStatus.rejected: (label: '반려', color: AppColors.danger, bg: AppColors.dangerLight),
      LeaveStatus.cancelled: (label: '취소', color: AppColors.textMuted, bg: const Color(0xFFF0F0F0)),
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
                        color: const Color(0xFFEEF2F2),
                        border: Border.all(color: const Color(0xFF3E6872), width: 1.0),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('신청하기', style: TextStyle(color: Color(0xFF3E6872), fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF3E6872)))
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
                                child: const Text('다시 시도', style: TextStyle(color: Color(0xFF3E6872))),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: const Color(0xFF3E6872),
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                          child: Column(
                            children: [
                          // 연차 현황 카드
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('남은 연차', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.baseline,
                                        textBaseline: TextBaseline.alphabetic,
                                        children: [
                                          Text('$_remaining', style: const TextStyle(color: Color(0xFF3E6872), fontSize: 36, fontWeight: FontWeight.w800)),
                                          const SizedBox(width: 4),
                                          const Text('일', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
                                          const SizedBox(width: 6),
                                          Text('/ $_total일', style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.beach_access_rounded, color: Color(0xFF3E6872), size: 44),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text('신청 내역', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                          ),
                          const SizedBox(height: 10),
                          if (_records.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF3E6872).withOpacity(0.08),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.beach_access_rounded,
                                      size: 28,
                                      color: Color(0xFF3E6872),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    '아직 신청한 휴가 내역이 없습니다',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    '우측 상단의 신청하기 버튼을 통해 휴가를 신청할 수 있습니다.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textMuted,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            )
                          else
                            ...(_records.map((r) {
                              final s = statusStyle[r.status] ?? statusStyle[LeaveStatus.pending]!;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
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
                                    if (r.status == LeaveStatus.pending) ...[
                                      const SizedBox(height: 10),
                                      const Divider(height: 1, color: AppColors.border),
                                      const SizedBox(height: 8),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: GestureDetector(
                                          onTap: () => _cancelLeave(r.id),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: AppColors.dangerLight,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: const Text('신청 취소', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.danger)),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              );
                            }).toList()),
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
}
