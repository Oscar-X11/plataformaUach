import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { inspectUpload, MB, SUBMISSION_EXTENSIONS, UploadedFileData } from '../files/upload';
import { safeUrl } from '../materials/materials.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ListResourcesQuery, ReviewResourceDto, UploadResourceDto } from './repository.dto';

export const MAX_RESOURCE_BYTES = 25 * MB;
const PAGE_SIZE = 24;

const RESOURCE_SELECT = {
  id: true,
  title: true,
  description: true,
  type: true,
  status: true,
  fileUrl: true,
  originalName: true,
  mimeType: true,
  size: true,
  url: true,
  reviewNote: true,
  createdAt: true,
  subject: { select: { id: true, name: true, code: true } },
  author: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.ResourceSelect;

/**
 * Repositorio institucional: apuntes, guías de estudio, libros y lecturas.
 * Lo que sube un alumno queda PENDIENTE hasta que un admin lo aprueba;
 * lo de docentes y admins se publica directo.
 */
@Injectable()
export class RepositoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async search(query: ListResourcesQuery) {
    const page = query.page ?? 1;
    const search = query.search?.trim();
    const where: Prisma.ResourceWhereInput = {
      status: 'APPROVED',
      type: query.type,
      subjectId: query.subjectId,
      ...(search
        ? { OR: [{ title: { contains: search } }, { description: { contains: search } }, { subject: { name: { contains: search } } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: RESOURCE_SELECT,
      }),
      this.prisma.resource.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  /** Lo que subió el usuario, con su estado de revisión. */
  mine(user: TokenPayload) {
    return this.prisma.resource.findMany({
      where: { authorId: user.sub },
      orderBy: { createdAt: 'desc' },
      select: RESOURCE_SELECT,
    });
  }

  pending() {
    return this.prisma.resource.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: RESOURCE_SELECT,
    });
  }

  async upload(dto: UploadResourceDto, file: UploadedFileData | undefined, user: TokenPayload) {
    if (!file && !dto.url) throw new BadRequestException('Adjunta un archivo o escribe un enlace');
    if (file && dto.url) throw new BadRequestException('Elige un archivo o un enlace, no ambos');
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { id: true } });
    if (!subject) throw new BadRequestException('La materia no existe');

    let content: Pick<Prisma.ResourceUncheckedCreateInput, 'fileUrl' | 'originalName' | 'mimeType' | 'size' | 'sha256' | 'url'>;
    if (file) {
      const info = await inspectUpload(file, SUBMISSION_EXTENSIONS, MAX_RESOURCE_BYTES);
      const fileUrl = await this.storage.save(`repository/${dto.subjectId}`, info.ext, file);
      content = { fileUrl, originalName: info.name, mimeType: info.mime, size: file.size, sha256: info.sha256 };
    } else {
      content = { url: safeUrl(dto.url!) };
    }
    const autoApprove = user.role !== 'STUDENT';
    return this.prisma.resource.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        type: dto.type,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        reviewedById: autoApprove ? user.sub : null,
        reviewedAt: autoApprove ? new Date() : null,
        ...content,
        subjectId: dto.subjectId,
        authorId: user.sub,
      },
      select: RESOURCE_SELECT,
    });
  }

  async review(resourceId: string, dto: ReviewResourceDto, admin: TokenPayload) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { authorId: true, title: true },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    if (!dto.approve && !dto.note) {
      throw new BadRequestException('Explica al autor por qué se rechaza');
    }

    const updated = await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        status: dto.approve ? 'APPROVED' : 'REJECTED',
        reviewNote: dto.approve ? null : dto.note,
        reviewedById: admin.sub,
        reviewedAt: new Date(),
      },
      select: RESOURCE_SELECT,
    });
    await this.notifications.notify([resource.authorId], {
      type: 'RESOURCE_REVIEWED',
      title: dto.approve
        ? `Publicamos «${resource.title}» en el repositorio`
        : `No se publicó «${resource.title}»: ${dto.note}`,
      link: '/repositorio?vista=mios',
    });
    return updated;
  }

  async remove(resourceId: string, user: TokenPayload) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { authorId: true, fileUrl: true },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    if (resource.authorId !== user.sub && user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo el autor o un administrador pueden borrarlo');
    }
    await this.prisma.resource.delete({ where: { id: resourceId } });
    await this.storage.remove(resource.fileUrl);
  }
}
