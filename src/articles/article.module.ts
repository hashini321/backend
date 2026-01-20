import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { ArticleOwnerGuard } from './guards/article-owner.guard';
import { AdminArticlesController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticleController, AdminArticlesController],
  providers: [ArticleService, ArticleOwnerGuard],
  exports: [ArticleService],
})
export class ArticleModule {}
