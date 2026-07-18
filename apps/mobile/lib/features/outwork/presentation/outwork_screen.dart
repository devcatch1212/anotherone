import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class OutworkScreen extends ConsumerStatefulWidget {
  const OutworkScreen({super.key});
  @override
  ConsumerState<OutworkScreen> createState() => _OutworkScreenState();
}

class _OutworkScreenState extends ConsumerState<OutworkScreen> {
  List<OutworkRequest> _records = [];
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
    if (emp == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/outwork',
        queryParameters: {'employmentId': emp.id},
      );
      final list = (res['records'] as List<dynamic>? ?? [])
          .map((e) => OutworkRequest.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));

      setState(() {
        _records = list;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = parseApiError(e);
        });
      }
    }
  }

  Future<void> _cancelRequest(String requestId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('신청 취소', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        content: const Text('해당 외근/출장 신청을 취소하시겠습니까?', style: TextStyle(fontSize: 14)),
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
      await ref.read(apiClientProvider).delete<dynamic>('/api/outwork/$requestId');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('외근/출장 신청이 취소되었습니다', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
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
      OutworkStatus.pending: (label: '대기', color: AppColors.warning, bg: AppColors.warningLight),
      OutworkStatus.approved: (label: '승인', color: AppColors.success, bg: AppColors.successLight),
      OutworkStatus.rejected: (label: '반려', color: AppColors.danger, bg: AppColors.dangerLight),
    };
    final typeLabel = {
      OutworkType.outside: '외근',
      OutworkType.trip: '출장',
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
                  const Text('외근/출장 관리',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  GestureDetector(
                    onTap: () => context.go('/outwork/apply'),
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
                          child: _records.isEmpty
                              ? const Center(child: Text('외근/출장 신청 내역이 없습니다.', style: TextStyle(color: AppColors.textMuted)))
                              : ListView.builder(
                                  physics: const AlwaysScrollableScrollPhysics(),
                                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                                  itemCount: _records.length,
                                  itemBuilder: (context, index) {
                                    final record = _records[index];
                                    final style = statusStyle[record.status] ?? statusStyle[OutworkStatus.pending]!;
                                    final formattedDate = DateFormat('yyyy년 M월 d일 (E)', 'ko').format(DateTime.parse(record.date));

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(16),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.02),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                typeLabel[record.type] ?? '외근',
                                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: style.bg,
                                                  borderRadius: BorderRadius.circular(99),
                                                ),
                                                child: Text(
                                                  style.label,
                                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: style.color),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          Row(
                                            children: [
                                              const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textMuted),
                                              const SizedBox(width: 6),
                                              Text(formattedDate, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
                                            ],
                                          ),
                                          if (record.reason.isNotEmpty) ...[
                                            const SizedBox(height: 8),
                                            Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Icon(Icons.work_outline_rounded, size: 14, color: AppColors.textMuted),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    record.reason,
                                                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                          if (record.status == OutworkStatus.pending) ...[
                                            const Divider(height: 24, thickness: 0.5),
                                            Align(
                                              alignment: Alignment.centerRight,
                                              child: TextButton(
                                                onPressed: () => _cancelRequest(record.id),
                                                style: TextButton.styleFrom(
                                                  foregroundColor: AppColors.danger,
                                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                  minimumSize: Size.zero,
                                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                ),
                                                child: const Text('신청 취소', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
