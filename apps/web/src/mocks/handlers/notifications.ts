import { http, HttpResponse } from 'msw';
import { mockNotifications } from '../data/notifications';

export const notificationHandlers = [
  http.get('/api/notifications', () => {
    return HttpResponse.json({ notifications: mockNotifications });
  }),

  http.post('/api/notifications/:id/read', ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),
];
