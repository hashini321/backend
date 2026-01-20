import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArticleService } from '../article.service';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class ArticleOwnerGuard implements CanActivate {
  constructor(private readonly articleService: ArticleService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const id = req.params.id;
    if (!user) return false;

    const article = await this.articleService.findById(id);
    if (!article) throw new NotFoundException('Article not found');

    if (user.role === Role.ADMIN) return true;
    if (article.userId === user.id) return true;

    throw new ForbiddenException('You do not have permission for this resource');
  }
}
