import { NIGHT_WORK_START_HOUR, NIGHT_WORK_END_HOUR, WEEKLY_HOLIDAY_MIN_HOURS } from './constants';

export type WageType = 'hourly' | 'daily';

export interface HourlyWageConfig {
  type: 'hourly';
  hourlyWage: number;      // 시급 (원)
  dailyWorkHours: number;  // 소정 근로 시간/일
  weeklyWorkDays: number;  // 주 소정 근로일 수
}

export interface DailyWageConfig {
  type: 'daily';
  dailyWage: number;       // 일급 (원)
  dailyWorkHours: number;  // 소정 근로 시간/일
  weeklyWorkDays: number;  // 주 소정 근로일 수
}

export type WageConfig = HourlyWageConfig | DailyWageConfig;

export interface PayrollInput {
  workedDays: number;        // 실제 근무 일수
  workedMinutes: number;     // 실제 총 근무 시간 (분)
  overtimeMinutes: number;   // 연장 근로 시간 (분)
  nightMinutes: number;      // 야간 근로 시간 (분, 22:00~06:00)
  weeklyWorkedMinutes: number; // 이번 주 총 근무 시간 (분)
}

export interface PayrollResult {
  basePay: number;         // 기본급
  holidayPay: number;      // 주휴수당
  overtimePay: number;     // 연장수당 (×1.5)
  nightPay: number;        // 야간수당 (×0.5)
  totalGross: number;      // 총 지급액
  nationalPension: number; // 국민연금 (4.5%)
  healthInsurance: number; // 건강보험 (3.545%)
  employmentInsurance: number; // 고용보험 (0.9%)
  incomeTax: number;       // 소득세 (근사값)
  totalDeduction: number;  // 총 공제액
  netPay: number;          // 실수령액
}

export function calculatePayroll(
  config: WageConfig,
  input: PayrollInput
): PayrollResult {
  const toHours = (min: number) => min / 60;

  let effectiveHourlyWage: number;
  let basePay: number;

  if (config.type === 'hourly') {
    effectiveHourlyWage = config.hourlyWage;
    basePay = config.hourlyWage * config.dailyWorkHours * input.workedDays;
  } else {
    effectiveHourlyWage = config.dailyWage / config.dailyWorkHours;
    basePay = config.dailyWage * input.workedDays;
  }

  // 주휴수당: 주 15시간 이상 근무 시 발생 (시급 × 8시간)
  const weeklyHours = toHours(input.weeklyWorkedMinutes);
  const holidayPay = weeklyHours >= WEEKLY_HOLIDAY_MIN_HOURS
    ? effectiveHourlyWage * 8
    : 0;

  // 연장수당: 시급 × 1.5 × 연장 시간
  const overtimePay = effectiveHourlyWage * 1.5 * toHours(input.overtimeMinutes);

  // 야간수당: 시급 × 0.5 × 야간 시간
  const nightPay = effectiveHourlyWage * 0.5 * toHours(input.nightMinutes);

  const totalGross = basePay + holidayPay + overtimePay + nightPay;

  // 4대보험 공제
  const nationalPension = Math.floor(totalGross * 0.045);       // 4.5%
  const healthInsurance = Math.floor(totalGross * 0.03545);     // 3.545%
  const employmentInsurance = Math.floor(totalGross * 0.009);   // 0.9%

  // 소득세 (간이세액표 근사)
  let incomeTax = 0;
  const taxableIncome = totalGross - nationalPension - healthInsurance - employmentInsurance;
  if (taxableIncome > 3000000) incomeTax = Math.floor(taxableIncome * 0.15);
  else if (taxableIncome > 1500000) incomeTax = Math.floor(taxableIncome * 0.10);
  else if (taxableIncome > 880000) incomeTax = Math.floor(taxableIncome * 0.06);

  const totalDeduction = nationalPension + healthInsurance + employmentInsurance + incomeTax;
  const netPay = Math.max(0, totalGross - totalDeduction);

  return {
    basePay: Math.floor(basePay),
    holidayPay: Math.floor(holidayPay),
    overtimePay: Math.floor(overtimePay),
    nightPay: Math.floor(nightPay),
    totalGross: Math.floor(totalGross),
    nationalPension,
    healthInsurance,
    employmentInsurance,
    incomeTax,
    totalDeduction,
    netPay,
  };
}
