import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TransitionApplicationDto {
  @ApiProperty({ description: 'The UUID of the target AdmissionWorkflowStage' })
  @IsString()
  @IsNotEmpty()
  nextStageId: string;

  @ApiPropertyOptional({ description: 'Optional reason for the manual transition' })
  @IsOptional()
  @IsString()
  reason?: string;
}
