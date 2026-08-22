import { IsString, IsNotEmpty, IsBoolean, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalMarks: number;

  @IsBoolean()
  isCBT: boolean;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
