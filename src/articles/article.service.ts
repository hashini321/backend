import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleVisibility, ArticleStatus } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly repo: Repository<Article>,
  ) {}

  async create(user: User, dto: CreateArticleDto): Promise<Article> {
    const article = this.repo.create({ ...dto, user });
    return this.repo.save(article);
  }

  async findById(id: string): Promise<Article> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  // For public view: enforce visibility
  async findOne(id: string, requester?: User): Promise<Article> {
    const article = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!article) throw new NotFoundException('Article not found');

    if (article.visibility === ArticleVisibility.AUTH_ONLY && !requester) {
      throw new UnauthorizedException('Authentication required to view this article');
    }

    return article;
  }

  async update(id: string, user: User, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    if (user.role !== Role.ADMIN && article.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to edit this article');
    }

    Object.assign(article, dto);
    return this.repo.save(article);
  }

  async remove(id: string, user: User): Promise<void> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    if (user.role !== Role.ADMIN && article.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this article');
    }

    await this.repo.delete(id);
  }

  /**
   * Admin-only: update the status of any article
   */
  async updateStatus(id: string, status: ArticleStatus): Promise<Article> {
    const article = await this.findById(id);
    article.status = status;
    return this.repo.save(article);
  }

  async findAll(query: QueryArticleDto, userId: String) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    console.log("queryyyyyyyyyyy", query.visibility, userId);
    const qb = this.repo.createQueryBuilder('article')
      .leftJoinAndSelect('article.user', 'user');

    // Visibility: public callers only see PUBLIC
    // if (!requester) {
    //   qb.andWhere('article.visibility = :public', { public: ArticleVisibility.PUBLIC });
    // } else 
      if (query.visibility) {
      qb.andWhere('article.visibility = :visibility', { visibility: query.visibility });
    }

    if (query.status) {
      qb.andWhere('article.status = :status', { status: query.status });
    }

    if (userId) {
      qb.andWhere('user.id = :userId', { userId: userId });
    }

    if (query.keyword) {
      qb.andWhere('(article.title ILIKE :kw OR article.body ILIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query.contentType) {
        // qb.andWhere('article.video = :contentType', { contentType: query.contentType });
          qb.andWhere('article.video IS NOT NULL')
    .andWhere("TRIM(article.video) <> ''");
    }

    // Sorting
    const [sortColumn, sortDir] = (query.sort ?? 'createdAt:DESC').split(':');
    const validSortCol = ['createdAt', 'updatedAt', 'title'];
    const column = validSortCol.includes(sortColumn) ? `article.${sortColumn}` : 'article.createdAt';
    const direction = (sortDir && sortDir.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    qb.orderBy(column, direction);

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

   async findLatestVideo(userId: String) {
    const page = 1;
    const limit = 2;
    console.log("queryyyyyyyyyyy", userId);
    const qb = this.repo.createQueryBuilder('article')
      .leftJoinAndSelect('article.user', 'user');

    // Visibility: public callers only see PUBLIC
    // if (!requester) {
    //   qb.andWhere('article.visibility = :public', { public: ArticleVisibility.PUBLIC });
    // } else 
    //   if (query.visibility) {
    //   qb.andWhere('article.visibility = :visibility', { visibility: query.visibility });
    // }

    // if (query.status) {
    //   qb.andWhere('article.status = :status', { status: query.status });
    // }

    if (userId) {
      qb.andWhere('user.id = :userId', { userId: userId });
    }

    qb.andWhere('article.video IS NOT NULL')
    .andWhere("TRIM(article.video) <> ''");

    // if (query.keyword) {
    //   qb.andWhere('(article.title ILIKE :kw OR article.body ILIKE :kw)', { kw: `%${query.keyword}%` });
    // }
    // if (query.contentType) {
    //     qb.andWhere('article.contentType = :contentType', { contentType: query.contentType });
    // }

    // Sorting
    const [sortColumn, sortDir] = ('createdAt:DESC').split(':');
    const validSortCol = ['createdAt', 'updatedAt', 'title'];
    const column = validSortCol.includes(sortColumn) ? `article.${sortColumn}` : 'article.createdAt';
    const direction = (sortDir && sortDir.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    qb.orderBy(column, direction);

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
