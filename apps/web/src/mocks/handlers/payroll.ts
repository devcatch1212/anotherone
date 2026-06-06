import { http, HttpResponse } from 'msw';
import { mockPayroll } from '../data/payroll';

export const payrollHandlers = [
  http.get('/api/payroll', () => {
    return HttpResponse.json({ records: mockPayroll });
  }),

  http.get('/api/payroll/:id', ({ params }) => {
    const record = mockPayroll.find(p => p.id === params.id);
    if (!record) return HttpResponse.json({ message: '명세서를 찾을 수 없습니다.' }, { status: 404 });
    return HttpResponse.json({ record });
  }),

  http.post('/api/payroll/:id/confirm', ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),
];
