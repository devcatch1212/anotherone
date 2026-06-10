import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class GetPayrollDto {
  @IsString({ message: '근로계약 식별자가 필요합니다.' })
  @IsNotEmpty({ message: '근로계약 식별자가 필요합니다.' })
  employmentId: string;
}

export class ConfirmPayrollDto {
  @IsString({ message: '급여명세서 식별자가 필요합니다.' })
  @IsNotEmpty({ message: '급여명세서 식별자가 필요합니다.' })
  payrollId: string;
}
