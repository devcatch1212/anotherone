'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Inquiry {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string | null };
  company: { id: string; name: string } | null;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 답변 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (search) params.set('search', search);
      const data = await apiFetch<Inquiry[]>(`/api/admin/inquiries?${params.toString()}`);
      setInquiries(data);
    } catch (err: any) {
      setError(err.message || '이용문의 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, [filterStatus, search]);

  const openAnswerModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAnswerText(inquiry.answer ?? '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedInquiry(null);
    setAnswerText('');
  };

  const submitAnswer = async () => {
    if (!selectedInquiry || !answerText.trim()) return;
    if (!window.confirm('이 문의에 답변을 등록하시겠습니까?')) return;
    try {
      setAnswerLoading(true);
      await apiFetch(`/api/admin/inquiries/${selectedInquiry.id}/answer`, {
        method: 'PATCH',
        body: JSON.stringify({ answer: answerText.trim() }),
      });
      closeModal();
      loadInquiries();
    } catch (err: any) {
      alert(err.message || '답변 등록에 실패했습니다.');
    } finally {
      setAnswerLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            이용문의 관리
          </h1>
          {pendingCount > 0 && (
            <span style={{
              backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '12px',
              fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
            }}>
              미답변 {pendingCount}건
            </span>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          사용자가 앱에서 등록한 이용문의를 확인하고 답변을 작성합니다.
        </p>
      </div>

      {/* 필터 및 검색 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'pending', 'answered'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: filterStatus === s ? '#2563eb' : '#f1f5f9',
                color: filterStatus === s ? '#fff' : '#475569',
              }}
            >
              {s === 'all' ? '전체' : s === 'pending' ? '답변 대기' : '답변 완료'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '380px' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="제목, 내용, 이름 검색..."
            style={{
              flex: 1, padding: '8px 14px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={() => setSearch(searchInput)}
            style={{
              padding: '8px 14px', borderRadius: '10px', backgroundColor: '#0f172a',
              color: '#fff', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
            }}
          >
            검색
          </button>
        </div>
      </div>

      {/* 오류 */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#dc2626', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>불러오는 중...</div>
      ) : inquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <div style={{ fontWeight: '600' }}>등록된 이용문의가 없습니다.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {inquiries.map(inquiry => (
            <div
              key={inquiry.id}
              style={{
                backgroundColor: '#fff', borderRadius: '16px', padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
              }}
            >
              {/* 상단 메타 정보 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
                      backgroundColor: inquiry.status === 'pending' ? '#fef9c3' : '#dcfce7',
                      color: inquiry.status === 'pending' ? '#92400e' : '#166534',
                    }}>
                      {inquiry.status === 'pending' ? '답변 대기' : '답변 완료'}
                    </span>
                    {inquiry.company && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>📍 {inquiry.company.name}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                    {inquiry.title}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {inquiry.user.name} ({inquiry.user.email ?? '이메일 없음'}) &middot; {formatDate(inquiry.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => openAnswerModal(inquiry)}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    backgroundColor: inquiry.status === 'pending' ? '#2563eb' : '#f1f5f9',
                    color: inquiry.status === 'pending' ? '#fff' : '#475569',
                  }}
                >
                  {inquiry.status === 'pending' ? '답변 작성' : '답변 수정'}
                </button>
              </div>

              {/* 문의 내용 */}
              <div style={{
                backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px 16px',
                fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                marginBottom: inquiry.answer ? '12px' : '0',
              }}>
                {inquiry.content}
              </div>

              {/* 답변 내용 */}
              {inquiry.answer && (
                <div style={{
                  backgroundColor: '#eff6ff', borderRadius: '10px', padding: '12px 16px',
                  borderLeft: '3px solid #3b82f6',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', marginBottom: '6px' }}>
                    관리자 답변 {inquiry.answeredAt ? `· ${formatDate(inquiry.answeredAt)}` : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {inquiry.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 답변 작성 모달 */}
      {modalOpen && selectedInquiry && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '28px',
            width: '100%', maxWidth: '560px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
              이용문의 답변 작성
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
              {selectedInquiry.user.name}님의 문의에 답변을 작성합니다.
            </p>

            {/* 원문 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                문의 원문
              </div>
              <div style={{
                backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px 16px',
                fontSize: '14px', color: '#334155', lineHeight: '1.6',
                maxHeight: '120px', overflowY: 'auto',
              }}>
                <strong>{selectedInquiry.title}</strong>
                <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{selectedInquiry.content}</div>
              </div>
            </div>

            {/* 답변 입력 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                답변 내용 *
              </div>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="사용자에게 전달할 답변을 입력해 주세요..."
                rows={6}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0', fontSize: '14px', lineHeight: '1.6',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                  backgroundColor: '#fff', color: '#64748b', fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={submitAnswer}
                disabled={!answerText.trim() || answerLoading}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  backgroundColor: !answerText.trim() || answerLoading ? '#94a3b8' : '#2563eb',
                  color: '#fff', fontSize: '14px', fontWeight: '600',
                  cursor: !answerText.trim() || answerLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {answerLoading ? '저장 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
