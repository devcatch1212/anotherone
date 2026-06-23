import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/auth_provider.dart';
import '../../../core/api/api_client.dart';
import '../../../shared/models/models.dart';
import 'address_search_screen.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 0;
  bool _loading = false;
  String _error = '';

  // Step 1
  WageType _wageType = WageType.hourly;

  // Step 2
  final _companyNameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  double _latitude = 37.5004;
  double _longitude = 127.0368;
  WebViewController? _mapController;

  @override
  void initState() {
    super.initState();
    _addressCtrl.text = "경기도 군포시 번영로 504";
  }

  void _initMapController() {
    _mapController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel(
        'ToonMapChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message);
            setState(() {
              _latitude = (data['lat'] as num).toDouble();
              _longitude = (data['lng'] as num).toDouble();
            });
            debugPrint('좌표 갱신: $_latitude, $_longitude');
          } catch (e) {
            debugPrint('좌표 파싱 에러: $e');
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            if (_addressCtrl.text.isNotEmpty) {
              _mapController?.runJavaScript("searchAddress('${_addressCtrl.text}')");
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('웹뷰 리소스 에러: ${error.description}, ${error.errorCode}, ${error.errorType}');
          },
        ),
      )
      ..loadHtmlString(_kakaoMapHtml, baseUrl: 'https://anotherone-tjgi.onrender.com');
  }

  Future<void> _showAddressSearch() async {
    final address = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const AddressSearchScreen()),
    );
    if (address != null && address.isNotEmpty) {
      setState(() {
        _addressCtrl.text = address;
      });
      _mapController?.runJavaScript("searchAddress('$address')");
    }
  }

  // Step 3
  final _wageCtrl = TextEditingController();
  final _workHoursCtrl = TextEditingController(text: '8');
  final _workDaysCtrl = TextEditingController(text: '5');
  final _startTimeCtrl = TextEditingController(text: '09:00');
  final _endTimeCtrl = TextEditingController(text: '18:00');

  @override
  void dispose() {
    _companyNameCtrl.dispose();
    _addressCtrl.dispose();
    _wageCtrl.dispose();
    _workHoursCtrl.dispose();
    _workDaysCtrl.dispose();
    _startTimeCtrl.dispose();
    _endTimeCtrl.dispose();
    super.dispose();
  }

  Future<void> _complete() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.post<Map<String, dynamic>>(
        '/api/onboarding/company',
        data: {
          'companyName': _companyNameCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
          'latitude': _latitude,
          'longitude': _longitude,
          'radiusMeters': 100,
          'wageType': _wageType == WageType.hourly ? 'hourly' : 'daily',
          'hourlyWage':
              _wageType == WageType.hourly ? double.tryParse(_wageCtrl.text) : null,
          'dailyWage':
              _wageType == WageType.daily ? double.tryParse(_wageCtrl.text) : null,
          'dailyWorkHours': double.tryParse(_workHoursCtrl.text) ?? 8.0,
          'weeklyWorkDays': int.tryParse(_workDaysCtrl.text) ?? 5,
          'workStartTime': _startTimeCtrl.text,
          'workEndTime': _endTimeCtrl.text,
          'position': '직원',
        },
      );
      await ref.read(authProvider.notifier).completeOnboarding();
      await ref.read(authProvider.notifier).refreshUser();
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = parseApiError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: AuroraPainter())),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: _buildStep(),
                  ),
                ),
                _buildFooter(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
      child: Column(
        children: [
          Row(
            children: [
              if (_step > 0)
                IconButton(
                  onPressed: () => setState(() => _step--),
                  icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              if (_step == 0) const SizedBox(width: 40),
              const Spacer(),
              Text(
                '${_step + 1}/3',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(3, (i) {
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
                  decoration: BoxDecoration(
                    color: i <= _step ? AppColors.primary : AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _buildStep1();
      case 1:
        return _buildStep2();
      case 2:
        return _buildStep3();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text(
          '임금 유형을 선택해주세요',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '근무 형태에 맞는 임금 유형을 선택하세요',
          style: TextStyle(fontSize: 14, color: AppColors.textMuted),
        ),
        const SizedBox(height: 32),
        _wageTypeCard(
          WageType.hourly,
          '시급',
          '시간당 임금을 받는 경우',
          Icons.schedule_rounded,
        ),
        const SizedBox(height: 12),
        _wageTypeCard(
          WageType.daily,
          '일급',
          '하루 단위로 임금을 받는 경우',
          Icons.today_rounded,
        ),
      ],
    );
  }

  Widget _wageTypeCard(WageType type, String title, String subtitle, IconData icon) {
    final isSelected = _wageType == type;
    return GestureDetector(
      onTap: () => setState(() => _wageType = type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.black.withOpacity(0.03),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.bg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon,
                  color: isSelected ? Colors.white : AppColors.textMuted,
                  size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.primary : AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.primary, size: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text(
          '근무지 정보를 입력해주세요',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '출퇴근 GPS 인증에 사용됩니다',
          style: TextStyle(fontSize: 14, color: AppColors.textMuted),
        ),
        const SizedBox(height: 32),
        _label('회사명'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _companyNameCtrl,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            hintText: '(주)예시회사',
            prefixIcon: Icon(Icons.business_rounded, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        _label('주소'),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _addressCtrl,
                readOnly: true,
                onTap: _showAddressSearch,
                decoration: const InputDecoration(
                  hintText: '주소 검색 버튼을 눌러주세요',
                  prefixIcon: Icon(Icons.location_on_outlined, size: 20),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _showAddressSearch,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text(
                '주소 검색',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        if (_addressCtrl.text.isNotEmpty) ...[
          const SizedBox(height: 16),
          _label('📍 출퇴근 위치 미세 조정 (핀을 드래그하여 맞추기)'),
          const SizedBox(height: 6),
          SizedBox(
            height: 200,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: _mapController != null
                    ? WebViewWidget(controller: _mapController!)
                    : const Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '💡 등록된 주소 기준 반경 100m 이내에서 출퇴근이 가능합니다.',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
          ),
        ],
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.infoLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.info.withOpacity(0.2)),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline_rounded,
                  color: AppColors.info, size: 18),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'GPS 위치는 앱에서 자동으로 확인합니다. 주소만 입력해주세요.',
                  style: TextStyle(fontSize: 12, color: AppColors.info),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Text(
          '${_wageType == WageType.hourly ? '시급' : '일급'} 및 근무 조건을 설정해주세요',
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '급여 계산에 사용됩니다',
          style: TextStyle(fontSize: 14, color: AppColors.textMuted),
        ),
        const SizedBox(height: 32),
        _label(_wageType == WageType.hourly ? '시급 (원)' : '일급 (원)'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _wageCtrl,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            hintText: _wageType == WageType.hourly ? '예: 10320' : '예: 80000',
            prefixIcon: const Icon(Icons.payments_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('하루 근무시간'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _workHoursCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: '8',
                      suffixText: '시간',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('주 근무일수'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _workDaysCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: '5',
                      suffixText: '일',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('출근시간'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _startTimeCtrl,
                    keyboardType: TextInputType.datetime,
                    decoration: const InputDecoration(hintText: '09:00'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _label('퇴근시간'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _endTimeCtrl,
                    keyboardType: TextInputType.datetime,
                    decoration: const InputDecoration(hintText: '18:00'),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (_error.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.dangerLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _error,
              style: const TextStyle(
                  color: AppColors.danger, fontSize: 13),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFooter() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.info],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.3),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ElevatedButton(
            onPressed: _loading ? null : _handleNext,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : Text(
                    _step < 2 ? '다음' : '완료',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  void _handleNext() {
    if (_step == 0) {
      if (_mapController == null) {
        _initMapController();
      }
      setState(() => _step = 1);
    } else if (_step == 1) {
      if (_companyNameCtrl.text.trim().isEmpty) {
        setState(() => _error = '회사명을 입력해주세요');
        return;
      }
      setState(() {
        _error = '';
        _step = 2;
      });
    } else {
      _complete();
    }
  }

  Widget _label(String text) => Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
        ),
      );

  static const String _kakaoMapHtml = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=b266405199d6c10bc598d2d53a52bce2&libraries=services"></script>
  <script>
    let map, marker, geocoder;

    function initMap(lat, lng) {
      const container = document.getElementById('map');
      const options = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3
      };
      map = new kakao.maps.Map(container, options);

      const markerPosition = new kakao.maps.LatLng(lat, lng);
      marker = new kakao.maps.Marker({
        position: markerPosition,
        draggable: true
      });
      marker.setMap(map);

      // 드래그 종료 이벤트
      kakao.maps.event.addListener(marker, 'dragend', function() {
        const latlng = marker.getPosition();
        if (window.ToonMapChannel) {
          window.ToonMapChannel.postMessage(JSON.stringify({
            lat: latlng.getLat(),
            lng: latlng.getLng()
          }));
        }
      });
    }

    function searchAddress(address) {
      if (!geocoder) {
        geocoder = new kakao.maps.services.Geocoder();
      }
      geocoder.addressSearch(address, function(result, status) {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const lat = parseFloat(result[0].y);
          const lng = parseFloat(result[0].x);
          const moveLatLng = new kakao.maps.LatLng(lat, lng);
          
          if (!map) {
            initMap(lat, lng);
          } else {
            map.setCenter(moveLatLng);
            marker.setPosition(moveLatLng);
          }
          
          if (window.ToonMapChannel) {
            window.ToonMapChannel.postMessage(JSON.stringify({
              lat: lat,
              lng: lng
            }));
          }
        }
      });
    }
  </script>
</body>
</html>
''';
}
