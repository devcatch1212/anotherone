import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  companyId?: string;
}
