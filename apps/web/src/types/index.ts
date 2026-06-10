export type WageType = 'hourly' | 'daily';

export type AttendanceStatus = 'normal' | 'late' | 'absent' | 'vacation' | 'holiday';

export type AttendanceState = 'before' | 'working' | 'done';

export type LeaveType = 'annual' | 'half' | 'sick' | 'official';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type NotificationType = 'overtime_approved' | 'overtime_rejected' | 'leave_approved' | 'leave_rejected' | 'payroll_issued';

export interface User {
  id: string;
  name: string;
  email: string | null;
  emailVerified?: string | null;
  image?: string | null;
  onboardingCompleted: boolean;
  employments: Employment[];
}

export interface Company {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface Employment {
  id: string;
  userId: string;
  companyId: string;
  company: Company;
  position: string;
  wageType: WageType;
  hourlyWage?: number;
  dailyWage?: number;
  dailyWorkHours: number;
  weeklyWorkDays: number;
  workStartTime?: string;
  workEndTime?: string;
  workDaysOfWeek?: number[];
  breakMinutes?: number;
  isPrimary: boolean;
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO datetime
  checkOut?: string; // ISO datetime
  status: AttendanceStatus;
  workedMinutes?: number;
  overtimeMinutes?: number;
  nightMinutes?: number;
  distance?: number; // 출근 시 회사와의 거리 (미터)
}

export interface PayrollRecord {
  id: string;
  companyId: string;
  year: number;
  month: number;
  basePay: number;
  holidayPay: number;
  overtimePay: number;
  nightPay: number;
  totalGross: number;
  nationalPension: number;
  healthInsurance: number;
  employmentInsurance: number;
  incomeTax: number;
  totalDeduction: number;
  netPay: number;
  paidAt: string;
  confirmed: boolean;
  workedDays: number;
}

export interface LeaveRecord {
  id: string;
  companyId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
}

export interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface Notification {
  id: string;
  companyId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface OvertimeRequest {
  id: string;
  companyId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}
