import { authHandlers } from './auth';
import { attendanceHandlers } from './attendance';
import { payrollHandlers } from './payroll';
import { leaveHandlers } from './leave';
import { notificationHandlers } from './notifications';

export const handlers = [
  ...authHandlers,
  ...attendanceHandlers,
  ...payrollHandlers,
  ...leaveHandlers,
  ...notificationHandlers,
];
