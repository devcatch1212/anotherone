'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboarding.store';
import { StepIndicator } from '@/components/ui';
import Script from 'next/script';

function splitAddress(fullAddress: string) {
  if (!fullAddress) return { address: '', detail: '' };
  const regex = /^(.*?[로길동읍면]\s+\d+(-\d+)?)(.*)$/;
  const match = fullAddress.match(regex);
  if (match) {
    return {
      address: match[1].trim(),
      detail: match[3].trim()
    };
  }
  return { address: fullAddress, detail: '' };
}

export default function CompanyPage() {
  const router = useRouter();
  const {
    setCompanyInfo,
    companyName: savedName,
    companyAddress: savedAddr,
    companyLat: savedLat,
    companyLng: savedLng,
  } = useOnboardingStore();
  const [companyName, setCompanyName] = useState(savedName);
  const parsedAddr = splitAddress(savedAddr);
  const [companyAddress, setCompanyAddress] = useState(parsedAddr.address);
  const [companyAddressDetail, setCompanyAddressDetail] = useState(parsedAddr.detail);
  const [lat, setLat] = useState(savedLat && savedLat !== 0 ? savedLat : 37.5004);
  const [lng, setLng] = useState(savedLng && savedLng !== 0 ? savedLng : 127.0368);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');

  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  useEffect(() => {
    console.log(`[Kakao SDK Diagnostics] Onboarding Page App Key 존재 여부: ${!!process.env.NEXT_PUBLIC_KAKAO_APP_KEY}`);

    if (typeof window === 'undefined') return;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (!appKey) return;

    const id = 'kakao-maps-sdk';
    const existingScript = document.getElementById(id);
    if (existingScript) {
      console.log('[Kakao SDK Diagnostics] Script already exists, skipping load.');
      if (window.kakao && window.kakao.maps) {
        setIsSdkLoaded(true);
      } else {
        existingScript.addEventListener('load', () => {
          setIsSdkLoaded(true);
        });
      }
      return;
    }

    console.log('[Kakao SDK Diagnostics] Inserting Kakao Maps SDK script...');
    const script = document.createElement('script');
    script.id = id;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      console.log('[Kakao SDK Diagnostics] Script onLoad triggered successfully');
      setIsSdkLoaded(true);
    };
    script.onerror = (e) => console.error('[Kakao SDK Diagnostics] Script load error:', e);
    document.head.appendChild(script);
  }, []);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!companyAddress || !isSdkLoaded || isGeocoding) {
      mapRef.current = null;
      markerRef.current = null;
      return;
    }
    
    const hasKakaoMaps = window.kakao && window.kakao.maps;
    if (!hasKakaoMaps) return;

    window.kakao.maps.load(() => {
      try {
        const container = document.getElementById('kakao-map');
        if (!container) return;

        if (mapRef.current && markerRef.current) {
          const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
          const currentMarkerPos = markerRef.current.getPosition();
          if (Math.abs(currentMarkerPos.getLat() - lat) > 0.00001 || Math.abs(currentMarkerPos.getLng() - lng) > 0.00001) {
            markerRef.current.setPosition(moveLatLng);
            mapRef.current.setCenter(moveLatLng);
          }
          return;
        }

        console.log('[Kakao Map] Initializing map...');
        const options = {
          center: new window.kakao.maps.LatLng(lat, lng),
          level: 3
        };

        const map = new window.kakao.maps.Map(container, options);
        mapRef.current = map;

        const markerPosition = new window.kakao.maps.LatLng(lat, lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          draggable: true
        });

        marker.setMap(map);
        markerRef.current = marker;

        window.kakao.maps.event.addListener(marker, 'dragend', () => {
          const latlng = marker.getPosition();
          setLat(latlng.getLat());
          setLng(latlng.getLng());
        });

        setTimeout(() => {
          map.relayout();
          map.setCenter(markerPosition);
        }, 100);

      } catch (err) {
        console.error('[Kakao Map] 지도 로드 중 에러:', err);
      }
    });
  }, [companyAddress, lat, lng, isSdkLoaded, isGeocoding]);

  // 카카오 주소 검색 실행
  const openAddressSearch = () => {
    if (typeof window === 'undefined') return;

    if (!window.daum) {
      alert('주소 검색 서비스를 로드하는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    new window.daum.Postcode({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oncomplete: (data: any) => {
        const fullAddress = data.address;
        setCompanyAddress(fullAddress);
        setCompanyAddressDetail('');
        setIsGeocoding(true);
        // 카카오 맵 SDK가 로드되어 있는지 확인 (autoload=false이므로 services는 load 콜백 이후에 접근 가능)
        const hasKakaoMaps = window.kakao && window.kakao.maps;

        if (hasKakaoMaps) {
          window.kakao.maps.load(() => {
            try {
              const geocoder = new window.kakao.maps.services.Geocoder();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              geocoder.addressSearch(fullAddress, (result: any[], status: any) => {
                if (status === window.kakao.maps.services.Status.OK && result[0]) {
                  const latitude = parseFloat(result[0].y);
                  const longitude = parseFloat(result[0].x);
                  setLat(latitude);
                  setLng(longitude);
                  console.log(`[Kakao Geocoder] 주소 변환 성공: ${fullAddress} -> (${latitude}, ${longitude})`);
                } else {
                  console.warn(`[Kakao Geocoder] 주소 변환 실패. Mock 좌표를 적용합니다. 주소: ${fullAddress}`);
                  setLat(37.5004);
                  setLng(127.0368);
                }
                setIsGeocoding(false);
              });
            } catch (err) {
              console.error('[Kakao Geocoder] Geocoder 초기화 중 오류 발생. Mock 좌표를 적용합니다.', err);
              setLat(37.5004);
              setLng(127.0368);
              setIsGeocoding(false);
            }
          });
        } else {
          console.warn('[Kakao Geocoder] Kakao Maps SDK가 로드되지 않았습니다. Mock 좌표를 적용합니다.');
          setLat(37.5004);
          setLng(127.0368);
          setIsGeocoding(false);
        }
      },
    }).open();
  };

  const handleNext = () => {
    setError('');
    if (isGeocoding) {
      setError('위치 변환이 아직 완료되지 않았습니다. 잠시만 기다려 주세요.');
      return;
    }
    if (!companyName.trim()) {
      setError('회사명을 입력해주세요');
      return;
    }
    if (!companyAddress.trim()) {
      setError('회사 주소를 선택해주세요');
      return;
    }
    const finalAddress = companyAddressDetail.trim() 
      ? `${companyAddress} ${companyAddressDetail.trim()}` 
      : companyAddress;
    setCompanyInfo({ companyName, companyAddress: finalAddress, companyLat: lat, companyLng: lng });
    router.push('/onboarding/complete');
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 상단 반투명 헤더 */}
      <div 
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '48px 20px 16px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <StepIndicator steps={3} current={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>2/3</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          회사 정보 입력
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          출퇴근 인증을 위해 근무지 위치를 등록해주세요
        </p>
      </div>

      <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 회사 정보 카드 */}
        <div 
          className="glass-card"
          style={{
            borderRadius: 24, padding: '24px 20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', flexDirection: 'column', gap: 20
          }}
        >
          {/* 회사명 */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>회사명</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="(주)회사이름"
              style={{
                width: '100%', height: 46, borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '0 14px', fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-primary)', outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.border = '1px solid var(--color-primary)';
                e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
              }}
              onBlur={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 회사 주소 */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>회사 주소</label>
            <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
              <input
                type="text"
                value={companyAddress}
                readOnly
                placeholder="주소 검색 버튼을 눌러주세요"
                style={{
                  flex: 1, minWidth: 0, height: 46, borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '0 14px', fontSize: 13, fontWeight: 600,
                  color: 'var(--color-text-primary)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={openAddressSearch}
                style={{
                  height: 46, padding: '0 16px',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  borderRadius: 14, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  flexShrink: 0, whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                주소 검색
              </button>
            </div>
            <input 
              value={companyAddressDetail} 
              onChange={e => setCompanyAddressDetail(e.target.value)}
              placeholder="상세 주소를 입력하세요"
              style={{
                width: '100%', height: 46, borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '0 14px', fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-primary)', outline: 'none',
                boxSizing: 'border-box',
                marginTop: 6,
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.border = '1px solid var(--color-primary)';
                e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
              }}
              onBlur={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {companyAddress && (
              <div 
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12, padding: '10px 14px', marginTop: 6
                }}
              >
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                  {companyAddress} {companyAddressDetail}
                </span>
              </div>
            )}
            <div style={{ display: (companyAddress && !isGeocoding) ? 'flex' : 'none', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                📍 출퇴근 위치 미세 조정 (핀을 드래그하여 정확히 맞춰주세요)
              </label>
              <div 
                id="kakao-map" 
                style={{ 
                  width: '100%', 
                  height: 180, 
                  borderRadius: 16, 
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 500 }}>
              💡 등록된 주소 기준 반경 100m 이내에서 출퇴근이 가능합니다
            </p>
          </div>

          {error && (
            <div 
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 14, padding: '12px 16px',
                fontSize: 13, color: 'var(--color-danger)', fontWeight: 600
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* 이전 / 다음 단계 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                height: 50, borderRadius: 16, border: 'none',
                background: 'rgba(0, 0, 0, 0.05)',
                color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'none'}
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={isGeocoding}
              style={{
                height: 50, borderRadius: 16, border: 'none',
                background: isGeocoding 
                  ? 'var(--color-text-muted)' 
                  : 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: isGeocoding ? 'not-allowed' : 'pointer', 
                boxShadow: isGeocoding ? 'none' : '0 6px 16px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s',
                opacity: isGeocoding ? 0.7 : 1
              }}
              onMouseDown={e => {
                if (isGeocoding) return;
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseUp={e => {
                if (isGeocoding) return;
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isGeocoding ? '위치 변환 중...' : '다음 단계 →'}
            </button>
          </div>
        </div>
      </div>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="afterInteractive"
      />
    </div>
  );
}
