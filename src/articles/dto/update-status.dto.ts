import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ArticleStatus } from '../article.entity';

export class UpdateArticleStatusDto {
  @ApiProperty({ enum: ArticleStatus, description: 'New status for the article' })
  @IsEnum(ArticleStatus)
  status: ArticleStatus;
}
