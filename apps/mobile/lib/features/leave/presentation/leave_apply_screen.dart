import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class LeaveApplyScreen extends ConsumerStatefulWidget {
  const LeaveApplyScreen({super.key});
  @override
  ConsumerState<LeaveApplyScreen> createState() => _LeaveApplyScreenState();
}

class _LeaveApplyScreenState extends ConsumerState<LeaveApplyScreen> {
  LeaveType _type = LeaveType.annual;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  final _reasonCtrl = TextEditingController();
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
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
      if (isStart) {
        _startDate = picked;
        if (_endDate.isBefore(_startDate) || _type == LeaveType.half) {
          _endDate = _startDate;
        }
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (_reasonCtrl.text.trim().isEmpty) {
      setState(() => _error = '사유를 입력해주세요');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    final emp = ref.read(authProvider).value?.currentEmployment;
    if (emp == null) { setState(() => _loading = false); return; }

    final typeStr = {
      LeaveType.annual: 'annual',
      LeaveType.half: 'half',
      LeaveType.sick: 'sick',
      LeaveType.official: 'official',
    }[_type];

    try {
      await ref.read(apiClientProvider).post<dynamic>(
        '/api/leave',
        data: {
          'employmentId': emp.id,
          'type': typeStr,
          'startDate': DateFormat('yyyy-MM-dd').format(_startDate),
          'endDate': DateFormat('yyyy-MM-dd').format(_endDate),
          'reason': _reasonCtrl.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('휴가 신청이 완료되었습니다', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
        Navigator.pop(context);
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
    final diffDays = _type == LeaveType.half
        ? 0.5
        : _endDate.difference(_startDate).inDays + 1.0;
    final typeLabel = {
      LeaveType.annual: '연차',
      LeaveType.half: '반차',
      LeaveType.sick: '병가',
      LeaveType.official: '공가',
    };

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
                      const Text('휴가 신청', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('휴가 유형', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          children: LeaveType.values.map((t) {
                            final isSelected = _type == t;
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _type = t;
                                  if (_type == LeaveType.half) {
                                    _endDate = _startDate;
                                  }
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.primary : Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
                                ),
                                child: Text(
                                  typeLabel[t]!,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isSelected ? Colors.white : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),
                        const Text('기간', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => _pickDate(true),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('시작일', style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Text(fmt.format(_startDate), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Text('~', style: TextStyle(color: AppColors.textMuted)),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: _type == LeaveType.half ? null : () => _pickDate(false),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: _type == LeaveType.half ? AppColors.bg : Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('종료일', style: TextStyle(fontSize: 11, color: _type == LeaveType.half ? AppColors.textMuted.withOpacity(0.5) : AppColors.textMuted, fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Text(fmt.format(_endDate), style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _type == LeaveType.half ? AppColors.textMuted : AppColors.textPrimary)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('총 $diffDays일', style: const TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 20),
                        const Text('사유', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _reasonCtrl,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: '휴가 사유를 입력해주세요',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                          ),
                        ),
                        if (_error.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: AppColors.dangerLight, borderRadius: BorderRadius.circular(10)),
                            child: Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                          ),
                        ],
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [AppColors.primary, AppColors.info]),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))],
                            ),
                            child: ElevatedButton(
                              onPressed: _loading ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent, shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              child: _loading
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('신청하기', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
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
        ],
      ),
    );
  }
}
