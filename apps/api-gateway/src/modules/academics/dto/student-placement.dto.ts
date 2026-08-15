import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class PlaceStudentDto {
  @IsUUID()
  @IsNotEmpty()
  armId: string;
}
