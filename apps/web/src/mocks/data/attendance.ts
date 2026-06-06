import { AttendanceRecord } from '@/types';
import { format, subDays } from 'date-fns';

const today = new Date();

export const mockAttendance: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: format(today, 'yyyy-MM-dd'),
    checkIn: new Date(today.setHours(9, 2, 0, 0)).toISOString(),
    status: 'normal',
    workedMinutes: 0,
    distance: 42,
  },
  {
    id: 'att-2',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    checkIn: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    checkOut: new Date(new Date().setHours(18, 10, 0, 0)).toISOString(),
    status: 'normal',
    workedMinutes: 550,
    overtimeMinutes: 70,
    nightMinutes: 0,
    distance: 38,
  },
  {
    id: 'att-3',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    checkIn: new Date(new Date().setHours(9, 31, 0, 0)).toISOString(),
    checkOut: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    status: 'late',
    workedMinutes: 509,
    overtimeMinutes: 0,
    nightMinutes: 0,
    distance: 55,
  },
  {
    id: 'att-4',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    status: 'vacation',
    workedMinutes: 0,
  },
  {
    id: 'att-5',
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    status: 'absent',
    workedMinutes: 0,
  },
];
