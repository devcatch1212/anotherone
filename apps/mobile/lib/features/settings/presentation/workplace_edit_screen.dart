import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/kakao_map_utils.dart';
import '../../../shared/models/models.dart';
import '../../../features/auth/auth_provider.dart';
import '../../onboarding/presentation/address_search_screen.dart';

class WorkplaceEditScreen extends ConsumerStatefulWidget {
  final Employment employment;

  const WorkplaceEditScreen({super.key, required this.employment});

  @override
  ConsumerState<WorkplaceEditScreen> createState() => _WorkplaceEditScreenState();
}

class _WorkplaceEditScreenState extends ConsumerState<WorkplaceEditScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  String _error = '';

  // 회사 정보 관련 컨트롤러
  late final TextEditingController _companyNameCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _departmentCtrl;
  late final TextEditingController _positionCtrl;
  late double _latitude;
  late double _longitude;
  WebViewController? _mapController;

  // 계약 조건 관련 컨트롤러
  late WageType _wageType;
  late final TextEditingController _wageCtrl;
  late final TextEditingController _startTimeCtrl;
  late final TextEditingController _endTimeCtrl;
  late final TextEditingController _breakMinutesCtrl;

  // 요일 선택을 위한 리스트 (0=월, 6=일)
  final List<int> _selectedDays = [];

  final List<String> _weekDayNames = ['월', '화', '수', '목', '금', '토', '일'];

  @override
  void initState() {
    super.initState();
    final emp = widget.employment;

    // 데이터 초기 설정
    _companyNameCtrl = TextEditingController(text: emp.company.name);
    _addressCtrl = TextEditingController(text: emp.company.address);
    _departmentCtrl = TextEditingController(text: emp.department ?? '');
    _positionCtrl = TextEditingController(text: emp.position);
    _latitude = emp.company.latitude;
    _longitude = emp.company.longitude;

    _wageType = emp.wageType;
    final wageValue = _wageType == WageType.hourly
        ? (emp.hourlyWage ?? 0).toInt()
        : (emp.dailyWage ?? 0).toInt();
    _wageCtrl = TextEditingController(text: wageValue > 0 ? wageValue.toString() : '');

    _startTimeCtrl = TextEditingController(text: emp.workStartTime ?? '09:00');
    _endTimeCtrl = TextEditingController(text: emp.workEndTime ?? '18:00');
    _breakMinutesCtrl = TextEditingController(text: (emp.breakMinutes ?? 60).toString());

    if (emp.workDaysOfWeek != null && emp.workDaysOfWeek!.isNotEmpty) {
      _selectedDays.addAll(emp.workDaysOfWeek!);
    } else {
      // 요일 정보가 없을 시 주 근무일수(weeklyWorkDays)만큼 순차 기본 요일 활성화
      final count = emp.weeklyWorkDays.clamp(1, 7);
      _selectedDays.addAll(List.generate(count, (i) => i));
    }

    // 맵 딜레이드 초기화
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initMapController();
    });
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
            debugPrint('웹뷰 리소스 에러: ${error.description}');
          },
        ),
      )
      ..loadHtmlString(KakaoMapUtils.mapHtml, baseUrl: KakaoMapUtils.baseUrl);
  }

  @override
  void dispose() {
    _companyNameCtrl.dispose();
    _addressCtrl.dispose();
    _departmentCtrl.dispose();
    _positionCtrl.dispose();
    _wageCtrl.dispose();
    _startTimeCtrl.dispose();
    _endTimeCtrl.dispose();
    _breakMinutesCtrl.dispose();
    super.dispose();
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

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDays.isEmpty) {
      setState(() => _error = '최소 하루 이상의 근무 요일을 선택해주세요.');
      return;
    }

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final api = ref.read(apiClientProvider);
      await api.put<Map<String, dynamic>>(
        '/api/settings/profile',
        data: {
          'employmentId': widget.employment.id,
          'companyName': _companyNameCtrl.text.trim(),
          'companyAddress': _addressCtrl.text.trim(),
          'latitude': _latitude,
          'longitude': _longitude,
          'position': _positionCtrl.text.trim().isNotEmpty ? _positionCtrl.text.trim() : '직원',
          'department': _departmentCtrl.text.trim().isNotEmpty ? _departmentCtrl.text.trim() : null,
          'wageType': _wageType == WageType.hourly ? 'hourly' : 'daily',
          'hourlyWage': _wageType == WageType.hourly ? double.tryParse(_wageCtrl.text) : null,
          'dailyWage': _wageType == WageType.daily ? double.tryParse(_wageCtrl.text) : null,
          'workStartTime': _startTimeCtrl.text,
          'workEndTime': _endTimeCtrl.text,
          'breakMinutes': int.tryParse(_breakMinutesCtrl.text) ?? 60,
          'workDaysOfWeek': _selectedDays,
        },
      );

      await ref.read(authProvider.notifier).refreshUser();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('근무지 정보가 성공적으로 변경되었습니다.')),
        );
        context.go('/settings');
      }
    } catch (e) {
      setState(() => _error = parseApiError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _endEmployment() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('근무 종료', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('정말 이 근무지를 종료 처리하시겠습니까?\n종료하면 활성 근무지에서 비활성화됩니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('종료하기', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final api = ref.read(apiClientProvider);
      await api.post<Map<String, dynamic>>(
        '/api/settings/employment/end',
        data: {
          'employmentId': widget.employment.id,
        },
      );

      await ref.read(authProvider.notifier).refreshUser();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('근무가 종료되었습니다.')),
        );
        context.go('/settings');
      }
    } catch (e) {
      setState(() => _error = parseApiError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditable = widget.employment.isActive;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text(
          '근무지 정보 수정',
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => context.go('/settings'),
        ),
      ),
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: AuroraPainter())),
          SafeArea(
            child: Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!isEditable)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 20),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.textMuted.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.lock_outline_rounded, color: AppColors.textMuted, size: 18),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '이미 종료된 근무지 정보는 수정할 수 없습니다.',
                                style: TextStyle(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // 회사 기본 정보 카드
                    _buildSectionHeader('회사 정보'),
                    const SizedBox(height: 10),
                    _buildCard([
                      _buildLabel('회사명'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _companyNameCtrl,
                        enabled: isEditable,
                        decoration: const InputDecoration(
                          hintText: '예시회사명',
                          prefixIcon: Icon(Icons.business_rounded, size: 20),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? '회사명을 입력해주세요' : null,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildLabel('부서 (선택)'),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _departmentCtrl,
                                  enabled: isEditable,
                                  decoration: const InputDecoration(
                                    hintText: '예: 개발팀',
                                    prefixIcon: Icon(Icons.group_work_rounded, size: 20),
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
                                _buildLabel('직책/직급 (선택)'),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _positionCtrl,
                                  enabled: isEditable,
                                  decoration: const InputDecoration(
                                    hintText: '예: 대리',
                                    prefixIcon: Icon(Icons.badge_rounded, size: 20),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildLabel('주소'),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _addressCtrl,
                              readOnly: true,
                              enabled: isEditable,
                              onTap: isEditable ? _showAddressSearch : null,
                              decoration: const InputDecoration(
                                hintText: '주소를 검색해주세요',
                                prefixIcon: Icon(Icons.location_on_outlined, size: 20),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty) ? '주소를 검색해 기입해 주세요' : null,
                            ),
                          ),
                          if (isEditable) ...[
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: _showAddressSearch,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                              child: const Text('검색', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                            ),
                          ]
                        ],
                      ),
                      if (_addressCtrl.text.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _buildLabel('📍 출퇴근 위치 미세 조정 (마커를 드래그하세요)'),
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
                          '💡 마커 위치 기준 반경 100m 이내에서 GPS 출퇴근 인식이 허용됩니다.',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                        ),
                      ]
                    ]),

                    const SizedBox(height: 24),

                    // 급여 및 계약 조건 카드
                    _buildSectionHeader('급여 및 근무 형태 설정'),
                    const SizedBox(height: 10),
                    _buildCard([
                      _buildLabel('임금 유형'),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _buildWageTypeButton(WageType.hourly, '시급', isEditable),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildWageTypeButton(WageType.daily, '일급', isEditable),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildLabel(_wageType == WageType.hourly ? '시급액 (원)' : '일급액 (원)'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _wageCtrl,
                        enabled: isEditable,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: _wageType == WageType.hourly ? '예: 10320' : '예: 80000',
                          prefixIcon: const Icon(Icons.payments_outlined, size: 20),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return '금액을 입력해주세요';
                          if (double.tryParse(v) == null) return '숫자 형식만 입력 가능합니다';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _buildLabel('근무 요일 선택'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: List.generate(7, (index) {
                          final isSelected = _selectedDays.contains(index);
                          return FilterChip(
                            label: Text(_weekDayNames[index]),
                            selected: isSelected,
                            onSelected: isEditable
                                ? (selected) {
                                    setState(() {
                                      if (selected) {
                                        _selectedDays.add(index);
                                        _selectedDays.sort();
                                      } else {
                                        _selectedDays.remove(index);
                                      }
                                    });
                                  }
                                : null,
                            selectedColor: AppColors.primaryLight,
                            checkmarkColor: AppColors.primary,
                            labelStyle: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: BorderSide(
                                color: isSelected ? AppColors.primary : AppColors.border,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildLabel('출근 시간'),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _startTimeCtrl,
                                  enabled: isEditable,
                                  readOnly: true,
                                  onTap: isEditable ? () => _selectTime(context, _startTimeCtrl) : null,
                                  decoration: const InputDecoration(
                                    prefixIcon: Icon(Icons.access_time_rounded, size: 20),
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
                                _buildLabel('퇴근 시간'),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _endTimeCtrl,
                                  enabled: isEditable,
                                  readOnly: true,
                                  onTap: isEditable ? () => _selectTime(context, _endTimeCtrl) : null,
                                  decoration: const InputDecoration(
                                    prefixIcon: Icon(Icons.access_time_filled_rounded, size: 20),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildLabel('하루 휴게시간 (분)'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _breakMinutesCtrl,
                        enabled: isEditable,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: '60',
                          prefixIcon: Icon(Icons.coffee_rounded, size: 20),
                          suffixText: '분',
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return '휴게시간을 입력해주세요';
                          if (int.tryParse(v) == null) return '정수만 입력 가능합니다';
                          return null;
                        },
                      ),
                    ]),

                    if (_error.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
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
                              color: Color(0xFFFF3B30),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _error,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 32),

                    // 하단 버튼 구성
                    if (isEditable) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _save,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3E6872),
                            foregroundColor: Colors.white,
                            shadowColor: Colors.transparent,
                            elevation: 0,
                            side: const BorderSide(color: Color(0xFF3E6872), width: 1.0),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text(
                                  '변경 내용 저장하기',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton(
                          onPressed: _loading ? null : _endEmployment,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.danger, width: 1.5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            foregroundColor: AppColors.danger,
                          ),
                          child: const Text(
                            '근무 종료하기 (비활성화)',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ] else ...[
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () => context.go('/settings'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.textMuted,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          child: const Text('돌아가기', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
    );
  }

  Widget _buildWageTypeButton(WageType type, String text, bool enabled) {
    final isSelected = _wageType == type;
    return GestureDetector(
      onTap: enabled ? () => setState(() => _wageType = type) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Center(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _selectTime(BuildContext context, TextEditingController controller) async {
    final parts = controller.text.split(':');
    final initialTime = parts.length == 2
        ? TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]))
        : const TimeOfDay(hour: 9, minute: 0);

    final picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final hourStr = picked.hour.toString().padLeft(2, '0');
      final minuteStr = picked.minute.toString().padLeft(2, '0');
      setState(() {
        controller.text = '$hourStr:$minuteStr';
      });
    }
  }

}
