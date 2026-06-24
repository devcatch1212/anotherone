// lib/core/api/api_client.dart
// Dio 기반 API 클라이언트

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/auth_storage.dart';

const String kBaseUrl = 'https://anotherone-tjgi.onrender.com';

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(authStorageProvider);
  // 주의: 401 자동 로그아웃 onUnauthorized는 auth_provider.dart의
  //       AuthNotifier.build()에서 ApiClient를 직접 인스턴스화하여 주입됩니다.
  //       이 Provider는 auth가 필요없는 화면(ex: 오늘링 전)에서 사용됩니다.
  return ApiClient(storage);
});

class ApiClient {
  final AuthStorage _storage;
  final Future<void> Function()? _onUnauthorized;
  late final Dio _dio;

  ApiClient(this._storage, {Future<void> Function()? onUnauthorized})
      : _onUnauthorized = onUnauthorized {
    _dio = Dio(
      BaseOptions(
        baseUrl: kBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // 401 Unauthorized: 토큰 만료 → 자동 로그아웃
          if (error.response?.statusCode == 401) {
            await _onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.get(path, queryParameters: queryParameters);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.post(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.put(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.patch(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.delete(path);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }
}

// API 에러 처리 헬퍼
String parseApiError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      return data['message']?.toString() ?? '서버 오류가 발생했습니다';
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return '서버 연결 시간이 초과되었습니다';
    }
    if (error.type == DioExceptionType.connectionError) {
      return '네트워크 연결을 확인해주세요';
    }
  }
  return '오류가 발생했습니다';
}
