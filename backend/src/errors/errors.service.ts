import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ErrorSource, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Días que se guardan los errores (servidor de 4 GB / 256 GB: no llenar el disco). */
export const ERROR_RETENTION_DAYS = 90;
const DAY_MS = 86_400_000;
const PAGE_SIZE = 30;
/** Como mucho un aviso a los administradores por errores automáticos cada 10 minutos. */
const AUTO_NOTIFY_EVERY_MS = 10 * 60_000;
/** Freno de seguridad: errores automáticos distintos que se aceptan por hora. */
const MAX_NEW_AUTO_PER_HOUR = 200;
const LINK = '/administracion/errores';

export interface CapturedError {
  source: Exclude<ErrorSource, 'USER'>;
  message: string;
  detail?: string | null;
  path?: string | null;
  userId?: string | null;
  userAgent?: string | null;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Ruta sin consulta y con los ids reemplazados: «/courses/:id/posts» agrupa todas las clases. */
export function normalizePath(path: string | null | undefined) {
  if (!path) return null;
  return cut(path.split(/[?#]/)[0].replace(UUID, ':id'), 300);
}

function cut(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const SELECT = {
  id: true,
  source: true,
  message: true,
  detail: true,
  path: true,
  count: true,
  userAgent: true,
  resolvedAt: true,
  resolutionNote: true,
  createdAt: true,
  lastSeenAt: true,
  user: { select: { id: true, fullName: true, username: true, role: true } },
} satisfies Prisma.ErrorReportSelect;

/**
 * Errores del sistema y problemas que reportan los usuarios, para el administrador.
 * Guardar un error nunca debe provocar otro: cualquier falla aquí solo va al log.
 */
@Injectable()
export class ErrorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorsService.name);
  private purgeTimer?: NodeJS.Timeout;
  private lastAutoNotice = 0;
  /**
   * Los errores automáticos se guardan uno tras otro: si llegan dos iguales casi juntos,
   * el segundo ya encuentra el registro del primero y solo suma (hay un solo backend).
   */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    void this.purge();
    this.purgeTimer = setInterval(() => void this.purge(), DAY_MS);
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /** Error automático (backend o pantalla). Los iguales y sin resolver se agrupan. */
  capture(error: CapturedError): Promise<void> {
    this.queue = this.queue.then(() => this.store(error));
    return this.queue;
  }

  private async store(error: CapturedError) {
    try {
      const message = cut(error.message.trim() || 'Error sin mensaje', 500);
      const path = normalizePath(error.path);
      const fingerprint = createHash('sha256').update(`${error.source}|${message}|${path ?? ''}`).digest('hex');
      const open = await this.prisma.errorReport.findFirst({
        where: { fingerprint, resolvedAt: null },
        select: { id: true },
      });
      if (open) {
        await this.prisma.errorReport.update({
          where: { id: open.id },
          data: {
            count: { increment: 1 },
            lastSeenAt: new Date(),
            ...(error.userId ? { userId: error.userId } : {}),
          },
        });
        return;
      }
      const lastHour = await this.prisma.errorReport.count({
        where: { source: { not: 'USER' }, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
      });
      if (lastHour >= MAX_NEW_AUTO_PER_HOUR) return;
      await this.prisma.errorReport.create({
        data: {
          source: error.source,
          message,
          detail: error.detail ? cut(error.detail, 4000) : null,
          path,
          fingerprint,
          userAgent: error.userAgent ? cut(error.userAgent, 300) : null,
          userId: error.userId ?? null,
        },
      });
      if (Date.now() - this.lastAutoNotice >= AUTO_NOTIFY_EVERY_MS) {
        this.lastAutoNotice = Date.now();
        const where = error.source === 'SERVER' ? 'en el servidor' : 'en una pantalla';
        await this.notifyAdmins(`Error nuevo ${where}: ${message}`);
      }
    } catch (failure) {
      this.logger.error(`No se pudo registrar un error: ${String(failure)}`);
    }
  }

  /** Problema que reporta un usuario. Cada reporte es un registro y avisa a los administradores. */
  async report(input: { message: string; path?: string | null; userAgent?: string | null }, user: TokenPayload) {
    const text = input.message.trim();
    const created = await this.prisma.errorReport.create({
      data: {
        source: 'USER',
        message: cut(text.split('\n')[0], 500),
        detail: text,
        path: input.path ? cut(input.path.split('#')[0], 300) : null,
        userAgent: input.userAgent ? cut(input.userAgent, 300) : null,
        userId: user.sub,
      },
      select: { id: true },
    });
    await this.notifyAdmins(`Reporte de un usuario: ${cut(text, 120)}`);
    return created;
  }

  async list(query: { status?: 'open' | 'resolved'; source?: ErrorSource; page?: number }) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const where: Prisma.ErrorReportWhereInput = {
      resolvedAt: query.status === 'resolved' ? { not: null } : null,
      ...(query.source ? { source: query.source } : {}),
    };
    const [items, total, open] = await Promise.all([
      this.prisma.errorReport.findMany({
        where,
        orderBy: query.status === 'resolved' ? { resolvedAt: 'desc' } : { lastSeenAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: SELECT,
      }),
      this.prisma.errorReport.count({ where }),
      this.prisma.errorReport.count({ where: { resolvedAt: null } }),
    ]);
    return { items, total, open, page, pageSize: PAGE_SIZE };
  }

  /** Marca como atendido. Si lo reportó un usuario, se le avisa (con la nota, si hay). */
  async resolve(id: string, note: string | undefined) {
    const report = await this.prisma.errorReport.findUnique({
      where: { id },
      select: { source: true, userId: true, resolvedAt: true },
    });
    if (!report) throw new NotFoundException('No se encontró el reporte');
    const resolutionNote = note?.trim() ? cut(note.trim(), 300) : null;
    const updated = await this.prisma.errorReport.update({
      where: { id },
      data: { resolvedAt: report.resolvedAt ?? new Date(), resolutionNote },
      select: SELECT,
    });
    if (report.source === 'USER' && report.userId && !report.resolvedAt) {
      await this.notifications.notify([report.userId], {
        type: 'REPORT_RESOLVED',
        title: resolutionNote ? `Atendimos tu reporte: ${resolutionNote}` : 'Atendimos el problema que reportaste',
      });
    }
    return updated;
  }

  private async notifyAdmins(title: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    await this.notifications.notify(
      admins.map((admin) => admin.id),
      { type: 'ERROR_REPORTED', title, link: LINK },
    );
  }

  private async purge() {
    const before = new Date(Date.now() - ERROR_RETENTION_DAYS * DAY_MS);
    try {
      const { count } = await this.prisma.errorReport.deleteMany({ where: { lastSeenAt: { lt: before } } });
      if (count) this.logger.log(`Errores: ${count} registros de más de ${ERROR_RETENTION_DAYS} días eliminados`);
    } catch (error) {
      this.logger.warn(`No se pudo purgar los errores: ${String(error)}`);
    }
  }
}
