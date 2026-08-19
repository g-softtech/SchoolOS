import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BellPeriodDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., 'Period 1', 'Break'

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startTime: string; // format HH:mm

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endTime: string; // format HH:mm

  @ApiProperty()
  @IsString()
  @IsOptional()
  type?: string; // e.g., 'TEACHING', 'BREAK', 'ASSEMBLY'
}

export class CreateBellScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [BellPeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BellPeriodDto)
  periods: BellPeriodDto[];
}

export class UpdateBellScheduleDto extends CreateBellScheduleDto {}
