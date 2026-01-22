import { User } from '../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  RelationId,
  Index,
} from 'typeorm';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum ArticleVisibility {
  PUBLIC = 'PUBLIC',
  AUTH_ONLY = 'AUTH_ONLY',
  PRIVATE = 'PRIVATE',
  PREMIUM = 'PREMIUM',
}

export enum ContentType {
    TEXT = 'TEXT',
    VIDEO = 'VIDEO',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  // @Column({ type: 'enum', enum: ContentType, default: ContentType.TEXT })
  // @Index()
  // contentType: ContentType;

  // Store multiple image URLs (Postgres text array)
  @Column('text', { array: true, nullable: true })
  images: string[];

  @Column({ type: 'text', nullable: true })
  video: string;

  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  @Index()
  status: ArticleStatus;

  @Column({
    type: 'enum',
    enum: ArticleVisibility,
    default: ArticleVisibility.PUBLIC,
  })
  @Index()
  visibility: ArticleVisibility;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @RelationId((article: Article) => article.user)
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
