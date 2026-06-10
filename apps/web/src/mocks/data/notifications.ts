import { Notification } from '@/types';

export const mockNotifications: Notification[] = [
  {
    id: 'noti-1',
    companyId: 'company-1',
    type: 'payroll_issued',
    title: '5월 급여가 지급되었습니다',
    body: '2026년 5월 급여 2,021,421원이 지급되었습니다.',
    read: false,
    createdAt: '2026-05-25T09:00:00Z',
  },
  {
    id: 'noti-2',
    companyId: 'company-1',
    type: 'leave_approved',
    title: '휴가 신청이 승인되었습니다',
    body: '6월 10일~11일 연차 휴가가 승인되었습니다.',
    read: false,
    createdAt: '2026-06-02T14:30:00Z',
  },
  {
    id: 'noti-3',
    companyId: 'company-1',
    type: 'overtime_approved',
    title: '연장근로 신청이 승인되었습니다',
    body: '5월 28일 2시간 연장근로가 승인되었습니다.',
    read: true,
    createdAt: '2026-05-28T17:00:00Z',
  },
];
