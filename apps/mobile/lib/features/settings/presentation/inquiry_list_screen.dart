import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';

// 문의 데이터 모델
class InquiryModel {
  final String id;
  final String title;
  final String content;
  final String status;
  final String? answer;
  final DateTime? answeredAt;
  final DateTime createdAt;
  final Map<String, dynamic>? company;

  InquiryModel({
    required this.id,
    required this.title,
    required this.content,
    required this.status,
    this.answer,
    this.answeredAt,
    required this.createdAt,
    this.company,
  });

  factory InquiryModel.fromJson(Map<String, dynamic> json) {
    return InquiryModel(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      status: json['status'] as String,
      answer: json['answer'] as String?,
      answeredAt: json['answeredAt'] != null ? DateTime.parse(json['answeredAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      company: json['company'] as Map<String, dynamic>?,
    );
  }
}

// Provider
final inquiryListProvider = FutureProvider.autoDispose<List<InquiryModel>>((ref) async {
  final client = ref.read(apiClientProvider);
  final res = await client.get<dynamic>('/api/inquiries');
  final list = (res['inquiries'] as List<dynamic>);
  return list.map((e) => InquiryModel.fromJson(e as Map<String, dynamic>)).toList();
});

class InquiryListScreen extends ConsumerWidget {
  const InquiryListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inquiryAsync = ref.watch(inquiryListProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => context.go('/settings'),
          child: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
        ),
        title: const Text('앱 이용문의',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        actions: [
          GestureDetector(
            onTap: () async {
              await context.push('/settings/inquiry/create');
              ref.invalidate(inquiryListProvider);
            },
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFF3E6872),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('문의하기',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ),
        ],
      ),
      body: inquiryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF3E6872))),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.textMuted, size: 48),
              const SizedBox(height: 12),
              Text('불러오기 실패: $err', style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(inquiryListProvider),
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
        data: (inquiries) => inquiries.isEmpty
            ? _buildEmpty(context, ref)
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                itemCount: inquiries.length,
                itemBuilder: (context, i) => _buildCard(context, inquiries[i]),
              ),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFF3E6872).withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF3E6872), size: 36),
          ),
          const SizedBox(height: 20),
          const Text('등록된 문의가 없습니다',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          const Text('궁금한 점이나 불편한 사항을\n문의해 주세요.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textMuted, height: 1.5)),
          const SizedBox(height: 28),
          ElevatedButton(
            onPressed: () async {
              await context.push('/settings/inquiry/create');
              ref.invalidate(inquiryListProvider);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3E6872),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text('문의하기', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(BuildContext context, InquiryModel inquiry) {
    final isAnswered = inquiry.status == 'answered';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 12, offset: const Offset(0, 3))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 상태 뱃지 + 날짜
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isAnswered ? const Color(0xFFDCFCE7) : const Color(0xFFFEF9C3),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  isAnswered ? '답변완료' : '답변 대기',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isAnswered ? const Color(0xFF166534) : const Color(0xFF92400E),
                  ),
                ),
              ),
              const Spacer(),
              Text(
                _formatDate(inquiry.createdAt),
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 제목
          Text(inquiry.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 6),

          // 내용 (2줄 제한)
          Text(inquiry.content,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5)),

          // 답변 영역
          if (inquiry.answer != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.support_agent_rounded, size: 14, color: Color(0xFF2563EB)),
                      const SizedBox(width: 4),
                      const Text('관리자 답변',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                      if (inquiry.answeredAt != null) ...[
                        const Spacer(),
                        Text(_formatDate(inquiry.answeredAt!),
                            style: const TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(inquiry.answer!,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF1D4ED8), height: 1.5)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')}';
  }
}
