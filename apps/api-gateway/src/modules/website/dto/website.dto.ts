import { IsString, IsOptional, IsObject, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWebsiteSettingsDto {
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  branding?: any;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  themeColors?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  themeId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  seoMeta?: any;
}

export class CreatePageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}

export class UpdatePageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  contentBlocks?: any;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  seoMetadata?: any;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  version!: number; // Required for optimistic locking
}
