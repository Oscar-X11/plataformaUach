import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { access, constants } from 'node:fs/promises';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './database/prisma.service';
import { resolveStorageRoot } from './files/disk-upload';

type Check = 'ok' | 'error';

/** Si MySQL no responde en este tiempo, se reporta como caído. */
const DB_TIMEOUT_MS = 3_000;

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estado del servicio para Docker, nginx o un monitor externo.
   * 200 si la base de datos y la carpeta de archivos responden; 503 si algo falla.
   * Es público y no revela datos: solo el estado de cada dependencia.
   */
  @Public()
  @SkipThrottle()
  @Get('health')
  async health(@Res({ passthrough: true }) res: Response) {
    const [database, storage] = await Promise.all([this.checkDatabase(), this.checkStorage()]);
    const ok = database === 'ok' && storage === 'ok';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    res.setHeader('Cache-Control', 'no-store');
    return {
      status: ok ? 'ok' : 'error',
      database,
      storage,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  private async checkDatabase(): Promise<Check> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return 'ok';
    } catch {
      return 'error';
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkStorage(): Promise<Check> {
    try {
      await access(resolveStorageRoot(), constants.R_OK | constants.W_OK);
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
