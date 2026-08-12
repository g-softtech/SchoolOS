import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsObject } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ description: 'The UUID of the target Admission Campaign' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: 'First name of the applicant student' })
  @IsString()
  @IsNotEmpty()
  studentFirstName: string;

  @ApiProperty({ description: 'Last name of the applicant student' })
  @IsString()
  @IsNotEmpty()
  studentLastName: string;

  @ApiProperty({ description: 'Date of birth of the student' })
  @IsDateString()
  @IsNotEmpty()
  studentDateOfBirth: string;

  @ApiPropertyOptional({ description: 'JSON answers to the dynamic Admission Form fields', type: 'object' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
