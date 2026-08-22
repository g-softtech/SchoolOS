import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanRequestDto {
  @ApiProperty({ description: 'The admission number encoded in the QR/Barcode' })
  @IsString()
  @IsNotEmpty()
  admissionNumber: string;
}
