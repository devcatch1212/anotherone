import { authHandlers } from './auth';
import { attendanceHandlers } from './attendance';
import { payrollHandlers } from './payroll';
import { leaveHandlers } from './leave';
import { notificationHandlers } from './notifications';

export const handlers = [
  // ...authHandlers, // Backend API로 연동됨
  // ...attendanceHandlers, // Backend API로 연동됨
  // ...payrollHandlers, // Backend API로 연동됨
  // ...leaveHandlers, // Backend API로 연동됨
  ...notificationHandlers,
];
