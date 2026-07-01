import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';

class LegalDetailScreen extends ConsumerStatefulWidget {
  final String type; // 'terms' | 'privacy'
  const LegalDetailScreen({super.key, required this.type});

  @override
  ConsumerState<LegalDetailScreen> createState() => _LegalDetailScreenState();
}

class _LegalDetailScreenState extends ConsumerState<LegalDetailScreen> {
  bool _loading = true;
  String _content = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/api/legal/${widget.type}',
      );
      setState(() {
        _content = res['content'] as String? ?? '내용이 존재하지 않습니다.';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = parseApiError(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.type == 'privacy' ? '개인정보처리방침' : '서비스 이용약관';

    return Scaffold(
      backgroundColor: const Color(0xFFEEF2F2), // 캘린더/설정과 동일하게 EEF2F2 배경
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 상단 네비게이션 헤더
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => GoRouter.of(context).go('/settings'),
                    icon: const Icon(Icons.arrow_back_ios_rounded, size: 20, color: Color(0xFF3E6872)),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF3E6872),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3E6872)),
                      ),
                    )
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_rounded, color: Color(0xFFFF3B30), size: 40),
                              const SizedBox(height: 12),
                              Text(
                                _error!,
                                style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _load,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF3E6872),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('다시 시도'),
                              ),
                            ],
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.8), // 50~80% 투명 흰색으로 뽀얀 효과
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.01),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Text(
                              _content,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.6,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w500,
                              ),
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
