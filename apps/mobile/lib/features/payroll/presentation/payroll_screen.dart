import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class PayrollScreen extends ConsumerStatefulWidget {
  const PayrollScreen({super.key});
  @override
  ConsumerState<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends ConsumerState<PayrollScreen> {
  List<PayrollRecord> _records = [];
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
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/payroll',
        queryParameters: {'employmentId': emp.id},
      );
      final list = (res['payrolls'] as List<dynamic>? ?? res['records'] as List<dynamic>? ?? [])
          .map((e) => PayrollRecord.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) {
          final aDate = a.year * 100 + a.month;
          final bDate = b.year * 100 + b.month;
          return bDate.compareTo(aDate);
        });
      setState(() { _records = list; _loading = false; _error = null; });
    } catch (e) {
      debugPrint('▶ [Payroll Load Error] : $e');
      if (e is DioException) {
        debugPrint('▶ [Payroll Load Error Response] : ${e.response?.data}');
      }
      if (mounted) setState(() { _loading = false; _error = parseApiError(e); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ko');

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              color: Colors.white.withOpacity(0.65),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: const Align(
                alignment: Alignment.centerLeft,
                child: Text('급여명세서',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
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
                      : _records.isEmpty
                          ? const Center(child: Text('급여 내역이 없습니다', style: TextStyle(color: AppColors.textMuted)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                          itemCount: _records.length,
                          itemBuilder: (_, i) {
                            final r = _records[i];
                            return GestureDetector(
                              onTap: () => context.go('/payroll/${r.id}'),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.7),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.white.withOpacity(0.5)),
                                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3))],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(colors: [AppColors.primary, AppColors.info]),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(Icons.payments_rounded, color: Colors.white, size: 22),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('${r.year}년 ${r.month}월',
                                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                          Text('근무 ${r.workedDays}일',
                                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('${fmt.format(r.netPay)}원',
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: r.confirmed ? AppColors.successLight : AppColors.warningLight,
                                            borderRadius: BorderRadius.circular(99),
                                          ),
                                          child: Text(
                                            r.confirmed ? '확정' : '미확정',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: r.confirmed ? AppColors.success : AppColors.warning,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
                                  ],
                                ),
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
}
