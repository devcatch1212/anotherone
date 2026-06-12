import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '위도 정보가 필요합니다.' })
  latitude!: number;

  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '경도 정보가 필요합니다.' })
  longitude!: number;

  @IsNumber({}, { message: '거리는 숫자여야 합니다.' })
  @IsOptional()
  distance?: number;
}

export class CheckOutDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '위도 정보가 필요합니다.' })
  latitude!: number;

  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '경도 정보가 필요합니다.' })
  longitude!: number;
}

export class GetAttendanceDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsNumber({}, { message: '조회할 연도는 숫자여야 합니다.' })
  @IsNotEmpty({ message: '조회할 연도가 필요합니다.' })
  year!: number;

  @IsNumber({}, { message: '조회할 월은 숫자여야 합니다.' })
  @IsNotEmpty({ message: '조회할 월이 필요합니다.' })
  month!: number;
}

export class OvertimeRequestDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsString({ message: '날짜는 문자열(YYYY-MM-DD)이어야 합니다.' })
  @IsNotEmpty({ message: '날짜가 필요합니다.' })
  date!: string;

  @IsString({ message: '시작 시간은 문자열(HH:mm)이어야 합니다.' })
  @IsNotEmpty({ message: '시작 시간이 필요합니다.' })
  start!: string;

  @IsString({ message: '종료 시간은 문자열(HH:mm)이어야 합니다.' })
  @IsNotEmpty({ message: '종료 시간이 필요합니다.' })
  end!: string;

  @IsString({ message: '사유는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '사유가 필요합니다.' })
  reason!: string;
}

