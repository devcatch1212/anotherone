// 앱 상수 정의
export const APP_NAME = '근무관리';
export const ATTENDANCE_RADIUS_METERS = 100; // 출퇴근 인증 반경 (미터)
export const WORK_HOURS_PER_DAY = 8;
export const MAX_WEEKLY_HOURS = 52; // 주 최대 근로시간
export const WEEKLY_HOLIDAY_MIN_HOURS = 15; // 주휴수당 발생 최소 주간 근로시간

// 야간수당 시간대 (22:00 ~ 06:00)
export const NIGHT_WORK_START_HOUR = 22;
export const NIGHT_WORK_END_HOUR = 6;

export const ROUTES = {
  SPLASH: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/login/forgot',
  ONBOARDING_WAGE: '/onboarding/wage-type',
  ONBOARDING_COMPANY: '/onboarding/company',
  ONBOARDING_COMPLETE: '/onboarding/complete',
  HOME: '/home',
  ATTENDANCE: '/attendance',
  PAYROLL: '/payroll',
  LEAVE: '/leave',
  LEAVE_APPLY: '/leave/apply',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
} as const;
