import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, statSync } from 'node:fs';
import { posix, resolve, sep } from 'node:path';
import { resolveStorageRoot } from './disk-upload';
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
    this.root = resolveStorageRoot(configured);
    this.useAccelRedirect = config.get('FILES_ACCEL_REDIRECT', { infer: true });
  }

  /**
   * Comprueba el permiso y devuelve dónde está el archivo y con qué nombre se descarga
   * (el original con que se subió; en disco se guarda con un nombre aleatorio).
   */
  async authorize(requestedPath: string, user: TokenPayload) {
    const relativePath = this.normalize(requestedPath);
    const area = relativePath.split('/')[0] as StorageArea;

    if (!STORAGE_AREAS.includes(area)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const record = await this.lookup(area, relativePath, user);
    if (record.deleted) {
      throw new GoneException('Este archivo se borró para liberar espacio al cerrar el periodo');
    }

    const absolutePath = resolve(this.root, ...relativePath.split('/'));
    if (!absolutePath.startsWith(this.root + sep)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return { relativePath, absolutePath, downloadName: record.name ?? posix.basename(relativePath) };
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

  /**
   * Busca el registro del archivo y aplica los permisos. El administrador lee todo
   * (también archivos sin registro); los demás, solo lo que les corresponde.
   */
  private async lookup(area: StorageArea, relativePath: string, user: TokenPayload): Promise<FileRecord> {
    const isAdmin = user.role === 'ADMIN';
    const denied = () => new ForbiddenException('No tienes acceso a este archivo');

    switch (area) {
      case 'avatars':
        // Cualquier usuario autenticado de la plataforma.
        return { name: null, deleted: false };

      case 'repository': {
        // Aprobado: cualquiera. Pendiente o rechazado: solo su autor.
        const resource = await this.prisma.resource.findUnique({
          where: { fileUrl: relativePath },
          select: { status: true, authorId: true, originalName: true },
        });
        if (isAdmin || (resource && (resource.status === 'APPROVED' || resource.authorId === user.sub))) {
          return { name: resource?.originalName ?? null, deleted: false };
        }
        throw denied();
      }

      case 'submissions': {
        const file = await this.prisma.submissionFile.findUnique({
          where: { fileUrl: relativePath },
          select: {
            originalName: true,
            fileDeletedAt: true,
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
          isAdmin ||
          (submission &&
            (submission.studentId === user.sub || submission.assignment.course.teacherId === user.sub))
        ) {
          return { name: file?.originalName ?? null, deleted: Boolean(file?.fileDeletedAt) };
        }
        throw denied();
      }

      case 'classroom-drive': {
        // Material del curso: solo su docente y los alumnos inscritos.
        const material = await this.prisma.courseMaterial.findUnique({
          where: { fileUrl: relativePath },
          select: {
            originalName: true,
            fileDeletedAt: true,
            course: {
              select: {
                teacherId: true,
                enrollments: { where: { studentId: user.sub }, select: { id: true } },
              },
            },
          },
        });
        const course = material?.course;
        if (isAdmin || (course && (course.teacherId === user.sub || course.enrollments.length > 0))) {
          return { name: material?.originalName ?? null, deleted: Boolean(material?.fileDeletedAt) };
        }
        throw denied();
      }
    }
  }
}

interface FileRecord {
  /** Nombre original del archivo, si se conoce. */
  name: string | null;
  /** Se borró del disco al liberar el espacio de un periodo cerrado. */
  deleted: boolean;
}

/** Tipos que el navegador muestra (vista previa de PDF e imágenes); el resto se descarga. */
const INLINE_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);

/**
 * Encabezado Content-Disposition con el nombre original (RFC 6266): `filename` en ASCII
 * para navegadores viejos y `filename*` en UTF-8 para acentos y eñes.
 */
export function contentDisposition(name: string, storedPath: string) {
  // Quitar caracteres de control es justo lo que se busca: no deben llegar a un encabezado.
  // eslint-disable-next-line no-control-regex
  const clean = name.replace(/[\u0000-\u001f\u007f"\\/]/g, '_').trim() || 'archivo';
  // Se decide con la extensión guardada (la validó el servidor), no con la que escribió el usuario.
  const ext = posix.extname(storedPath).slice(1).toLowerCase();
  const type = INLINE_EXTENSIONS.has(ext) ? 'inline' : 'attachment';
  const ascii = clean.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
