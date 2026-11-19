import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface NewNotification {
  type: NotificationType;
  title: string;
  link?: string;
}

const MAX_TITLE = 180;

/** Avisos dentro de la plataforma (no hay correo). */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notifica a varios usuarios. Nunca hace fallar la operación principal:
   * si algo sale mal solo se registra en el log.
   */
  async notify(userIds: string[], notification: NewNotification) {
    const recipients = [...new Set(userIds)];
    if (recipients.length === 0) return;
    const title =
      notification.title.length > MAX_TITLE
        ? `${notification.title.slice(0, MAX_TITLE - 1)}…`
        : notification.title;
    try {
      await this.prisma.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          type: notification.type,
          title,
          link: notification.link ?? null,
        })),
      });
    } catch (error) {
      this.logger.error(`No se pudieron crear notificaciones: ${String(error)}`);
    }
  }

  async list(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, type: true, title: true, link: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string, type?: NotificationType) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, type },
      data: { readAt: new Date() },
    });
  }
}
