import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanRequestDto {
  @ApiProperty({ description: 'The admission number encoded in the QR/Barcode' })
  @IsString()
  @IsNotEmpty()
  admissionNumber: string;

  @ApiPropertyOptional({ description: 'The method used to perform the scan', enum: ['BARCODE', 'QR', 'CAMERA', 'MANUAL'] })
  @IsOptional()
  @IsEnum(['BARCODE', 'QR', 'CAMERA', 'MANUAL'])
  scanMethod?: 'BARCODE' | 'QR' | 'CAMERA' | 'MANUAL';
}
