import { LeaveRecord, LeaveBalance } from '@/types';

export const mockLeaveBalance: LeaveBalance = {
  total: 15,
  used: 4,
  remaining: 11,
};

export const mockLeaves: LeaveRecord[] = [
  {
    id: 'leave-1',
    companyId: 'company-1',
    type: 'annual',
    startDate: '2026-05-02',
    endDate: '2026-05-02',
    days: 1,
    reason: '개인 사유',
    status: 'approved',
    appliedAt: '2026-04-28T10:00:00Z',
  },
  {
    id: 'leave-2',
    companyId: 'company-1',
    type: 'half',
    startDate: '2026-04-15',
    endDate: '2026-04-15',
    days: 0.5,
    reason: '병원 방문',
    status: 'approved',
    appliedAt: '2026-04-14T09:00:00Z',
  },
  {
    id: 'leave-3',
    companyId: 'company-1',
    type: 'annual',
    startDate: '2026-06-10',
    endDate: '2026-06-11',
    days: 2,
    reason: '여행',
    status: 'pending',
    appliedAt: '2026-06-01T11:00:00Z',
  },
];
