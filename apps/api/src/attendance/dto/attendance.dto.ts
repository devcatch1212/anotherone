import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;

  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @IsOptional()
  longitude?: number;

  @IsNumber({}, { message: '거리는 숫자여야 합니다.' })
  @IsOptional()
  distance?: number;
}

export class CheckOutDto {
  @IsString({ message: '근로계약(employmentId) 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId!: string;
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
