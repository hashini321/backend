import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiPropertyOptional({ description: 'Partial update allowed' })
  @IsOptional()
  title?: string;
}
