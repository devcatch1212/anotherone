import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CompanyOnboardingDto {
  @IsString({ message: '회사 이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '회사 이름을 입력해주세요.' })
  companyName!: string;

  @IsString({ message: '회사 주소는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '회사 주소를 입력해주세요.' })
  address!: string;

  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '회사 위치(위도) 정보가 필요합니다.' })
  latitude!: number;

  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '회사 위치(경도) 정보가 필요합니다.' })
  longitude!: number;

  @IsNumber({}, { message: '인증 반경은 숫자여야 합니다.' })
  @IsOptional()
  radiusMeters?: number;

  @IsString({ message: '직급은 문자열이어야 합니다.' })
  @IsOptional()
  position?: string;

  @IsString({ message: '급여 유형은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '급여 유형(시급/일급)을 선택해주세요.' })
  wageType!: string;

  @IsNumber({}, { message: '시급은 숫자여야 합니다.' })
  @IsOptional()
  hourlyWage?: number;

  @IsNumber({}, { message: '일급은 숫자여야 합니다.' })
  @IsOptional()
  dailyWage?: number;

  @IsNumber({}, { message: '일일 근무시간은 숫자여야 합니다.' })
  @IsNotEmpty({ message: '일일 근무시간을 입력해주세요.' })
  dailyWorkHours!: number;

  @IsNumber({}, { message: '주간 근무일수는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '주간 근무일수를 입력해주세요.' })
  weeklyWorkDays!: number;

  @IsString({ message: '출근 시간은 문자열이어야 합니다.' })
  @IsOptional()
  workStartTime?: string;

  @IsString({ message: '퇴근 시간은 문자열이어야 합니다.' })
  @IsOptional()
  workEndTime?: string;

  @IsArray({ message: '근무 요일은 배열이어야 합니다.' })
  @IsOptional()
  workDaysOfWeek?: number[];

  @IsNumber({}, { message: '휴게 시간은 숫자여야 합니다.' })
  @IsOptional()
  breakMinutes?: number;
}
