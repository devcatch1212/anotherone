import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<AppNotification> _notifications = [];
  bool _loading = true;

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
        '/api/notifications',
        queryParameters: {'employmentId': emp.id},
      );
      final list = (res['notifications'] as List<dynamic>? ?? res['records'] as List<dynamic>? ?? [])
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      setState(() { _notifications = list; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _markRead(AppNotification n) async {
    if (n.read) return;
    try {
      await ref.read(apiClientProvider).patch<dynamic>('/api/notifications/${n.id}/read');
      setState(() {
        _notifications = _notifications.map((x) => x.id == n.id
            ? AppNotification(id: x.id, companyId: x.companyId, type: x.type, title: x.title, body: x.body, read: true, createdAt: x.createdAt)
            : x).toList();
      });
    } catch (_) {}
  }

  String _typeIcon(String type) {
    switch (type) {
      case 'overtime_approved': return '⏱️';
      case 'overtime_rejected': return '❌';
      case 'leave_approved': return '🌴';
      case 'leave_rejected': return '❌';
      case 'payroll_issued': return '💰';
      default: return '🔔';
    }
  }

  String _timeAgo(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return '방금 전';
      if (diff.inHours < 1) return '${diff.inMinutes}분 전';
      if (diff.inDays < 1) return '${diff.inHours}시간 전';
      if (diff.inDays < 30) return '${diff.inDays}일 전';
      return DateFormat('M월 d일', 'ko').format(dt);
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.read).length;

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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('알림', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                      if (unreadCount > 0)
                        Text('읽지 않은 알림 $unreadCount개', style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500)),
                    ],
                  ),
                  if (unreadCount > 0)
                    TextButton(
                      onPressed: () async {
                        for (final n in _notifications.where((n) => !n.read)) {
                          await _markRead(n);
                        }
                      },
                      child: const Text('모두 읽음', style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
                    ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _notifications.isEmpty
                      ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Text('🔔', style: TextStyle(fontSize: 48)),
                          SizedBox(height: 12),
                          Text('알림이 없습니다', style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
                        ]))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                          itemCount: _notifications.length,
                          itemBuilder: (_, i) {
                            final n = _notifications[i];
                            return GestureDetector(
                              onTap: () => _markRead(n),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: n.read ? Colors.white.withOpacity(0.5) : Colors.white.withOpacity(0.85),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: n.read ? Colors.white.withOpacity(0.4) : AppColors.primary.withOpacity(0.2),
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_typeIcon(n.type), style: const TextStyle(fontSize: 28)),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(n.title,
                                                    style: TextStyle(fontSize: 14, fontWeight: n.read ? FontWeight.w600 : FontWeight.w800, color: AppColors.textPrimary)),
                                              ),
                                              if (!n.read)
                                                Container(
                                                  width: 8,
                                                  height: 8,
                                                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 3),
                                          Text(n.body, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
                                          const SizedBox(height: 4),
                                          Text(_timeAgo(n.createdAt), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                        ],
                                      ),
                                    ),
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
