import 'dart:io';
import 'package:dio/dio.dart';
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
  return VersionService();
});

class VersionService {
  // 인증 인터셉터 없는 순수 Dio (버전 체크는 공개 엔드포인트)
  final _dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  // 실제 마켓 주소 반영
  static const String _playStoreUrl = 'market://details?id=com.catchily.geumumu';
  static const String _appStoreUrl = 'https://apps.apple.com/app/id6788237254';

  Future<VersionInfo> checkVersion() async {
    try {
      // 1. 현재 로컬 앱 버전 조회
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      print('[VersionCheck] 현재 앱 버전: $currentVersion');

      // 2. 서버 설정 조회 (인증 없이 순수 호출)
      final res = await _dio.get<Map<String, dynamic>>('/api/app-config');
      final data = res.data!;
      print('[VersionCheck] 서버 응답: $data');
      
      final String latestVersion;
      final String minVersion;
      final String storeUrl;

      if (Platform.isAndroid) {
        latestVersion = data['android']['latestVersion'] as String;
        minVersion = data['android']['minVersion'] as String;
        storeUrl = _playStoreUrl;
      } else if (Platform.isIOS) {
        latestVersion = data['ios']['latestVersion'] as String;
        minVersion = data['ios']['minVersion'] as String;
        storeUrl = _appStoreUrl;
      } else {
        return VersionInfo(
          state: UpdateState.none,
          currentVersion: currentVersion,
          latestVersion: currentVersion,
          storeUrl: '',
        );
      }

      // 3. 버전 비교
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
      print('[VersionCheck] ❌ 버전 체크 실패: $e');
      // 실패 시 현재 버전을 유지하며 팝업 없이 앱 진입
      final packageInfo = await PackageInfo.fromPlatform().catchError((_) => null);
      final currentVersion = packageInfo?.version ?? '0.0.0';
      return VersionInfo(
        state: UpdateState.none,
        currentVersion: currentVersion,
        latestVersion: currentVersion,
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
      return false;
    }
    return false;
  }
}
