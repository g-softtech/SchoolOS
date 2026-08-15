import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, IsUUID } from 'class-validator';

export class CreateCampusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Grade 10"

  @IsInt()
  @IsNotEmpty()
  level: number;
}

export class CreateArmDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "10A"

  @IsInt()
  @IsOptional()
  capacity?: number;
}

export class CreateSubjectGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Sciences"
}

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  subjectGroupId?: string;
}

export class MapClassSubjectsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds: string[];
}
