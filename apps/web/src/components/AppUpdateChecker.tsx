'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui';

const CURRENT_APP_VERSION = '1.0.0';

export default function AppUpdateChecker() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // 앱 진입 시 1회 체크
    fetchApi('/api/app-config')
      .then((res) => setConfig(res))
      .catch((e) => console.error('App config fetch error:', e));
  }, []);

  if (!config) return null;

  const { maintenanceMode, forceUpdate, minVersion, latestVersion } = config;

  // 간단한 버전 비교 로직 (실제로는 semver 라이브러리 등 활용)
  const isVersionLower = (current: string, target: string) => {
    const cParts = current.split('.').map(Number);
    const tParts = target.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((cParts[i] || 0) < (tParts[i] || 0)) return true;
      if ((cParts[i] || 0) > (tParts[i] || 0)) return false;
    }
    return false;
  };

  if (maintenanceMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-gray-800 p-8 rounded-2xl max-w-sm w-full space-y-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">시스템 점검 중입니다</h2>
            <p className="text-gray-400 text-sm">더 나은 서비스를 위해 점검을 진행하고 있습니다. 잠시 후 다시 시도해 주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  const needsUpdate = forceUpdate && isVersionLower(CURRENT_APP_VERSION, minVersion);

  if (needsUpdate) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-gray-800 p-8 rounded-2xl max-w-sm w-full space-y-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">업데이트가 필요합니다</h2>
            <p className="text-gray-400 text-sm">앱의 원활한 사용을 위해 최신 버전({latestVersion})으로 업데이트 해주세요.</p>
          </div>
          <Button fullWidth onClick={() => window.location.reload()}>
            업데이트 하러 가기
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
