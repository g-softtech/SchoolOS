import { IsString, IsInt, IsOptional, IsEnum, Min, IsUUID } from 'class-validator';

export class CreateHostelDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsUUID()
  wardenId?: string;
}

export class UpdateHostelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AssignWardenDto {
  @IsOptional()
  @IsUUID()
  wardenId: string | null;
}

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AllocateStudentDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
