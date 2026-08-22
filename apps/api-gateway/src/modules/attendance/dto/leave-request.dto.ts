import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { LeaveType, LeaveStatus } from '@saas/core-platform';

export class SubmitLeaveRequestDto {
  @IsNotEmpty()
  @IsString()
  staffId: string;

  @IsNotEmpty()
  @IsEnum(LeaveType)
  type: LeaveType;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewLeaveRequestDto {
  @IsNotEmpty()
  @IsEnum(LeaveStatus)
  status: LeaveStatus;
}
