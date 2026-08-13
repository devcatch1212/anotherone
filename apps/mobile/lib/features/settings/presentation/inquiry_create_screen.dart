import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';

class InquiryCreateScreen extends ConsumerStatefulWidget {
  const InquiryCreateScreen({super.key});

  @override
  ConsumerState<InquiryCreateScreen> createState() => _InquiryCreateScreenState();
}

class _InquiryCreateScreenState extends ConsumerState<InquiryCreateScreen> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();

    if (title.isEmpty) {
      _showSnackBar('제목을 입력해 주세요.');
      return;
    }
    if (content.isEmpty) {
      _showSnackBar('내용을 입력해 주세요.');
      return;
    }
    if (content.length < 10) {
      _showSnackBar('내용을 10자 이상 입력해 주세요.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final auth = ref.read(authProvider).value;
      final employments = auth?.user?.employments ?? [];
      final companyId = employments.isNotEmpty ? employments.first.company.id : null;

      final client = ref.read(apiClientProvider);
      await client.post<dynamic>('/api/inquiries', data: {
        'title': title,
        'content': content,
        if (companyId != null) 'companyId': companyId,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('문의가 등록되었습니다. 빠른 시일 내에 답변드리겠습니다.'),
            backgroundColor: Color(0xFF3E6872),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('문의 등록에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final contentLength = _contentController.text.length;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => context.pop(),
          child: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
        ),
        title: const Text('문의 작성',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 안내 배너
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3E6872).withOpacity(0.07),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline_rounded, color: Color(0xFF3E6872), size: 18),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              '문의하신 내용은 관리자가 확인 후 답변드립니다.\n답변은 이 화면에서 확인하실 수 있습니다.',
                              style: TextStyle(fontSize: 13, color: Color(0xFF3E6872), height: 1.5),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 제목 입력
                    const Text('제목', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _titleController,
                      maxLength: 100,
                      decoration: InputDecoration(
                        hintText: '문의 제목을 입력해 주세요',
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                        counterStyle: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 내용 입력
                    const Text('문의 내용', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _contentController,
                      maxLines: 9,
                      maxLength: 2000,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: '앱 사용 중 불편한 점이나 건의 사항을\n자세히 작성해 주세요. (10자 이상)',
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14, height: 1.6),
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                        counterStyle: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 하단 제출 버튼
            Container(
              padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).padding.bottom + 16),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_isSubmitting || contentLength < 10) ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3E6872),
                    disabledBackgroundColor: AppColors.bg,
                    foregroundColor: Colors.white,
                    disabledForegroundColor: AppColors.textMuted,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('문의 등록',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
