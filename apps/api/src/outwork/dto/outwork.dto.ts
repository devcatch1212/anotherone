import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateOutworkDto {
  @IsString({ message: '날짜는 문자열(YYYY-MM-DD)이어야 합니다.' })
  @IsNotEmpty({ message: '날짜가 필요합니다.' })
  date!: string;

  @IsString({ message: '구분은 문자열이어야 합니다.' })
  @IsIn(['outside', 'trip'], { message: '구분은 outside(외근) 또는 trip(출장)이어야 합니다.' })
  @IsNotEmpty({ message: '구분이 필요합니다.' })
  type!: string;

  @IsString({ message: '업무 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '업무 내용(사유)이 필요합니다.' })
  reason!: string;
}
