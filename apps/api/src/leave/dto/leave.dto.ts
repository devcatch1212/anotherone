import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class ApplyLeaveDto {
  @IsString({ message: '근로계약 식별자가 필요합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId: string;

  @IsString({ message: '휴가 종류를 선택해주세요.' })
  @IsNotEmpty({ message: '휴가 종류를 선택해주세요.' })
  type: string;

  @IsString({ message: '시작일을 입력해주세요.' })
  @IsNotEmpty({ message: '시작일을 입력해주세요.' })
  startDate: string;

  @IsString({ message: '종료일을 입력해주세요.' })
  @IsNotEmpty({ message: '종료일을 입력해주세요.' })
  endDate: string;

  @IsNumber({}, { message: '사용 일수를 입력해주세요.' })
  @IsNotEmpty({ message: '사용 일수를 입력해주세요.' })
  days: number;

  @IsString({ message: '사유를 입력해주세요.' })
  @IsNotEmpty({ message: '사유를 입력해주세요.' })
  reason: string;
}

export class GetLeaveDto {
  @IsString({ message: '근로계약 식별자가 필요합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId: string;
}
