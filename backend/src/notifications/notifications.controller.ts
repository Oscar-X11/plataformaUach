import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() { user }: AuthenticatedRequest) {
    return this.notifications.list(user.sub);
  }

  @HttpCode(204)
  @Post('read-all')
  async markAllRead(@Req() { user }: AuthenticatedRequest, @Query('type') type?: string) {
    // ?type=POST_CREATED marca solo los avisos del tablón (panel del inicio).
    const valid = Object.values(NotificationType).find((value) => value === type);
    await this.notifications.markAllRead(user.sub, valid);
  }

  @HttpCode(204)
  @Post(':id/read')
  async markRead(@Param('id', ParseUUIDPipe) id: string, @Req() { user }: AuthenticatedRequest) {
    await this.notifications.markRead(user.sub, id);
  }
}
