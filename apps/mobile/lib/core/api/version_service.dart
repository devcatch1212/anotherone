import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'api_client.dart';

enum UpdateState {
  none,       // 최신 버전 (업데이트 불필요)
  optional,   // 선택 업데이트
  force,      // 강제 업데이트
}

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

  // 임시 마켓 주소 (실제 앱 배포 시 번들 ID 또는 앱 ID 기입)
  static const String _playStoreUrl = 'market://details?id=com.example.geumumapp';
  static const String _appStoreUrl = 'https://apps.apple.com/app/id6470000000'; // 임시 ID

  VersionService(this._apiClient);

  Future<VersionInfo> checkVersion() async {
    try {
      // 1. 현재 로컬 앱 버전 조회
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      // 2. 서버 설정 조회
      final res = await _apiClient.get<Map<String, dynamic>>('/api/app-config');
      
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
      if (_isVersionLessThan(currentVersion, minVersion)) {
        return VersionInfo(
          state: UpdateState.force,
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          storeUrl: storeUrl,
        );
      } else if (_isVersionLessThan(currentVersion, latestVersion)) {
        return VersionInfo(
          state: UpdateState.optional,
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          storeUrl: storeUrl,
        );
      }

      return VersionInfo(
        state: UpdateState.none,
        currentVersion: currentVersion,
        latestVersion: latestVersion,
        storeUrl: storeUrl,
      );
    } catch (e) {
      // 에러 발생 시 로그인은 할 수 있도록 검증을 패스시킴
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
