import { http, HttpResponse } from 'msw';
import { mockLeaves, mockLeaveBalance } from '../data/leave';

export const leaveHandlers = [
  http.get('/api/leave', () => {
    return HttpResponse.json({ records: mockLeaves, balance: mockLeaveBalance });
  }),

  http.post('/api/leave', async ({ request }) => {
    const body = await request.json() as any;
    const newLeave = { id: 'leave-new-' + Date.now(), ...body, status: 'pending', appliedAt: new Date().toISOString() };
    return HttpResponse.json({ record: newLeave });
  }),
];
