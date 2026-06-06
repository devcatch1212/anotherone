'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/Toast';

const schema = z.object({
  type: z.enum(['annual', 'half', 'sick', 'official']),
  startDate: z.string().min(1, '시작일을 선택해주세요'),
  endDate: z.string().min(1, '종료일을 선택해주세요'),
  reason: z.string().min(2, '사유를 2자 이상 입력해주세요'),
});
type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'annual', label: '연차', emoji: '🌴' },
  { value: 'half',   label: '반차', emoji: '🌤' },
  { value: 'sick',   label: '병가', emoji: '🏥' },
  { value: 'official', label: '공가', emoji: '📋' },
];

export default function LeaveApplyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'annual' },
  });
  const selectedType = watch('type');

  const onSubmit = async (data: FormData) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const days = data.type === 'half' ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, days }),
    });
    toast('휴가 신청이 완료되었습니다 ✅', 'success');
    router.replace('/leave');
  };

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">휴가 신청</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col gap-4 pb-24">
        {/* 휴가 종류 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">휴가 종류</h2>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setValue('type', opt.value as FormData['type'])}
                className={`rounded-xl border-2 p-3.5 text-left transition-all ${selectedType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <span className="text-xl">{opt.emoji}</span>
                <p className="font-semibold text-gray-900 mt-1 text-sm">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-700">기간 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">시작일</label>
              <input type="date" {...register('startDate')} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">종료일</label>
              <input type="date" {...register('endDate')} disabled={selectedType === 'half'} className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50" />
            </div>
          </div>
        </div>

        {/* 사유 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700">사유</h2>
          <textarea {...register('reason')} rows={4} placeholder="휴가 사유를 입력해주세요" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
          {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="h-14 w-full bg-blue-500 text-white font-bold rounded-xl text-base shadow-sm shadow-blue-200 disabled:opacity-50">
          {isSubmitting ? '신청 중...' : '신청하기'}
        </button>
      </form>
    </div>
  );
}
