import { http, HttpResponse } from 'msw';
import { mockAttendance } from '../data/attendance';
import { format } from 'date-fns';

export const attendanceHandlers = [
  http.get('/api/attendance', ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    return HttpResponse.json({ records: mockAttendance });
  }),

  http.post('/api/attendance/check-in', async () => {
    const now = new Date();
    return HttpResponse.json({
      record: {
        id: 'att-new-' + Date.now(),
        date: format(now, 'yyyy-MM-dd'),
        checkIn: now.toISOString(),
        status: now.getHours() >= 9 && now.getMinutes() > 0 ? 'late' : 'normal',
        distance: Math.floor(Math.random() * 80) + 10,
      },
    });
  }),

  http.post('/api/attendance/check-out', async () => {
    const now = new Date();
    return HttpResponse.json({
      record: {
        checkOut: now.toISOString(),
        workedMinutes: 480,
        overtimeMinutes: Math.max(0, (now.getHours() - 18) * 60 + now.getMinutes()),
        nightMinutes: 0,
      },
    });
  }),

  http.post('/api/attendance/overtime', async () => {
    return HttpResponse.json({ success: true, status: 'pending' });
  }),
];
