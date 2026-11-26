import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { inspectUpload, MB, SUBMISSION_EXTENSIONS, UploadedFileData } from '../files/upload';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMaterialDto, TopicDto } from './materials.dto';

export const MAX_MATERIAL_BYTES = 25 * MB;

const MATERIAL_SELECT = {
  id: true,
  topicId: true,
  title: true,
  description: true,
  kind: true,
  fileUrl: true,
  url: true,
  originalName: true,
  mimeType: true,
  size: true,
  fileDeletedAt: true,
  createdAt: true,
  author: { select: { id: true, fullName: true } },
} satisfies Prisma.CourseMaterialSelect;

/** Solo enlaces http(s): evita javascript:, data:, etc. */
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    // cae al error de abajo
  }
  throw new BadRequestException('El enlace debe empezar con http:// o https://');
}

/** Material del curso agrupado por temas. Lo publica el docente; lo ven los inscritos. */
@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(courseId: string, user: TokenPayload) {
    const role = await this.access.roleIn(courseId, user);
    const [topics, materials] = await Promise.all([
      this.prisma.courseTopic.findMany({
        where: { courseId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, position: true },
      }),
      this.prisma.courseMaterial.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        select: MATERIAL_SELECT,
      }),
    ]);
    // canManage: borrar (docente o administrador). canCreate: subir material y temas (solo el docente).
    return { canManage: role !== 'student', canCreate: role === 'teacher', topics, materials };
  }

  async createTopic(courseId: string, dto: TopicDto, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    const last = await this.prisma.courseTopic.aggregate({ where: { courseId }, _max: { position: true } });
    return this.prisma.courseTopic.create({
      data: { courseId, title: dto.title, position: (last._max.position ?? -1) + 1 },
      select: { id: true, title: true, position: true },
    });
  }

  async renameTopic(topicId: string, dto: TopicDto, user: TokenPayload) {
    const topic = await this.findTopic(topicId, user);
    await this.access.assertCanManage(topic.courseId, user);
    return this.prisma.courseTopic.update({
      where: { id: topicId },
      data: { title: dto.title },
      select: { id: true, title: true, position: true },
    });
  }

  /** El material del tema queda "sin tema"; no se borra. */
  async removeTopic(topicId: string, user: TokenPayload) {
    const topic = await this.findTopic(topicId, user);
    await this.access.assertCanManage(topic.courseId, user);
    await this.prisma.courseTopic.delete({ where: { id: topicId } });
  }

  async create(courseId: string, dto: CreateMaterialDto, file: UploadedFileData | undefined, user: TokenPayload) {
    await this.access.assertCanManage(courseId, user);
    if (dto.topicId) {
      const topic = await this.prisma.courseTopic.findFirst({ where: { id: dto.topicId, courseId }, select: { id: true } });
      if (!topic) throw new BadRequestException('El tema no pertenece a este curso');
    }
    if (!file && !dto.url) throw new BadRequestException('Adjunta un archivo o escribe un enlace');
    if (file && dto.url) throw new BadRequestException('Elige un archivo o un enlace, no ambos');

    const base = {
      courseId,
      topicId: dto.topicId || null,
      title: dto.title,
      description: dto.description || null,
      authorId: user.sub,
    };

    let data: Prisma.CourseMaterialUncheckedCreateInput;
    if (file) {
      const info = await inspectUpload(file, SUBMISSION_EXTENSIONS, MAX_MATERIAL_BYTES);
      const fileUrl = await this.storage.save(`classroom-drive/${courseId}`, info.ext, file);
      data = { ...base, kind: 'FILE', fileUrl, originalName: info.name, mimeType: info.mime, size: file.size, sha256: info.sha256 };
    } else {
      data = { ...base, kind: 'LINK', url: safeUrl(dto.url!) };
    }

    const material = await this.prisma.courseMaterial.create({ data, select: MATERIAL_SELECT });
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { name: true, enrollments: { select: { studentId: true } } },
    });
    await this.notifications.notify(
      course.enrollments.map((enrollment) => enrollment.studentId),
      { type: 'MATERIAL_CREATED', title: `Nuevo material en ${course.name}: ${material.title}`, link: `/cursos/${courseId}/recursos` },
    );
    return material;
  }

  async remove(materialId: string, user: TokenPayload) {
    const material = await this.prisma.courseMaterial.findUnique({
      where: { id: materialId },
      select: { courseId: true, fileUrl: true },
    });
    if (!material) throw new NotFoundException('Material no encontrado');
    await this.access.assertCanManage(material.courseId, user);
    await this.prisma.courseMaterial.delete({ where: { id: materialId } });
    await this.storage.remove(material.fileUrl);
  }

  private async findTopic(topicId: string, user: TokenPayload) {
    const topic = await this.prisma.courseTopic.findUnique({ where: { id: topicId }, select: { courseId: true } });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    await this.access.roleIn(topic.courseId, user);
    return topic;
  }
}
