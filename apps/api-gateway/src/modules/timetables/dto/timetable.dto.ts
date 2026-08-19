import { IsString, IsNotEmpty, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimetableDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  armId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bellScheduleId: string;
}

export class TimetableSlotDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6) // 0=Sunday, 1=Monday... or 1=Monday. Usually 1-5 or 0-6.
  dayOfWeek: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;
}

export class BulkUpdateSlotsDto {
  @ApiProperty({ type: [TimetableSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableSlotDto)
  slots: TimetableSlotDto[];
}
