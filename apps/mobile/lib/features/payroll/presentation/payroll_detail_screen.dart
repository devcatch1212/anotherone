import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/models/models.dart';

class PayrollDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const PayrollDetailScreen({super.key, required this.id});
  @override
  ConsumerState<PayrollDetailScreen> createState() => _PayrollDetailScreenState();
}

class _PayrollDetailScreenState extends ConsumerState<PayrollDetailScreen> {
  PayrollRecord? _record;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/api/payroll/${widget.id}');
      setState(() {
        _record = PayrollRecord.fromJson(res['payroll'] as Map<String, dynamic>? ?? res);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = parseApiError(e); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###', 'ko');
    final r = _record;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: AuroraPainter())),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
                      ),
                      Text(
                        r != null ? '${r.year}년 ${r.month}월 급여명세서' : '급여명세서',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _loading
                      ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                      : r == null
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.danger, size: 40),
                                  const SizedBox(height: 12),
                                  Text(
                                    _error ?? '데이터를 불러올 수 없습니다',
                                    style: const TextStyle(color: AppColors.textSecondary),
                                  ),
                                  const SizedBox(height: 16),
                                  TextButton(
                                    onPressed: _load,
                                    child: const Text('다시 시도', style: TextStyle(color: AppColors.primary)),
                                  ),
                                ],
                              ),
                            )
                          : SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  // 실수령액 강조
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(24),
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                                    ),
                                    child: Column(
                                      children: [
                                        Text('${r.year}년 ${r.month}월 실수령액',
                                            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13, fontWeight: FontWeight.w500)),
                                        const SizedBox(height: 8),
                                        Text('${fmt.format(r.netPay)}원',
                                            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                                        const SizedBox(height: 4),
                                        Text('근무 ${r.workedDays}일',
                                            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  // 지급 항목
                                  _section('지급 항목', [
                                    _row(fmt, '기본급', r.basePay),
                                    if (r.holidayPay > 0) _row(fmt, '휴일수당', r.holidayPay),
                                    if (r.overtimePay > 0) _row(fmt, '연장수당', r.overtimePay),
                                    if (r.nightPay > 0) _row(fmt, '야간수당', r.nightPay),
                                    _divider(),
                                    _row(fmt, '세전 합계', r.totalGross, bold: true),
                                  ]),
                                  const SizedBox(height: 12),
                                  // 공제 항목
                                  _section('공제 항목', [
                                    if (r.nationalPension > 0) _row(fmt, '국민연금', r.nationalPension),
                                    if (r.healthInsurance > 0) _row(fmt, '건강보험', r.healthInsurance),
                                    if (r.employmentInsurance > 0) _row(fmt, '고용보험', r.employmentInsurance),
                                    if (r.incomeTax > 0) _row(fmt, '소득세', r.incomeTax),
                                    _divider(),
                                    _row(fmt, '총 공제', r.totalDeduction, bold: true, color: AppColors.danger),
                                  ]),
                                ],
                              ),
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      );

  Widget _row(NumberFormat fmt, String label, double value, {bool bold = false, Color? color}) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: bold ? AppColors.textPrimary : AppColors.textSecondary, fontWeight: bold ? FontWeight.w700 : FontWeight.w500)),
            Text('${fmt.format(value)}원', style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: color ?? (bold ? AppColors.textPrimary : AppColors.textSecondary))),
          ],
        ),
      );

  Widget _divider() => const Padding(
    padding: EdgeInsets.symmetric(vertical: 4),
    child: Divider(color: AppColors.border, height: 1),
  );
}
