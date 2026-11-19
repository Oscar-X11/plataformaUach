import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, statSync } from 'node:fs';
import { isAbsolute, posix, resolve, sep } from 'node:path';
import { TokenPayload } from '../auth/token.service';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';

export const STORAGE_AREAS = [
  'avatars',
  'classroom-drive',
  'repository',
  'submissions',
] as const;

type StorageArea = (typeof STORAGE_AREAS)[number];

/**
 * Convención: los campos fileUrl de la base de datos guardan la ruta relativa
 * dentro de storage/, por ejemplo "submissions/<cursoId>/<archivo>.pdf".
 */
@Injectable()
export class FilesService {
  readonly root: string;
  readonly useAccelRedirect: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    const configured = config.get('STORAGE_PATH', { infer: true });
    // En desarrollo el proceso corre dentro de backend/, storage/ está en la raíz.
    this.root = configured
      ? isAbsolute(configured)
        ? configured
        : resolve(process.cwd(), configured)
      : resolve(process.cwd(), '..', 'storage');
    this.useAccelRedirect = config.get('FILES_ACCEL_REDIRECT', { infer: true });
  }

  async authorize(requestedPath: string, user: TokenPayload) {
    const relativePath = this.normalize(requestedPath);
    const area = relativePath.split('/')[0] as StorageArea;

    if (!STORAGE_AREAS.includes(area)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    await this.assertCanRead(area, relativePath, user);

    const absolutePath = resolve(this.root, ...relativePath.split('/'));
    if (!absolutePath.startsWith(this.root + sep)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return { relativePath, absolutePath };
  }

  private normalize(requestedPath: string) {
    const decoded = requestedPath.replace(/\\/g, '/');
    const normalized = posix.normalize(decoded).replace(/^\/+/, '');
    if (
      !normalized ||
      normalized.startsWith('..') ||
      normalized.split('/').some((segment) => segment.startsWith('.'))
    ) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return normalized;
  }

  private async assertCanRead(
    area: StorageArea,
    relativePath: string,
    user: TokenPayload,
  ) {
    if (user.role === 'ADMIN') return;

    switch (area) {
      case 'avatars':
      case 'repository':
        // Cualquier usuario autenticado de la plataforma.
        return;

      case 'submissions': {
        const file = await this.prisma.submissionFile.findUnique({
          where: { fileUrl: relativePath },
          select: {
            submission: {
              select: {
                studentId: true,
                assignment: { select: { course: { select: { teacherId: true } } } },
              },
            },
          },
        });
        const submission = file?.submission;
        if (
          submission &&
          (submission.studentId === user.sub ||
            submission.assignment.course.teacherId === user.sub)
        ) {
          return;
        }
        throw new ForbiddenException('No tienes acceso a este archivo');
      }

      case 'classroom-drive':
        // Pendiente (fase 1): validar pertenencia al curso cuando exista el modelo Attachment.
        if (user.role === 'TEACHER' || user.role === 'STUDENT') return;
        throw new ForbiddenException('No tienes acceso a este archivo');
    }
  }
}
