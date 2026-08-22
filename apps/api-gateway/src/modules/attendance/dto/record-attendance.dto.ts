import { IsNotEmpty, IsString, IsEnum, IsOptional, ValidateNested, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@saas/core-platform';

export class AttendanceRecordDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RecordDailyAttendanceDto {
  @IsNotEmpty()
  @IsString()
  armId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
