import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "2026/2027"

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "Fall Term"

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
