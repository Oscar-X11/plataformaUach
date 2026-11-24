import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';

/** Días que se guardan los registros (servidor de 4 GB / 256 GB: no llenar el disco). */
export const ACTIVITY_RETENTION_DAYS = 180;
const DAY_MS = 86_400_000;
const PAGE_SIZE = 50;

/** Acciones registradas. El texto que ve la gente va en `summary`. */
export type ActivityAction =
  | 'LOGIN'
  | 'PASSWORD_CHANGED'
  | 'USER_CREATED'
  | 'USER_STATUS'
  | 'PASSWORD_RESET'
  | 'STUDENTS_IMPORTED'
  | 'COURSE_CREATED'
  | 'COURSE_COPIED'
  | 'COURSE_JOINED'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_DELETED'
  | 'SUBMISSION_TURNED_IN'
  | 'GRADE_CHANGED'
  | 'QUIZ_PUBLISHED'
  | 'QUIZ_SUBMITTED'
  | 'QUIZ_GRADED'
  | 'MATERIAL_ADDED'
  | 'WEIGHTS_CHANGED'
  | 'TERM_CHANGED';

export interface NewActivity {
  userId?: string | null;
  courseId?: string | null;
  action: ActivityAction;
  summary: string;
}

/**
 * Bitácora de actividad: quién hizo qué y cuándo. Registrar nunca rompe la
 * operación principal (los errores solo se anotan en el log del servidor).
 */
@Injectable()
export class ActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityService.name);
  private purgeTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CourseAccessService,
  ) {}

  onModuleInit() {
    // Purga al arrancar y luego una vez al día. unref: no impide que el proceso termine.
    void this.purge();
    this.purgeTimer = setInterval(() => void this.purge(), DAY_MS);
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  log(entry: NewActivity) {
    void this.prisma.activityLog
      .create({
        data: {
          userId: entry.userId ?? null,
          courseId: entry.courseId ?? null,
          action: entry.action,
          summary: entry.summary.length > 300 ? `${entry.summary.slice(0, 299)}…` : entry.summary,
        },
      })
      .catch((error: unknown) => this.logger.warn(`No se pudo registrar actividad: ${String(error)}`));
  }

  /** Administración: toda la bitácora, con filtros. */
  async list(query: { page?: number; action?: string; search?: string; courseId?: string }) {
    const where: Prisma.ActivityLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search } },
              { user: { fullName: { contains: query.search } } },
              { user: { username: { contains: query.search } } },
            ],
          }
        : {}),
    };
    return this.page(where, query.page);
  }

  /** Docente (o admin): la actividad de una clase. */
  async forCourse(courseId: string, user: TokenPayload, page?: number) {
    await this.access.assertCanManage(courseId, user);
    return this.page({ courseId }, page);
  }

  private async page(where: Prisma.ActivityLogWhereInput, requested?: number) {
    const page = Math.max(1, Math.floor(requested ?? 1));
    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          action: true,
          summary: true,
          courseId: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, username: true, role: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  private async purge() {
    const before = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * DAY_MS);
    try {
      const { count } = await this.prisma.activityLog.deleteMany({ where: { createdAt: { lt: before } } });
      if (count) this.logger.log(`Bitácora: ${count} registros de más de ${ACTIVITY_RETENTION_DAYS} días eliminados`);
    } catch (error) {
      this.logger.warn(`No se pudo purgar la bitácora: ${String(error)}`);
    }
  }
}
