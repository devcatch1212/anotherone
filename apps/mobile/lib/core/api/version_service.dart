import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'api_client.dart';

enum UpdateState {
  none,       // 최신 버전 (업데이트 불필요)
  optional,   // 선택 업데이트
  force,      // 강제 업데이트
}

// GoRouter가 버전 체크 완료 전까지 스플래시를 유지하도록 하는 플래그
final versionCheckDoneProvider = StateProvider<bool>((ref) => false);

class VersionInfo {
  final UpdateState state;
  final String currentVersion;
  final String latestVersion;
  final String storeUrl;

  VersionInfo({
    required this.state,
    required this.currentVersion,
    required this.latestVersion,
    required this.storeUrl,
  });
}

final versionServiceProvider = Provider<VersionService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return VersionService(apiClient);
});

class VersionService {
  final ApiClient _apiClient;

  // 실제 마켓 주소 반영
  static const String _playStoreUrl = 'market://details?id=com.catchily.geumumu';
  static const String _appStoreUrl = 'https://apps.apple.com/app/id6788237254';

  VersionService(this._apiClient);

  Future<VersionInfo> checkVersion() async {
    try {
      // 1. 현재 로컬 앱 버전 조회
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      print('[VersionCheck] 현재 앱 버전: $currentVersion');

      // 2. 서버 설정 조회
      final res = await _apiClient.get<Map<String, dynamic>>('/api/app-config');
      print('[VersionCheck] 서버 응답: $res');
      
      final String latestVersion;
      final String minVersion;
      final String storeUrl;

      if (Platform.isAndroid) {
        latestVersion = res['android']['latestVersion'] as String;
        minVersion = res['android']['minVersion'] as String;
        storeUrl = _playStoreUrl;
      } else if (Platform.isIOS) {
        latestVersion = res['ios']['latestVersion'] as String;
        minVersion = res['ios']['minVersion'] as String;
        storeUrl = _appStoreUrl;
      } else {
        // 기타 플랫폼은 업데이트 체크 생략
        return VersionInfo(
          state: UpdateState.none,
          currentVersion: currentVersion,
          latestVersion: currentVersion,
          storeUrl: '',
        );
      }

      // 3. 버전 비교 검증
      print('[VersionCheck] 비교: current=$currentVersion, min=$minVersion, latest=$latestVersion');
      if (_isVersionLessThan(currentVersion, minVersion)) {
        print('[VersionCheck] → 강제 업데이트');
        return VersionInfo(
          state: UpdateState.force,
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          storeUrl: storeUrl,
        );
      } else if (_isVersionLessThan(currentVersion, latestVersion)) {
        print('[VersionCheck] → 선택 업데이트');
        return VersionInfo(
          state: UpdateState.optional,
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          storeUrl: storeUrl,
        );
      }
      print('[VersionCheck] → 최신 버전 (팝업 없음)');

      return VersionInfo(
        state: UpdateState.none,
        currentVersion: currentVersion,
        latestVersion: latestVersion,
        storeUrl: storeUrl,
      );
    } catch (e) {
      // 에러 발생 시 로그인은 할 수 있도록 검증을 패스시킴
      print('[VersionCheck] ❌ 버전 체크 실패: $e');
      return VersionInfo(
        state: UpdateState.none,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        storeUrl: '',
      );
    }
  }

  // SemVer 버전 비교 헬퍼 (current < target 이면 true 반환)
  bool _isVersionLessThan(String current, String target) {
    try {
      final currentParts = current.split('+').first.split('.').map(int.parse).toList();
      final targetParts = target.split('+').first.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final currentPart = i < currentParts.length ? currentParts[i] : 0;
        final targetPart = i < targetParts.length ? targetParts[i] : 0;

        if (currentPart < targetPart) return true;
        if (currentPart > targetPart) return false;
      }
    } catch (_) {
      // 파싱 실패 시 업데이트 안 함 처리로 기본 방어
      return false;
    }
    return false;
  }
}
