import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ArticleService } from './article.service';
import { UpdateArticleStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('admin/articles')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminArticlesController {
  constructor(private readonly articleService: ArticleService) {}

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update article status (Admin only)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateArticleStatusDto) {
    return this.articleService.updateStatus(id, dto.status);
  }
}
