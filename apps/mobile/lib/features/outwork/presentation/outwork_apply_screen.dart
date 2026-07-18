import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class OutworkApplyScreen extends ConsumerStatefulWidget {
  const OutworkApplyScreen({super.key});
  @override
  ConsumerState<OutworkApplyScreen> createState() => _OutworkApplyScreenState();
}

class _OutworkApplyScreenState extends ConsumerState<OutworkApplyScreen> {
  OutworkType _type = OutworkType.outside;
  DateTime _date = DateTime.now();
  final _reasonCtrl = TextEditingController();
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked == null) return;
    setState(() {
      _date = picked;
    });
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) {
      setState(() => _loading = false);
      return;
    }

    final typeStr = _type == OutworkType.outside ? 'outside' : 'trip';

    try {
      await ref.read(apiClientProvider).post<dynamic>(
        '/api/outwork?employmentId=${emp.id}',
        data: {
          'date': DateFormat('yyyy-MM-dd').format(_date),
          'type': typeStr,
          'reason': _reasonCtrl.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('외근/출장 신청이 완료되었습니다', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
        context.go('/outwork');
      }
    } catch (e) {
      setState(() => _error = parseApiError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('yyyy년 M월 d일 (E)', 'ko');

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        context.go('/outwork');
      },
      child: Scaffold(
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
                          onPressed: () => context.go('/outwork'),
                          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
                        ),
                        const Text('외근/출장 신청', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('신청 구분', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _typeButton(OutworkType.outside, '외근'),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _typeButton(OutworkType.trip, '출장'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          const Text('신청 일자', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                          const SizedBox(height: 10),
                          GestureDetector(
                            onTap: _pickDate,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.textMuted),
                                  const SizedBox(width: 10),
                                  Text(
                                    fmt.format(_date),
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                  ),
                                  const Spacer(),
                                  const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMuted),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          const Text('업무 내용 / 사유', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _reasonCtrl,
                            maxLines: 4,
                            maxLength: 100,
                            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                            decoration: InputDecoration(
                              hintText: '외근 또는 출장지에서의 업무 내용을 상세히 적어주세요.',
                              hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                              fillColor: AppColors.surface,
                              filled: true,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.all(16),
                            ),
                          ),
                          if (_error.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Text(
                              _error,
                              style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                          const SizedBox(height: 32),
                          ElevatedButton(
                            onPressed: _loading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3E6872),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 52),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 0,
                            ),
                            child: _loading
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('신청 완료', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _typeButton(OutworkType type, String label) {
    final isSelected = _type == type;
    return GestureDetector(
      onTap: () => setState(() => _type = type),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF3E6872) : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
