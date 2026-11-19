import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto, CreatePostDto } from './stream.dto';

const AUTHOR = { select: { id: true, fullName: true, role: true } } as const;

const POST_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  author: AUTHOR,
  comments: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, content: true, createdAt: true, author: AUTHOR },
  },
} satisfies Prisma.PostSelect;

const preview = (text: string) => (text.length > 60 ? `${text.slice(0, 59)}…` : text);

/** Tablón del curso: avisos del docente y comentarios de todos los miembros. */
@Injectable()
export class StreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const posts = await this.prisma.post.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: POST_SELECT,
    });
    return { canPost: role !== 'student', posts };
  }

  async create(courseId: string, dto: CreatePostDto, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const post = await this.prisma.post.create({
      data: { courseId, authorId: user.sub, content: dto.content },
      select: POST_SELECT,
    });
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { name: true, enrollments: { select: { studentId: true } } },
    });
    await this.notifications.notify(
      course.enrollments.map((enrollment) => enrollment.studentId),
      {
        type: 'POST_CREATED',
        title: `Nuevo aviso en ${course.name}: ${preview(dto.content)}`,
        link: `/cursos/${courseId}`,
      },
    );
    return post;
  }

  async remove(postId: string, user: TokenPayload) {
    const post = await this.findPost(postId, user);
    await this.assertAuthorOrManager(post.courseId, post.authorId, user);
    await this.prisma.post.delete({ where: { id: postId } });
  }

  async comment(postId: string, dto: CreateCommentDto, user: TokenPayload) {
    const post = await this.findPost(postId, user);
    const comment = await this.prisma.comment.create({
      data: { postId, authorId: user.sub, content: dto.content },
      select: { id: true, content: true, createdAt: true, author: AUTHOR },
    });
    if (post.authorId !== user.sub) {
      await this.notifications.notify([post.authorId], {
        type: 'COMMENT_CREATED',
        title: `${comment.author.fullName} comentó tu aviso: ${preview(dto.content)}`,
        link: `/cursos/${post.courseId}`,
      });
    }
    return comment;
  }

  async removeComment(commentId: string, user: TokenPayload) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, post: { select: { courseId: true } } },
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    await this.access.roleIn(comment.post.courseId, user);
    await this.assertAuthorOrManager(comment.post.courseId, comment.authorId, user);
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  private async findPost(postId: string, user: TokenPayload) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { courseId: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Aviso no encontrado');
    await this.access.roleIn(post.courseId, user);
    return post;
  }

  private async assertAuthorOrManager(courseId: string, authorId: string, user: TokenPayload) {
    if (authorId === user.sub) return;
    const role = await this.access.roleIn(courseId, user);
    if (role === 'student') throw new ForbiddenException('Solo puedes borrar lo que escribiste');
  }
}
