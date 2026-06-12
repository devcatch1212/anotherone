'use client';
import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';
import { fetchApi } from '@/lib/api';
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

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, currentCompanyId, updateEmployment } = useAuthStore();
  const { toast } = useToast();
  const initialTab = searchParams.get('tab') === 'password' ? 'password' : 'profile';
  const [tab, setTab] = useState<'profile' | 'password'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    console.log(`[Kakao SDK Diagnostics] Profile Page App Key 존재 여부: ${!!process.env.NEXT_PUBLIC_KAKAO_APP_KEY}`);
  }, []);

  const wageTypeRef = useRef<HTMLDivElement>(null);
  const wageInputRef = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const companyAddressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusTarget = searchParams.get('focus');
    if (!focusTarget) return;

    setTab('profile');

    const timer = setTimeout(() => {
      if (focusTarget === 'wageType' && wageTypeRef.current) {
        wageTypeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstBtn = wageTypeRef.current.querySelector('button');
        if (firstBtn) firstBtn.focus();
      } else if (focusTarget === 'wage' && wageInputRef.current) {
        wageInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        wageInputRef.current.focus();
      } else if (focusTarget === 'companyName' && companyNameRef.current) {
        companyNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        companyNameRef.current.focus();
      } else if (focusTarget === 'companyAddress' && companyAddressRef.current) {
        companyAddressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        companyAddressRef.current.focus();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const employment = user?.employments?.find(e => e.companyId === currentCompanyId) || user?.employments?.[0];

  // 급여/회사 정보 수정
  const [wageType, setWageType] = useState(employment?.wageType ?? 'hourly');
  const [hourlyWage, setHourlyWage] = useState(employment?.hourlyWage ?? 12000);
  const [dailyWage, setDailyWage] = useState(employment?.dailyWage ?? 100000);
  const [companyName, setCompanyName] = useState(employment?.company?.name ?? '');
  const initialAddr = employment?.company?.address ?? '';
  const parsedAddr = splitAddress(initialAddr);
  const [companyAddress, setCompanyAddress] = useState(parsedAddr.address);
  const [companyAddressDetail, setCompanyAddressDetail] = useState(parsedAddr.detail);
  const [lat, setLat] = useState(employment?.company?.latitude ?? 37.5004);
  const [lng, setLng] = useState(employment?.company?.longitude ?? 127.0368);

  // 기본 근무 시간 수정
  const [workStartTime, setWorkStartTime] = useState(employment?.workStartTime ?? '09:00');
  const [workEndTime, setWorkEndTime] = useState(employment?.workEndTime ?? '18:00');
  const [breakMinutes, setBreakMinutes] = useState(employment?.breakMinutes ?? 60);
  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>(employment?.workDaysOfWeek ?? [0, 1, 2, 3, 4]);

  const toggleDay = (idx: number) => {
    setWorkDaysOfWeek(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
    );
  };

  // 비밀번호 변경
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');

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

  const handleSaveProfile = async () => {
    if (isGeocoding) {
      toast('위치 좌표가 아직 변환 중입니다. 잠시 후 다시 시도해 주세요.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (employment) {
        const payload = {
          employmentId: employment.id,
          wageType,
          hourlyWage: wageType === 'hourly' ? hourlyWage : undefined,
          dailyWage: wageType === 'daily' ? dailyWage : undefined,
          companyName,
          companyAddress: companyAddressDetail.trim() 
            ? `${companyAddress} ${companyAddressDetail.trim()}` 
            : companyAddress,
          latitude: lat,
          longitude: lng,
          workStartTime,
          workEndTime,
          breakMinutes,
          workDaysOfWeek,
        };
        const { employment: updatedEmployment } = await fetchApi('/api/settings/profile', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        
        updateEmployment(employment.companyId, updatedEmployment);
      }
      toast('설정이 저장되었습니다', 'success');
    } catch (e: any) {
      toast(`오류: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEndEmployment = async () => {
    if (!window.confirm('정말 이 근무지에서의 근무를 종료(퇴사)하시겠습니까? 퇴사 후에는 출퇴근 체크를 하실 수 없으며, 과거 근무 이력과 급여 명세서는 그대로 보존됩니다.')) {
      return;
    }
    setSaving(true);
    try {
      if (employment) {
        const { employment: updated } = await fetchApi('/api/settings/employment/end', {
          method: 'POST',
          body: JSON.stringify({ employmentId: employment.id }),
        });
        updateEmployment(employment.companyId, updated);
        toast('근무가 종료되었습니다.', 'success');
        router.refresh();
        router.replace('/settings');
      }
    } catch (e: any) {
      toast(`오류: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) { setPwError('새 비밀번호가 일치하지 않습니다'); return; }
    if (pw.next.length < 6) { setPwError('비밀번호는 6자 이상이어야 합니다'); return; }
    setSaving(true);
    
    try {
      await fetchApi('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({ current: pw.current, next: pw.next }),
      });
      toast('비밀번호가 변경되었습니다', 'success');
      setPw({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      setPwError(e.message || '비밀번호 변경 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} 
          className="transition-all active:bg-white/40"
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer'
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="var(--color-text-primary)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          프로필 & 설정 수정
        </h1>
      </div>

      {/* 탭 컨트롤러 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', background: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 14, padding: 4, gap: 4,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {(['profile', 'password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="transition-all"
              style={{
                flex: 1, borderRadius: 10, border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: tab === t ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
                color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: tab === t ? '0 4px 12px rgba(0, 0, 0, 0.03)' : 'none',
                padding: '10px 0',
              }}>
              {t === 'profile' ? '급여 · 근무지' : '비밀번호 변경'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tab === 'profile' ? (
          <>
            {/* 근무 종료 상태 배너 */}
            {employment && !employment.isActive && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 16,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
                color: 'var(--color-danger)', fontSize: 13, fontWeight: 700
              }}>
                <span>🚫</span>
                <span>이 근무지는 이미 근무가 종료(퇴사)된 상태입니다.</span>
              </div>
            )}
            {/* 급여 유형 */}
            <div ref={wageTypeRef} className="glass-card" style={{
              borderRadius: 24, padding: '20px', flexDirection: 'column', display: 'flex', gap: 16,
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>급여 유형</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['hourly', 'daily'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setWageType(t)}
                    className="transition-all duration-300"
                    style={{
                      flex: 1, borderRadius: 14, fontStyle: 'normal',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      padding: '12px 0',
                      background: wageType === t 
                        ? 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)' 
                        : 'rgba(255, 255, 255, 0.25)',
                      color: wageType === t ? '#fff' : 'var(--color-text-secondary)',
                      border: wageType === t 
                        ? '1px solid rgba(255, 255, 255, 0.2)' 
                        : '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: wageType === t ? '0 6px 16px rgba(59, 130, 246, 0.15)' : 'none',
                    }}>
                    {t === 'hourly' ? '시급제' : '일급제'}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  {wageType === 'hourly' ? '시급 설정 (원)' : '일급 설정 (원)'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 700, color: 'var(--color-text-muted)' }}>₩</span>
                  <input ref={wageInputRef} type="number" value={wageType === 'hourly' ? hourlyWage : dailyWage} 
                    onChange={e => wageType === 'hourly' ? setHourlyWage(Number(e.target.value)) : setDailyWage(Number(e.target.value))}
                    style={{
                      width: '100%', height: 46, borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      padding: '0 14px 0 32px', fontSize: 15, fontWeight: 700,
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
              </div>
            </div>

            {/* 회사 정보 */}
            <div className="glass-card" style={{
              borderRadius: 24, padding: '20px', flexDirection: 'column', display: 'flex', gap: 16,
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>회사 정보</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>회사명</label>
                <input ref={companyNameRef} value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="회사명을 입력하세요"
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>근무지 주소</label>
                <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                  <input ref={companyAddressRef} value={companyAddress} readOnly
                    placeholder="주소 검색 버튼을 눌러주세요"
                    style={{
                      flex: 1, minWidth: 0, height: 46, borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      padding: '0 14px', fontSize: 14, fontWeight: 600,
                      color: 'var(--color-text-primary)', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button type="button" onClick={openAddressSearch}
                    style={{
                      height: 46, padding: '0 16px',
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
                      color: '#fff', fontSize: 13, fontStyle: 'normal',
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
                  placeholder="상세 주소를 입력하세요 (예: 101동 202호)"
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
              </div>
            </div>

            {/* 기본 근무 시간 설정 */}
            <div className="glass-card" style={{
              borderRadius: 24, padding: '20px', flexDirection: 'column', display: 'flex', gap: 16,
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>기본 근무 시간 설정</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>주당 근무요일</label>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                    {DAY_LABELS.map((label, idx) => (
                      <button key={idx} type="button" onClick={() => toggleDay(idx)}
                        style={{
                          width: 38, height: 38, borderRadius: '50%',
                          fontSize: 13, fontWeight: 800, cursor: 'pointer',
                          border: 'none',
                          background: workDaysOfWeek.includes(idx)
                            ? 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)'
                            : 'rgba(255, 255, 255, 0.25)',
                          color: workDaysOfWeek.includes(idx) ? '#fff' : 'var(--color-text-secondary)',
                          boxShadow: workDaysOfWeek.includes(idx) ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>출근 시간</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.3)', padding: '0 14px', height: 46, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                      <span style={{ fontSize: 16 }}>⏰</span>
                      <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)}
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>퇴근 시간</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.3)', padding: '0 14px', height: 46, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                      <span style={{ fontSize: 16 }}>⏰</span>
                      <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)}
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>휴게시간 (분)</label>
                  <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} min={0}
                    style={{
                      width: '100%', height: 46, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.3)', padding: '0 14px', fontSize: 14, fontWeight: 700,
                      color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box'
                    }} />
                </div>
              </div>
            </div>

            <button onClick={handleSaveProfile} disabled={saving || isGeocoding || !employment?.isActive}
              className="glass-btn-primary"
              style={{
                height: 54, width: '100%', borderRadius: 16, border: 'none',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: !employment?.isActive ? 0.6 : 1,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>

            {employment?.isActive && (
              <button onClick={handleEndEmployment} disabled={saving}
                className="transition-all active:bg-red-500/10"
                style={{
                  height: 50, width: '100%', borderRadius: 16, border: '1.5px solid var(--color-danger)',
                  background: 'transparent', color: 'var(--color-danger)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 12,
                }}>
                🚫 근무 종료 (퇴사 처리)
              </button>
            )}
          </>
        ) : (
          <form onSubmit={handleChangePassword} className="glass-card" style={{
            borderRadius: 24, padding: '20px', flexDirection: 'column', display: 'flex', gap: 16,
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}>
            {[
              { label: '현재 비밀번호', key: 'current' as const },
              { label: '새 비밀번호', key: 'next' as const },
              { label: '새 비밀번호 확인', key: 'confirm' as const },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input type="password" value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="••••••••"
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
            ))}
            {pwError && <p style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>⚠ {pwError}</p>}
            <button type="submit" disabled={saving}
              className="glass-btn-primary"
              style={{
                height: 48, width: '100%', borderRadius: 14, border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 8,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {saving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (!appKey) return;

    const id = 'kakao-maps-sdk';
    if (document.getElementById(id)) {
      console.log('[Kakao SDK Diagnostics] Script already exists, skipping load.');
      return;
    }

    console.log('[Kakao SDK Diagnostics] Inserting Kakao Maps SDK script...');
    const script = document.createElement('script');
    script.id = id;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => console.log('[Kakao SDK Diagnostics] Script onLoad triggered successfully');
    script.onerror = (e) => console.error('[Kakao SDK Diagnostics] Script load error:', e);
    document.head.appendChild(script);
  }, []);

  return (
    <>
      <Suspense fallback={
        <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          설정을 불러오는 중...
        </div>
      }>
        <ProfilePageContent />
      </Suspense>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="afterInteractive"
      />
    </>
  );
}
