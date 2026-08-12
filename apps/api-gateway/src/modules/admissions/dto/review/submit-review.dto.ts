import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ReviewRecommendation } from '@saas/core-platform';

export class SubmitReviewDto {
  @ApiProperty({ description: 'The UUID of the target AdmissionWorkflowStage for this review' })
  @IsString()
  @IsNotEmpty()
  stageId: string;

  @ApiPropertyOptional({ description: 'Optional numerical score provided by the reviewer', example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiProperty({ description: 'Reviewer comments and justification' })
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiProperty({ description: 'Final recommendation for this stage', enum: ReviewRecommendation })
  @IsEnum(ReviewRecommendation)
  @IsNotEmpty()
  recommendation: ReviewRecommendation;
}
