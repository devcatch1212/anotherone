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
import '../../../shared/utils/attendance_utils.dart';

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
  String? _loadError;
  Timer? _timer;
  DateTime _now = DateTime.now();
  StreamSubscription<Position>? _positionSub;


  @override
  void initState() {
    super.initState();
    // 근무 중일 때만 1초마다 리빌드되도록 최적화
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _workState == AttendanceState.working) {
        setState(() => _now = DateTime.now());
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // authProvider 로딩 완료 후 데이터 초기화 (온보딩→홈 전환 시 null 방지)
      await ref.read(authProvider.future);
      if (!mounted) return;
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
    final auth = ref.watch(authProvider).value;
    return auth?.currentEmployment;
  }

  Future<void> _loadData() async {
    final auth = ref.read(authProvider).value;
    if (auth == null) return;


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
    } catch (e) {
      debugPrint('출퇴근 기록 조회 실패: $e');
      if (mounted) setState(() => _loadError = parseApiError(e));
    }

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
    } catch (e) {
      debugPrint('연차 조회 실패: $e');
      // 연차 조회 실패는 치명적이지 않으므로 UI는 유지하고 로그만 남김
    }
  }

  Future<void> _startGps() async {
    _positionSub?.cancel(); // 기존 위치 리스너 해제 후 재등록 진행 (중복 방지)
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

    // 1. 캐시된 마지막 위치 즉각 반영 (지연 제로)
    try {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null && mounted) {
        final d = _calcDistance(
          lastPos.latitude,
          lastPos.longitude,
          emp.company.latitude,
          emp.company.longitude,
        );
        setState(() {
          _distance = d;
          _gpsStatus = d <= emp.company.radiusMeters ? GpsStatus.ok : GpsStatus.far;
        });
      }
    } catch (_) {}

    // 2. 단발성 현재 위치 강제 요청 (LocationManager 활용하여 신속 응답 유도)
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: AndroidSettings(
          accuracy: LocationAccuracy.high,
          forceLocationManager: true,
        ),
      ).timeout(const Duration(seconds: 4));
      if (mounted) {
        final d = _calcDistance(
          pos.latitude,
          pos.longitude,
          emp.company.latitude,
          emp.company.longitude,
        );
        setState(() {
          _distance = d;
          _gpsStatus = d <= emp.company.radiusMeters ? GpsStatus.ok : GpsStatus.far;
        });
      }
    } catch (_) {}

    if (!mounted) return;

    // 3. 실시간 변경 대응 스트림 리스닝 시작
    _positionSub = Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 3,
        forceLocationManager: true,
      ),
    ).listen(
      (pos) {
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
    if (_workState != AttendanceState.before) return;
    final emp = _employment;
    if (emp == null) return;
    
    if (_gpsStatus == GpsStatus.denied) {
      _showSnackBar('위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.', AppColors.warning);
      return;
    }
    
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
      // 지각 여부는 서버가 workStartTime 기준으로 판단한 status 사용
      final isLate = record.status == AttendanceStatus.late;
      _showSnackBar(
        isLate ? '⚠️ 지각 처리되었습니다' : '✅ 출근이 기록되었습니다',
        isLate ? AppColors.warning : AppColors.success,
      );
      _loadData();
    } catch (e) {
      _showSnackBar('오류: ${parseApiError(e)}', AppColors.danger);
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  Future<void> _handleCheckOut() async {
    if (_workState != AttendanceState.working) return;
    final emp = _employment;
    if (emp == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('퇴근 확인', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('정말 퇴근하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              '퇴근하기',
              style: TextStyle(color: Color(0xFF3E6872), fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    
    if (_gpsStatus == GpsStatus.denied) {
      _showSnackBar('위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.', AppColors.warning);
      return;
    }
    
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
      _loadData();
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
    ).then((_) {
      // 바텀시트가 닫힌 후 컨트롤러를 안전하게 dispose
      startCtrl.dispose();
      endCtrl.dispose();
      reasonCtrl.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    // 온보딩 완료 직후 또는 근무지 교체 시 실시간 감지하여 GPS 트래킹 즉각 트리거
    ref.listen<AsyncValue<AuthState>>(authProvider, (previous, next) {
      final prevEmp = previous?.value?.currentEmployment;
      final nextEmp = next.value?.currentEmployment;
      if (prevEmp?.id != nextEmp?.id && nextEmp != null) {
        _startGps();
      }
    });

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
                  Text(
                    dateStr,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.3,
                    ),
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

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                child: Column(
                  children: [
                     if (_loadError != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2C2C2E),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_rounded,
                              color: Color(0xFFFF3B30), // iOS System Red
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _loadError!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _loadError = null;
                                });
                                _loadData();
                                _startGps();
                              },
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                '재시도',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.danger,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    // 근무 현황 카드
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
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
                                  const Text('이번 달 근무시간',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textSecondary,
                                          fontWeight: FontWeight.w600)),
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
                                              color: Color(0xFF3E6872))),
                                      const SizedBox(width: 4),
                                      const Text('/ 160h', // target hours
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: AppColors.textMuted)),
                                    ],
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('남은 연차',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textSecondary,
                                          fontWeight: FontWeight.w600)),
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
                                              color: Color(0xFF3E6872))),
                                      const SizedBox(width: 2),
                                      const Text('일',
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: AppColors.textMuted)),
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
                              backgroundColor: AppColors.bg,
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Color(0xFF3E6872)),
                              minHeight: 6,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              '$workedPercent% 달성 · ${(monthlyTarget - monthlyWorked).clamp(0, double.infinity).toStringAsFixed(1)}h 남음',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary),
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
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
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
                                      color: Color(0xFF3E6872),
                                      letterSpacing: -1,
                                      fontFeatures: [
                                        FontFeature.tabularFigures()
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                // GPS 상태
                                Builder(
                                  builder: (context) {
                                    final isWarning = _gpsStatus == GpsStatus.far || _gpsStatus == GpsStatus.denied;
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: isWarning ? const Color(0xFF2C2C2E) : gpsColor,
                                        borderRadius: BorderRadius.circular(12),
                                        border: isWarning 
                                            ? null 
                                            : Border.all(color: gpsTextColor.withOpacity(0.15)),
                                        boxShadow: isWarning ? [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.1),
                                            blurRadius: 8,
                                            offset: const Offset(0, 3),
                                          ),
                                        ] : null,
                                      ),
                                      child: Row(
                                        children: [
                                          if (isWarning)
                                            const Icon(
                                              Icons.error_rounded,
                                              color: Color(0xFFFF3B30),
                                              size: 18,
                                            )
                                          else
                                            Text(gpsIcon, style: const TextStyle(fontSize: 14)),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              gpsText,
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: isWarning ? Colors.white : gpsTextColor,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
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
                    // const SizedBox(height: 16),

                    // 빠른 메뉴
                    // Row(
                    //   children: [
                    //     _quickMenu('💰', '급여명세서', '/payroll'),
                    //     const SizedBox(width: 10),
                    //     _quickMenu('📅', '근무 캘린더', '/calendar'),
                    //     const SizedBox(width: 10),
                    //     _quickMenu('🌴', '휴가 신청', '/leave/apply'),
                    //   ],
                    // ),
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
        child: ElevatedButton(
          onPressed: _checkingIn ? null : _handleCheckIn,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEEF2F2),
            foregroundColor: const Color(0xFF3E6872),
            elevation: 0,
            shadowColor: Colors.transparent,
            side: const BorderSide(
              color: Color(0xFF3E6872),
              width: 1.0,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.login_rounded,
                size: 16,
                color: Color(0xFF3E6872),
              ),
              const SizedBox(width: 6),
              Text(
                _checkingIn ? '처리 중...' : '출근 기록하기',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF3E6872),
                ),
              ),
            ],
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
              child: ElevatedButton(
                onPressed: _checkingIn ? null : _handleCheckOut,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEEF2F2),
                  foregroundColor: const Color(0xFF3E6872),
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  side: const BorderSide(
                    color: Color(0xFF3E6872),
                    width: 1.0,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3E6872),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _checkingIn ? '처리 중...' : '퇴근 기록하기',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF3E6872),
                      ),
                    ),
                  ],
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
                  backgroundColor: const Color(0xFFF4F4F5),
                  foregroundColor: const Color(0xFF3E6872),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: Color(0xFF3E6872), width: 1.0),
                ),
                child: const Text('⏱️ 연장',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF3E6872))),
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
        color: const Color(0xFFF4F4F5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3E6872), width: 1.0),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_rounded, color: Color(0xFF3E6872), size: 20),
          const SizedBox(width: 8),
          Text(
            '오늘 근무 종료${_todayRecord?.checkOut != null ? ' (${_formatTime(_todayRecord!.checkOut!)} 퇴근)' : ''}',
            style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF3E6872)),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentRecords() {
    final recent = _records.take(3).toList();


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
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
          ),
          child: recent.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3E6872).withOpacity(0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.history_toggle_off_rounded,
                          size: 28,
                          color: Color(0xFF3E6872),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '아직 등록된 근무 기록이 없습니다',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '오늘의 출퇴근을 기록하고 하루를 시작해보세요!',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textMuted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
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
                    final s = AttendanceUtils.getStyle(r.status);
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
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
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
