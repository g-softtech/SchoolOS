import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ description: 'The name of the admission campaign', example: 'Fall 2027 General Admissions' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The UUID of the Academic Year', example: 'd3b07384-d9a7-4bf1-b2d6-444444444444' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'Start date of the campaign' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of the campaign' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: 'Application fee amount', example: 50.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @ApiPropertyOptional({ description: 'Maximum capacity of applicants', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxApplicants?: number;
}
