import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ArticleStatus, ArticleVisibility } from '../article.entity';

export class CreateArticleDto {
  @ApiProperty({ example: 'How to trade forex', description: 'Article title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Long body text...', description: 'Article body' })
  @IsString()
  @IsNotEmpty()
  body: string;
  
  // @ApiProperty({ enum: ContentType, required: true, default: ContentType.TEXT })
  // @IsEnum(ContentType)
  // @IsNotEmpty()
  // contentType: ContentType;

  @ApiProperty({ example: ['https://cdn.example.com/image1.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiProperty({ example: 'https://cdn.example.com/image1.mp4', required: false })
  @IsOptional()
  @IsUrl()
  video?: string;

  @ApiProperty({ enum: ArticleStatus, required: false, default: ArticleStatus.DRAFT })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus = ArticleStatus.DRAFT;

  @ApiProperty({ enum: ArticleVisibility, required: false, default: ArticleVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility = ArticleVisibility.PUBLIC;
}
