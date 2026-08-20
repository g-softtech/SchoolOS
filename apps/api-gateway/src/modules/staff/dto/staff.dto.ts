import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class HireStaffDto {
  @IsString()
  @IsNotEmpty()
  membershipId: string;

  @IsString()
  @IsNotEmpty()
  staffIdNumber: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @IsString()
  @IsOptional()
  contractType?: string;
}

export enum UpdateEmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
  SUSPENDED = 'SUSPENDED',
}

export class UpdateEmploymentDto {
  @IsEnum(UpdateEmploymentStatus)
  @IsNotEmpty()
  status: UpdateEmploymentStatus;

  @IsDateString()
  @IsOptional()
  terminationDate?: string;
}
