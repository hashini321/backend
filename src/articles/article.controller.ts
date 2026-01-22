import { Controller, Post, Body, UseGuards, Patch, Param, Delete, Get, Query, Req } from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArticleOwnerGuard } from './guards/article-owner.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';

@ApiTags('articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly service: ArticleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an article (auth required)' })
  async create(@CurrentUser() user: User, @Body() dto: CreateArticleDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ArticleOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update article (owner or admin)' })
  async update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ArticleOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete article (owner or admin)' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.service.remove(id, user);
    return { success: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single article (public or auth only)' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return await this.service.findOne(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'List articles with pagination, search, filters and sorting' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'visibility', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'sort', required: false })
  async findAll(@Query() query: QueryArticleDto, @Req() req: any) {
    console.log('ArticleController.findAll called with query:', query);
    const userId = req.id;
    return this.service.findAll(query, userId);
  }

  @Get('/video')
  @ApiOperation({ summary: 'List articles with pagination, search, filters and sorting' })
  // @ApiQuery({ name: 'page', required: false })
  // @ApiQuery({ name: 'limit', required: false })
  // @ApiQuery({ name: 'keyword', required: false })
  // @ApiQuery({ name: 'status', required: false })
  // @ApiQuery({ name: 'visibility', required: false })
  // @ApiQuery({ name: 'userId', required: false })
  // @ApiQuery({ name: 'sort', required: false })
  async findLatestVideo(@Query() query: QueryArticleDto, @Req() req: any) {
    console.log('ArticleController.findAll called with query:');
    const userId = req.id;
    return this.service.findLatestVideo(userId);
  }

}
