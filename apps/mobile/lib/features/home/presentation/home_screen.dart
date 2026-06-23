import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../shared/models/models.dart';
import '../../../core/widgets/guest_guard.dart';

enum GpsStatus { loading, ok, far, denied }

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  GpsStatus _gpsStatus = GpsStatus.loading;
  double? _distance;
  AttendanceState _workState = AttendanceState.before;
  AttendanceRecord? _todayRecord;
  List<AttendanceRecord> _records = [];
  double _leaveRemaining = 0;
  bool _checkingIn = false;
  Timer? _timer;
  DateTime _now = DateTime.now();
  StreamSubscription<Position>? _positionSub;
  double? _userLat;
  double? _userLon;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
      _startGps();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _positionSub?.cancel();
    super.dispose();
  }

  Employment? get _employment {
    final auth = ref.read(authProvider).value;
    return auth?.currentEmployment;
  }

  Future<void> _loadData() async {
    final auth = ref.read(authProvider).value;
    if (auth == null) return;

    if (auth.isGuest) {
      final todayKstStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final yesterdayKstStr = DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(const Duration(days: 1)));
      final twoDaysAgoKstStr = DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(const Duration(days: 2)));

      if (mounted) {
        setState(() {
          _leaveRemaining = 12.5;
          _records = [
            AttendanceRecord(
              id: 'guest_rec_1',
              companyId: 'guest_company',
              date: yesterdayKstStr,
              checkIn: '${yesterdayKstStr}T08:55:00Z',
              checkOut: '${yesterdayKstStr}T18:05:00Z',
              status: AttendanceStatus.normal,
              workedMinutes: 480,
            ),
            AttendanceRecord(
              id: 'guest_rec_2',
              companyId: 'guest_company',
              date: twoDaysAgoKstStr,
              checkIn: '${twoDaysAgoKstStr}T09:12:00Z',
              checkOut: '${twoDaysAgoKstStr}T18:02:00Z',
              status: AttendanceStatus.late,
              workedMinutes: 480,
            ),
          ];
          _todayRecord = null;
          _workState = AttendanceState.before;
        });
      }
      return;
    }

    final emp = auth.currentEmployment;
    if (emp == null) return;
    final api = ref.read(apiClientProvider);
    final year = DateTime.now().year;
    final month = DateTime.now().month;
    try {
      final res = await api.get<Map<String, dynamic>>(
        '/api/attendance',
        queryParameters: {
          'employmentId': emp.id,
          'year': year,
          'month': month,
        },
      );
      final rawList = res['records'] as List<dynamic>? ?? [];
      final recs = rawList
          .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));

      final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final today = recs.where((r) => r.date == todayStr).firstOrNull;

      if (mounted) {
        setState(() {
          _records = recs;
          _todayRecord = today;
          if (today != null) {
            _workState = today.checkOut != null
                ? AttendanceState.done
                : today.checkIn != null
                    ? AttendanceState.working
                    : AttendanceState.before;
          } else {
            _workState = AttendanceState.before;
          }
        });
      }
    } catch (_) {}

    try {
      final leaveRes = await api.get<Map<String, dynamic>>(
        '/api/leave',
        queryParameters: {'employmentId': emp.id},
      );
      final leaveList = leaveRes['records'] as List<dynamic>? ?? [];
      final weeklyWorkDays = emp.effectiveWeeklyWorkDays;
      final dailyWorkHours = emp.dailyWorkHours;
      final weeklyWorkHours = weeklyWorkDays * dailyWorkHours;
      double totalLeaveDays = 0;
      if (weeklyWorkHours >= 40) {
        totalLeaveDays = 15;
      } else if (weeklyWorkHours >= 15) {
        totalLeaveDays = (15 * (weeklyWorkHours / 40) * 10).round() / 10;
      }
      final usedDays = leaveList
          .where((l) =>
              l['status'] == 'approved' &&
              (l['type'] == 'annual' || l['type'] == 'half'))
          .fold<double>(0, (sum, l) => sum + ((l['days'] as num).toDouble()));
      if (mounted) {
        setState(() {
          _leaveRemaining = (totalLeaveDays - usedDays).clamp(0, double.infinity);
        });
      }
    } catch (_) {}
  }

  Future<void> _startGps() async {
    final emp = _employment;
    if (emp == null) {
      setState(() => _gpsStatus = GpsStatus.ok);
      return;
    }

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) setState(() => _gpsStatus = GpsStatus.denied);
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      if (mounted) setState(() => _gpsStatus = GpsStatus.denied);
      return;
    }

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen(
      (pos) {
        _userLat = pos.latitude;
        _userLon = pos.longitude;
        final d = _calcDistance(
          pos.latitude,
          pos.longitude,
          emp.company.latitude,
          emp.company.longitude,
        );
        if (mounted) {
          setState(() {
            _distance = d;
            _gpsStatus = d <= emp.company.radiusMeters ? GpsStatus.ok : GpsStatus.far;
          });
        }
      },
      onError: (_) {
        if (mounted) setState(() => _gpsStatus = GpsStatus.denied);
      },
    );
  }

  double _calcDistance(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLon = (lon2 - lon1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) *
            cos(lat2 * pi / 180) *
            sin(dLon / 2) *
            sin(dLon / 2);
    return r * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  String _timerText() {
    if (_workState == AttendanceState.before) return '00:00:00';
    if (_workState == AttendanceState.working && _todayRecord?.checkIn != null) {
      try {
        final checkIn = DateTime.parse(_todayRecord!.checkIn!).toLocal();
        final diff = _now.difference(checkIn);
        if (diff.isNegative) return '00:00:00';
        final h = diff.inHours.toString().padLeft(2, '0');
        final m = (diff.inMinutes % 60).toString().padLeft(2, '0');
        final s = (diff.inSeconds % 60).toString().padLeft(2, '0');
        return '$h:$m:$s';
      } catch (_) {
        return '00:00:00';
      }
    }
    if (_workState == AttendanceState.done && _todayRecord != null) {
      final mins = _todayRecord!.workedMinutes ?? 0;
      final h = (mins ~/ 60).toString().padLeft(2, '0');
      final m = (mins % 60).toString().padLeft(2, '0');
      return '$h:$m:00';
    }
    return '00:00:00';
  }

  Future<void> _handleCheckIn() async {
    final isGuest = ref.read(authProvider).value?.isGuest ?? false;
    if (isGuest) {
      showDialog(
        context: context,
        builder: (context) => const GuestAlert(),
      );
      return;
    }
    if (_workState != AttendanceState.before) return;
    final emp = _employment;
    if (emp == null) return;
    setState(() => _checkingIn = true);
    try {
      // 1. 터치 시점 실시간 위치 조회 (5초 타임아웃)
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );

      // 2. 거리 재계산 및 교차 검증
      final d = _calcDistance(
        pos.latitude,
        pos.longitude,
        emp.company.latitude,
        emp.company.longitude,
      );

      if (mounted) {
        setState(() {
          _distance = d;
          _userLat = pos.latitude;
          _userLon = pos.longitude;
          _gpsStatus = d <= emp.company.radiusMeters ? GpsStatus.ok : GpsStatus.far;
        });
      }

      if (d > emp.company.radiusMeters) {
        _showSnackBar(
          '📍 근무지 인증 실패! 반경 ${emp.company.radiusMeters}m 밖입니다. (현재 거리: ${d.round()}m)',
          AppColors.danger,
        );
        return;
      }

      // 3. API 호출
      final api = ref.read(apiClientProvider);
      final res = await api.post<Map<String, dynamic>>(
        '/api/attendance/check-in',
        data: {
          'employmentId': emp.id,
          'latitude': pos.latitude,
          'longitude': pos.longitude,
        },
      );
      final record = AttendanceRecord.fromJson(
          res['attendance'] as Map<String, dynamic>);
      setState(() {
        _todayRecord = record;
        _workState = AttendanceState.working;
      });
      _showSnackBar(
        _now.hour > 9 ? '⚠️ 지각 처리되었습니다' : '✅ 출근이 기록되었습니다',
        _now.hour > 9 ? AppColors.warning : AppColors.success,
      );
    } catch (e) {
      _showSnackBar('오류: ${parseApiError(e)}', AppColors.danger);
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  Future<void> _handleCheckOut() async {
    final isGuest = ref.read(authProvider).value?.isGuest ?? false;
    if (isGuest) {
      showDialog(
        context: context,
        builder: (context) => const GuestAlert(),
      );
      return;
    }
    if (_workState != AttendanceState.working) return;
    final emp = _employment;
    if (emp == null) return;
    setState(() => _checkingIn = true);
    try {
      // 1. 터치 시점 실시간 위치 조회 (5초 타임아웃)
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );

      // 2. 거리 재계산 및 교차 검증
      final d = _calcDistance(
        pos.latitude,
        pos.longitude,
        emp.company.latitude,
        emp.company.longitude,
      );

      if (mounted) {
        setState(() {
          _distance = d;
          _userLat = pos.latitude;
          _userLon = pos.longitude;
          _gpsStatus = d <= emp.company.radiusMeters ? GpsStatus.ok : GpsStatus.far;
        });
      }

      if (d > emp.company.radiusMeters) {
        _showSnackBar(
          '📍 근무지 인증 실패! 반경 ${emp.company.radiusMeters}m 밖입니다. (현재 거리: ${d.round()}m)',
          AppColors.danger,
        );
        return;
      }

      // 3. API 호출
      final api = ref.read(apiClientProvider);
      final res = await api.post<Map<String, dynamic>>(
        '/api/attendance/check-out',
        data: {
          'employmentId': emp.id,
          'latitude': pos.latitude,
          'longitude': pos.longitude,
        },
      );
      final updated = AttendanceRecord.fromJson(
          res['attendance'] as Map<String, dynamic>);
      setState(() {
        _todayRecord = updated;
        _workState = AttendanceState.done;
      });
      _showSnackBar('✅ 퇴근이 기록되었습니다', AppColors.success);
    } catch (e) {
      _showSnackBar('오류: ${parseApiError(e)}', AppColors.danger);
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  void _showSnackBar(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg,
            style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showOvertimeSheet() {
    final isGuest = ref.read(authProvider).value?.isGuest ?? false;
    if (isGuest) {
      showDialog(
        context: context,
        builder: (context) => const GuestAlert(),
      );
      return;
    }
    final startCtrl = TextEditingController();
    final endCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('연장근로 신청',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('시작 시각',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: startCtrl,
                          keyboardType: TextInputType.datetime,
                          decoration: const InputDecoration(hintText: '18:00'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('종료 시각',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: endCtrl,
                          keyboardType: TextInputType.datetime,
                          decoration: const InputDecoration(hintText: '21:00'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text('사유',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: '연장근로 사유를 입력해주세요',
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.info]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ElevatedButton(
                    onPressed: () async {
                      final emp = _employment;
                      if (emp == null) return;
                      try {
                        await ref.read(apiClientProvider).post<dynamic>(
                          '/api/attendance/overtime',
                          data: {
                            'employmentId': emp.id,
                            'start': startCtrl.text,
                            'end': endCtrl.text,
                            'reason': reasonCtrl.text,
                          },
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        _showSnackBar('연장근로 신청이 완료되었습니다', AppColors.success);
                      } catch (e) {
                        _showSnackBar(parseApiError(e), AppColors.danger);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('신청하기',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider).value;
    final emp = auth?.currentEmployment;
    final userName = auth?.user?.name ?? '사용자';
    final dateStr = DateFormat('yyyy년 M월 d일 (E)', 'ko').format(_now);

    final monthlyTarget = emp != null
        ? (emp.effectiveWeeklyWorkDays * emp.dailyWorkHours * 4)
        : 0.0;
    final monthlyWorkedMins =
        _records.fold<int>(0, (sum, r) => sum + (r.workedMinutes ?? 0));
    final monthlyWorked = (monthlyWorkedMins / 60 * 10).round() / 10;
    final workedPercent = monthlyTarget > 0
        ? (monthlyWorked / monthlyTarget * 100).round().clamp(0, 100)
        : 0;

    final gpsColor = {
      GpsStatus.ok: AppColors.successLight,
      GpsStatus.far: AppColors.dangerLight,
      GpsStatus.loading: AppColors.bg,
      GpsStatus.denied: AppColors.warningLight,
    }[_gpsStatus]!;
    final gpsTextColor = {
      GpsStatus.ok: AppColors.success,
      GpsStatus.far: AppColors.danger,
      GpsStatus.loading: AppColors.textMuted,
      GpsStatus.denied: AppColors.warning,
    }[_gpsStatus]!;
    final gpsIcon = {
      GpsStatus.ok: '📍',
      GpsStatus.far: '🚫',
      GpsStatus.loading: '📡',
      GpsStatus.denied: '⚠️',
    }[_gpsStatus]!;
    final gpsText = {
      GpsStatus.ok: '근무지 인증 완료 · ${_distance?.round()}m',
      GpsStatus.far: '근무지에서 ${_distance?.round()}m 거리',
      GpsStatus.loading: '위치 확인 중...',
      GpsStatus.denied: '위치 권한이 필요합니다',
    }[_gpsStatus]!;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 헤더
            Container(
              color: Colors.white.withOpacity(0.65),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(dateStr,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500)),
                      const SizedBox(height: 2),
                      Text(
                        '안녕하세요, $userName님 👋',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () => context.go('/notifications'),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: Colors.white.withOpacity(0.6)),
                      ),
                      child: const Icon(Icons.notifications_outlined,
                          size: 20, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),

            // 본문
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                child: Column(
                  children: [
                    // 근무 현황 카드
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xD03B82F6),
                            Color(0xD08B5CF6),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('이번 달 근무시간',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.white.withOpacity(0.7),
                                          fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 4),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text('${monthlyWorked}h',
                                          style: const TextStyle(
                                              fontSize: 26,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white)),
                                      const SizedBox(width: 4),
                                      Text('/ ${monthlyTarget}h',
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: Colors.white
                                                  .withOpacity(0.5))),
                                    ],
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('남은 연차',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.white.withOpacity(0.7),
                                          fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 4),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text('${_leaveRemaining.toStringAsFixed(1)}',
                                          style: const TextStyle(
                                              fontSize: 26,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white)),
                                      const SizedBox(width: 2),
                                      Text('일',
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: Colors.white
                                                  .withOpacity(0.5))),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: LinearProgressIndicator(
                              value: workedPercent / 100,
                              backgroundColor: Colors.white.withOpacity(0.2),
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Color(0xFF00F0FF)),
                              minHeight: 6,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              '$workedPercent% 달성 · ${(monthlyTarget - monthlyWorked).clamp(0, double.infinity).toStringAsFixed(1)}h 남음',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.white.withOpacity(0.7)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 타이머 + GPS + 출퇴근 버튼
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.65),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: Colors.white.withOpacity(0.6)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: emp == null
                          ? _buildNoEmployment()
                          : Column(
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _workState ==
                                                AttendanceState.working
                                            ? AppColors.accentLight
                                            : _workState ==
                                                    AttendanceState.done
                                                ? AppColors.primaryLight
                                                : AppColors.bg,
                                        borderRadius: BorderRadius.circular(99),
                                      ),
                                      child: Text(
                                        _workState == AttendanceState.working
                                            ? '근무 중'
                                            : _workState == AttendanceState.done
                                                ? '퇴근 완료'
                                                : '출근 전',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: _workState ==
                                                  AttendanceState.working
                                              ? AppColors.accentDark
                                              : _workState ==
                                                      AttendanceState.done
                                                  ? AppColors.primary
                                                  : AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                    if (_todayRecord?.checkIn != null)
                                      Text(
                                        '출근 ${_formatTime(_todayRecord!.checkIn!)}',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textMuted,
                                            fontWeight: FontWeight.w500),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    _workState == AttendanceState.working
                                        ? '⏱️ 오늘 누적 근무 시간'
                                        : _workState == AttendanceState.done
                                            ? '✅ 오늘 총 근무 시간'
                                            : '⏳ 오늘 근무 시간',
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textSecondary),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    _timerText(),
                                    style: const TextStyle(
                                      fontSize: 44,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                      letterSpacing: -1,
                                      fontFeatures: [
                                        FontFeature.tabularFigures()
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                // GPS 상태
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: gpsColor,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Text(gpsIcon,
                                          style: const TextStyle(fontSize: 14)),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          gpsText,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: gpsTextColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 10),
                                // 출퇴근 버튼
                                _buildActionButtons(),
                              ],
                            ),
                    ),
                    const SizedBox(height: 16),

                    // 최근 기록
                    _buildRecentRecords(),
                    const SizedBox(height: 16),

                    // 빠른 메뉴
                    Row(
                      children: [
                        _quickMenu('💰', '급여명세서', '/payroll'),
                        const SizedBox(width: 10),
                        _quickMenu('📅', '근무 캘린더', '/calendar'),
                        const SizedBox(width: 10),
                        _quickMenu('🌴', '휴가 신청', '/leave/apply'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoEmployment() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        children: [
          const Text('📋', style: TextStyle(fontSize: 32)),
          const SizedBox(height: 12),
          const Text(
            '활성화된 근무지가 없습니다',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary),
          ),
          const SizedBox(height: 4),
          const Text(
            '출퇴근을 기록하려면 근무지를 등록해주세요',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          GestureDetector(
            onTap: () => context.go('/onboarding'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.info]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('근무지 등록하기 ➕',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    if (_workState == AttendanceState.before) {
      return SizedBox(
        width: double.infinity,
        height: 48,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _gpsStatus == GpsStatus.ok
                  ? [AppColors.primary, AppColors.info]
                  : [AppColors.border, AppColors.border],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ElevatedButton(
            onPressed:
                _checkingIn || _gpsStatus != GpsStatus.ok ? null : _handleCheckIn,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.login_rounded, size: 16, color: Colors.white),
                const SizedBox(width: 6),
                Text(
                  _checkingIn ? '처리 중...' : '출근 기록하기',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_workState == AttendanceState.working) {
      return Row(
        children: [
          Expanded(
            flex: 2,
            child: SizedBox(
              height: 48,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _gpsStatus == GpsStatus.ok
                        ? [AppColors.primary, AppColors.info]
                        : [AppColors.border, AppColors.border],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ElevatedButton(
                  onPressed: _checkingIn || _gpsStatus != GpsStatus.ok
                      ? null
                      : _handleCheckOut,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _checkingIn ? '처리 중...' : '퇴근 기록하기',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _showOvertimeSheet,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: const Text('⏱️ 연장',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ),
            ),
          ),
        ],
      );
    }

    // done
    return Container(
      width: double.infinity,
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary, width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_rounded, color: AppColors.primary, size: 20),
          const SizedBox(width: 8),
          Text(
            '오늘 근무 종료${_todayRecord?.checkOut != null ? ' (${_formatTime(_todayRecord!.checkOut!)} 퇴근)' : ''}',
            style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentRecords() {
    final recent = _records.take(3).toList();
    final statusMap = {
      AttendanceStatus.normal:
          (label: '정상', color: AppColors.accentDark, bg: AppColors.accentLight),
      AttendanceStatus.late:
          (label: '지각', color: const Color(0xFFD97706), bg: const Color(0xFFFFFBEB)),
      AttendanceStatus.absent:
          (label: '결근', color: const Color(0xFFDC2626), bg: const Color(0xFFFEF2F2)),
      AttendanceStatus.vacation:
          (label: '휴가', color: const Color(0xFF7C3AED), bg: const Color(0xFFF5F3FF)),
      AttendanceStatus.holiday:
          (label: '공휴일', color: AppColors.textMuted, bg: AppColors.bg),
    };

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('최근 기록',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            Row(
              children: [
                GestureDetector(
                  onTap: () => context.go('/calendar'),
                  child: const Text('근무 캘린더 →',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary)),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => context.go('/attendance'),
                  child: const Text('전체 보기',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textMuted)),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.65),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.6)),
          ),
          child: recent.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    '출퇴근 기록이 없습니다',
                    style:
                        TextStyle(fontSize: 13, color: AppColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 8),
                  itemCount: recent.length,
                  separatorBuilder: (_, __) => const Divider(
                      height: 1, color: Color(0xFFF3F4F6)),
                  itemBuilder: (_, i) {
                    final r = recent[i];
                    final s = statusMap[r.status] ?? statusMap[AttendanceStatus.normal]!;
                    final isWorking = r.checkOut == null && r.checkIn != null;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isWorking ? AppColors.primary : s.color,
                              border:
                                  Border.all(color: Colors.white, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: (isWorking
                                          ? AppColors.primary
                                          : s.color)
                                      .withOpacity(0.3),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  DateFormat('M월 d일 (E)', 'ko')
                                      .format(DateTime.parse(r.date)),
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textMuted,
                                      fontWeight: FontWeight.w500),
                                ),
                                Text(
                                  '${r.checkIn != null ? _formatTime(r.checkIn!) : '--:--'}${r.checkOut != null ? ' ~ ${_formatTime(r.checkOut!)}' : isWorking ? ' ~ 근무 중' : ''}',
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary),
                                ),
                              ],
                            ),
                          ),
                          if (r.workedMinutes != null)
                            Text(
                              _formatDuration(r.workedMinutes!),
                              style: const TextStyle(
                                  fontSize: 11, color: AppColors.textMuted),
                            ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: s.bg,
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(
                              s.label,
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: s.color),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _quickMenu(String icon, String label, String path) {
    return Expanded(
      child: GestureDetector(
        onTap: () => context.go(path),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.65),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.6)),
          ),
          child: Column(
            children: [
              Text(icon, style: const TextStyle(fontSize: 18)),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(String iso) {
    try {
      return DateFormat('HH:mm').format(DateTime.parse(iso).toLocal());
    } catch (_) {
      return '--:--';
    }
  }

  String _formatDuration(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0) return '${h}시간 ${m}분';
    return '${m}분';
  }
}
