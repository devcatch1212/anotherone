'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { generateContractContent } from '../../../../../api/src/admin/contract-templates';

interface CompanyOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  employmentId: string;
  userId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  position: string;
  wageType: string;
  hourlyWage?: number;
  monthlyWage?: number;
  workStartTime?: string;
  workEndTime?: string;
  weeklyWorkDays?: number;
  breakMinutes?: number;
}

interface ContractItem {
  id: string;
  type: 'labor' | 'salary' | 'nda' | 'privacy';
  title: string;
  content: string;
  status: 'pending' | 'signed' | 'rejected';
  signedAt: string | null;
  signatureData: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    address?: string;
  };
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  labor: { label: '근로계약서', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  salary: { label: '연봉계약서', bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  nda: { label: '비밀유지서약서', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  privacy: { label: '개인정보동의서', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '서명 대기', bg: '#FFFBEB', color: '#B45309' },
  signed: { label: '서명 완료', bg: '#F0FDF4', color: '#15803D' },
  rejected: { label: '거절', bg: '#FFF1F2', color: '#BE123C' },
};

export default function ContractsPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터 상태
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 페이징 상태
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // 모달 상태
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  // 신규 작성 폼 상태
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formUserId, setFormUserId] = useState<string>('');
  const [formType, setFormType] = useState<'labor' | 'salary' | 'nda' | 'privacy'>('labor');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 근무지 및 근로자 전수 데이터 로드
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const compList = await apiFetch<CompanyOption[]>('/api/admin/companies');
      setCompanies(compList);

      // 전체 근무지 근로자 모으기
      const allEmps: EmployeeOption[] = [];
      for (const comp of compList) {
        try {
          const res = await apiFetch<{ company: any; employees: any[] }>(`/api/admin/companies/${comp.id}/employees`);
          res.employees.forEach(e => {
            allEmps.push({
              employmentId: e.employmentId,
              userId: e.userId,
              name: e.name,
              email: e.email,
              companyId: comp.id,
              companyName: comp.name,
              position: e.position || '사원',
              wageType: e.wageType || 'hourly',
              hourlyWage: e.hourlyWage,
              monthlyWage: e.monthlyWage,
              workStartTime: e.workStartTime || '09:00',
              workEndTime: e.workEndTime || '18:00',
              weeklyWorkDays: e.weeklyWorkDays || 5,
            });
          });
        } catch {}
      }
      setEmployees(allEmps);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 계약서 목록 조회
  const loadContracts = async () => {
    try {
      const params: any = {};
      if (selectedCompanyId !== 'all') params.companyId = selectedCompanyId;
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const data = await apiFetch<ContractItem[]>('/api/admin/contracts', { params });
      setContracts(data);
      setPage(1);
    } catch (err: any) {
      setError(err.message || '계약서 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadContracts();
  }, [selectedCompanyId, selectedType, selectedStatus]);

  // 서식 자동 매핑 생성
  const handleAutoGenerateContent = (type: 'labor' | 'salary' | 'nda' | 'privacy', userId: string, companyId: string) => {
    const emp = employees.find(e => e.userId === userId && e.companyId === companyId);
    const comp = companies.find(c => c.id === companyId);

    const generated = generateContractContent(type, {
      companyName: comp ? comp.name : '사업주',
      companyAddress: '지정 사업장',
      employeeName: emp ? emp.name : '근로자',
      employeeEmail: emp?.email,
      position: emp?.position || '사원',
      wageType: emp?.wageType || 'hourly',
      wageAmount: emp?.hourlyWage || emp?.monthlyWage || 10030,
      workStartTime: emp?.workStartTime || '09:00',
      workEndTime: emp?.workEndTime || '18:00',
      weeklyWorkDays: emp?.weeklyWorkDays || 5,
    });

    setFormTitle(generated.title);
    setFormContent(generated.content);
  };

  // 근로자 선택 시 양식 세팅
  const handleSelectEmployee = (userId: string) => {
    setFormUserId(userId);
    const emp = employees.find(e => e.userId === userId && e.companyId === formCompanyId);
    if (emp) {
      handleAutoGenerateContent(formType, userId, formCompanyId);
    }
  };

  // 서식 종류 탭 변경 시 문안 세팅
  const handleTypeChange = (type: 'labor' | 'salary' | 'nda' | 'privacy') => {
    setFormType(type);
    if (formUserId && formCompanyId) {
      handleAutoGenerateContent(type, formUserId, formCompanyId);
    }
  };

  // 발송 제출
  const handleCreateSubmit = async () => {
    if (!formCompanyId || !formUserId) {
      alert('근무지와 근로자를 선택해주세요.');
      return;
    }
    if (!formTitle || !formContent) {
      alert('계약서 제목과 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch('/api/admin/contracts', {
        method: 'POST',
        body: JSON.stringify({
          companyId: formCompanyId,
          userId: formUserId,
          type: formType,
          title: formTitle,
          content: formContent,
        }),
      });

      alert('🎉 전자계약서 작성 및 서명 요청 발송이 완료되었습니다!');
      setCreateModalOpen(false);
      loadContracts();
    } catch (err: any) {
      alert(err.message || '계약서 발송 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 알림 재발송
  const handleRemind = async (id: string) => {
    try {
      await apiFetch(`/api/admin/contracts/${id}/remind`, { method: 'POST' });
      alert('🔔 근로자에게 서명 요청 재알림이 발송되었습니다.');
    } catch (err: any) {
      alert(err.message || '알림 발송 중 오류가 발생했습니다.');
    }
  };

  // 계약서 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 전자계약서를 폐기/삭제하시겠습니까?')) return;
    try {
      await apiFetch(`/api/admin/contracts/${id}`, { method: 'DELETE' });
      alert('계약서가 삭제되었습니다.');
      loadContracts();
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  // 검색 필터링
  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalCount = filteredContracts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  // 현황 집계
  const totalSigned = contracts.filter(c => c.status === 'signed').length;
  const totalPending = contracts.filter(c => c.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 타이틀 헤더 */}
      <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
            전자계약 관리
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            종이 문서 없이 근로계약서, 연봉계약서, 비밀유지서약서, 개인정보동의서 4종 서식을 신속하게 작성·발송하고 서명 내역을 관리합니다.
          </p>
        </div>

        <button
          onClick={() => {
            setFormCompanyId(companies[0]?.id || '');
            setFormUserId('');
            setFormType('labor');
            setFormTitle('');
            setFormContent('');
            setCreateModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)'
          }}
        >
          + 신규 전자계약 작성
        </button>
      </div>

      {/* 대시보드 KPI 관제 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>전체 전자계약</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#0F172A', marginTop: '6px' }}>{contracts.length}<span style={{ fontSize: '14px', marginLeft: '2px', color: '#64748B' }}>건</span></div>
        </div>
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D' }}>서명 완료</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#166534', marginTop: '6px' }}>{totalSigned}<span style={{ fontSize: '14px', marginLeft: '2px' }}>건</span></div>
        </div>
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B45309' }}>서명 대기</div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#92400E', marginTop: '6px' }}>{totalPending}<span style={{ fontSize: '14px', marginLeft: '2px' }}>건</span></div>
        </div>
      </div>

      {/* 필터 및 검색 컨트롤 랙 */}
      <div 
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* 검색바 */}
          <input
            type="text"
            placeholder="제목, 근로자명, 근무지 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: '600',
              outline: 'none',
              width: '200px'
            }}
          />

          {/* 서식 구분 */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            <option value="all">전체 서식 (4종)</option>
            <option value="labor">근로계약서</option>
            <option value="salary">연봉계약서</option>
            <option value="nda">비밀유지서약서</option>
            <option value="privacy">개인정보동의서</option>
          </select>

          {/* 상태 구분 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            <option value="all">전체 서명 상태</option>
            <option value="pending">서명 대기</option>
            <option value="signed">서명 완료</option>
            <option value="rejected">거절</option>
          </select>

          {/* 근무지 선택 */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            <option value="all">전체 근무지</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 페이지 당 표시 개수 */}
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          {[10, 20, 50, 100].map(s => (
            <option key={s} value={s}>{s}개씩 보기</option>
          ))}
        </select>
      </div>

      {/* 데이터 테이블 컨테이너 */}
      <div 
        className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ height: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
            등록되거나 발송된 전자계약서 내역이 없습니다.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B' }}>
                <tr>
                  <th style={{ padding: '16px 24px' }}>계약서 제목 / 서식</th>
                  <th style={{ padding: '16px 24px' }}>근로자 (이메일)</th>
                  <th style={{ padding: '16px 24px' }}>소속 근무지</th>
                  <th style={{ padding: '16px 24px' }}>발송 일시</th>
                  <th style={{ padding: '16px 24px' }}>서명 상태</th>
                  <th style={{ padding: '16px 24px', textAlign: 'center' }}>계약서 열람 및 관리</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {filteredContracts.slice(startIndex, endIndex).map(c => {
                  const typeCfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.labor;
                  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '14px' }}>{c.title}</div>
                        <span 
                          style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: typeCfg.bg,
                            color: typeCfg.color,
                            border: `1px solid ${typeCfg.border}`
                          }}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B' }}>{c.user.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{c.user.email || `(기기 계정) ${c.user.name}`}</div>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#475569', fontWeight: '600' }}>
                        {c.company.name}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#64748B', fontSize: '12px' }}>
                        {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span 
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: statusCfg.bg,
                            color: statusCfg.color
                          }}
                        >
                          {statusCfg.label}
                        </span>
                        {c.signedAt && (
                          <div style={{ fontSize: '10px', color: '#15803D', marginTop: '2px', fontWeight: '600' }}>
                            {new Date(c.signedAt).toLocaleDateString('ko-KR')} 서명 완료
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedContract(c);
                              setDetailModalOpen(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            열람 및 인쇄
                          </button>
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleRemind(c.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#2563EB',
                                cursor: 'pointer'
                              }}
                            >
                              재알림
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              color: '#BE123C',
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 공통 페이징 하단 바 */}
        {filteredContracts.length > 0 && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#F8FAFC'
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
              총 <strong style={{ color: '#1E293B' }}>{totalCount}</strong>건 중{' '}
              <strong style={{ color: '#1E293B' }}>{startIndex + 1}-{endIndex}</strong>건 표시
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: page === 1 ? '#F1F5F9' : '#FFFFFF',
                  color: page === 1 ? '#94A3B8' : '#334155',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← 이전
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    fontSize: '13px',
                    fontWeight: pNum === page ? '700' : '600',
                    borderRadius: '8px',
                    border: pNum === page ? 'none' : '1px solid #E2E8F0',
                    backgroundColor: pNum === page ? '#2563EB' : '#FFFFFF',
                    color: pNum === page ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {pNum}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: page === totalPages ? '#F1F5F9' : '#FFFFFF',
                  color: page === totalPages ? '#94A3B8' : '#334155',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                다음 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. 신규 전자계약 작성 모달 */}
      {createModalOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0',
              padding: '28px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 }}>
              📝 신규 전자계약 작성 및 서명 요청
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: '20px' }}>
              근로자와 서식 템플릿을 선택하면 등록된 근로 조건이 문안에 자동 매핑됩니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* 근무지 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>근무지 선택</label>
                <select
                  value={formCompanyId}
                  onChange={(e) => {
                    setFormCompanyId(e.target.value);
                    setFormUserId('');
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="">근무지 선택...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 근로자 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>근로자 선택</label>
                <select
                  value={formUserId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  disabled={!formCompanyId}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="">근로자 선택...</option>
                  {employees.filter(e => e.companyId === formCompanyId).map(e => (
                    <option key={e.userId} value={e.userId}>{e.name} ({e.email || '기기 계정'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 서식 템플릿 4종 탭 선택 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>서식 템플릿 선택</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { id: 'labor', name: '표준 근로계약서' },
                  { id: 'salary', name: '연봉계약서' },
                  { id: 'nda', name: '비밀유지서약서' },
                  { id: 'privacy', name: '개인정보동의서' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeChange(t.id as any)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: formType === t.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: formType === t.id ? '#EFF6FF' : '#F8FAFC',
                      color: formType === t.id ? '#2563EB' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>계약서 제목</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="계약서 제목..."
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* 계약 내용 미리보기/편집 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>계약 전문 (필요 시 수정 가능)</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  lineHeight: '1.6',
                  color: '#1E293B',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  backgroundColor: '#F8FAFC'
                }}
              />
            </div>

            {/* 모달 액션 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreateSubmit}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                {submitting ? '발송 중...' : '서명 요청 발송하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. A4 양식 계약서 열람 및 인쇄 모달 */}
      {detailModalOpen && selectedContract && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}
          onClick={() => setDetailModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0',
              padding: '32px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단 툴바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB' }}>ELECTRONIC CONTRACT VIEW</span>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 }}>{selectedContract.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#334155', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  🖨️ 인쇄 / PDF 저장
                </button>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#94A3B8', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  닫기
                </button>
              </div>
            </div>

            {/* A4 서식 본문 */}
            <div 
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '40px',
                fontSize: '13px',
                lineHeight: '1.8',
                color: '#0F172A',
                whiteSpace: 'pre-wrap',
                fontFamily: 'serif',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}
            >
              {selectedContract.content}

              {/* 전자 서명 영역 */}
              <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '2px solid #0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>문서 ID: {selectedContract.id}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>발송 일시: {new Date(selectedContract.createdAt).toLocaleString('ko-KR')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>근로자 전자 서명 확인</div>
                  {selectedContract.status === 'signed' ? (
                    <div style={{ display: 'inline-block', border: '2px solid #166534', borderRadius: '8px', padding: '8px 16px', backgroundColor: '#F0FDF4', color: '#166534', fontWeight: '900', fontSize: '14px' }}>
                      ✓ 서명 완료 ({selectedContract.signedAt ? new Date(selectedContract.signedAt).toLocaleDateString('ko-KR') : ''})
                    </div>
                  ) : (
                    <div style={{ display: 'inline-block', border: '2px dashed #B45309', borderRadius: '8px', padding: '8px 16px', backgroundColor: '#FFFBEB', color: '#B45309', fontWeight: '700', fontSize: '13px' }}>
                      서명 대기 중
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
