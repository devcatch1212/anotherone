import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: '근로계약 식별자가 필요합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsString({ message: '급여 유형을 입력해주세요.' })
  @IsNotEmpty({ message: '급여 유형을 입력해주세요.' })
  wageType!: string;

  @IsNumber({}, { message: '시급을 숫자로 입력해주세요.' })
  @IsOptional()
  hourlyWage?: number;

  @IsNumber({}, { message: '일급을 숫자로 입력해주세요.' })
  @IsOptional()
  dailyWage?: number;

  @IsString({ message: '회사명을 입력해주세요.' })
  @IsNotEmpty({ message: '회사명을 입력해주세요.' })
  companyName!: string;

  @IsString({ message: '회사 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '회사 주소를 입력해주세요.' })
  companyAddress!: string;

  @IsString({ message: '출근 시간을 입력해주세요.' })
  @IsNotEmpty({ message: '출근 시간을 입력해주세요.' })
  workStartTime!: string;

  @IsString({ message: '퇴근 시간을 입력해주세요.' })
  @IsNotEmpty({ message: '퇴근 시간을 입력해주세요.' })
  workEndTime!: string;

  @IsNumber({}, { message: '휴게시간을 입력해주세요.' })
  @IsNotEmpty({ message: '휴게시간을 입력해주세요.' })
  breakMinutes!: number;

  @IsArray({ message: '근무 요일을 선택해주세요.' })
  @IsNotEmpty({ message: '근무 요일을 선택해주세요.' })
  workDaysOfWeek!: number[];

  @IsNumber({}, { message: '위도를 숫자로 입력해주세요.' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: '경도를 숫자로 입력해주세요.' })
  @IsOptional()
  longitude?: number;
}

export class UpdatePasswordDto {
  @IsString({ message: '현재 비밀번호를 입력해주세요.' })
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요.' })
  current!: string;

  @IsString({ message: '새 비밀번호를 입력해주세요.' })
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  next!: string;
}
