import { useAuthStore } from '@/store/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://anotherone-tjgi.onrender.com';

export async function fetchApi(endpoint: string, options: RequestInit & { timeout?: number } = {}) {
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      cache: 'no-store', // 브라우저 캐싱 완벽 차단
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        try {
          const { handleGlobalLogout } = await import('@/utils/logout');
          await handleGlobalLogout();
        } catch (err) {
          console.error('Failed to handle global logout on 401:', err);
        }
      }

      let message = 'An error occurred';
      try {
        const errorData = await response.json();
        if (Array.isArray(errorData.message)) {
          message = errorData.message.join(', ');
        } else {
          message = errorData.message || message;
        }
      } catch (e) {
        // ignore
      }
      throw new Error(message);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('요청 시간이 초과됐어요. 네트워크 상태를 확인해주세요');
    }
    throw error;
  }
}
