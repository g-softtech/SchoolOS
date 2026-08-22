import { IsString, IsNotEmpty, IsNumber, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ResultEntryDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  score: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BatchEnterResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultEntryDto)
  results: ResultEntryDto[];
}
