import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indicates if the request was successful', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'The payload returned by the operation' })
  data?: T;

  @ApiPropertyOptional({ description: 'Metadata, usually for pagination or trace IDs' })
  meta?: Record<string, any>;

  @ApiPropertyOptional({ description: 'List of errors if the request failed', example: [] })
  errors?: string[];

  constructor(success: boolean, data?: T, meta?: Record<string, any>, errors?: string[]) {
    this.success = success;
    this.data = data;
    this.meta = meta;
    this.errors = errors || [];
  }
}
