import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';

/** Archivos que se borran por vuelta: poca memoria aunque el periodo tenga miles. */
const BATCH = 200;

export interface TermFilesSummary {
  code: string;
  closed: boolean;
  courses: number;
  submissions: { count: number; bytes: number };
  materials: { count: number; bytes: number };
}

/**
 * Libera el disco de un periodo cerrado: borra de storage/ los archivos de las entregas
 * y del material de sus cursos. Los registros se conservan (calificaciones, nombres y
 * tamaños) y quedan marcados con `fileDeletedAt`. El repositorio no se toca: es por
 * materia, no por periodo.
 */
@Injectable()
export class TermFilesService {
  /** Evita dos borrados a la vez (dos clics o dos administradores). */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async summary(termId: string): Promise<TermFilesSummary> {
    const term = await this.findTerm(termId);
    const [submissions, materials] = await Promise.all([
      this.prisma.submissionFile.aggregate({
        where: this.submissionWhere(term.code),
        _count: { _all: true },
        _sum: { size: true },
      }),
      this.prisma.courseMaterial.aggregate({
        where: this.materialWhere(term.code),
        _count: { _all: true },
        _sum: { size: true },
      }),
    ]);
    return {
      code: term.code,
      closed: term.closed,
      courses: term._count.courses,
      submissions: { count: submissions._count._all, bytes: submissions._sum.size ?? 0 },
      materials: { count: materials._count._all, bytes: materials._sum.size ?? 0 },
    };
  }

  async purge(termId: string, confirm: string) {
    const term = await this.findTerm(termId);
    if (!term.closed) throw new BadRequestException('Cierra el periodo antes de borrar sus archivos');
    if (confirm.trim() !== term.code) {
      throw new BadRequestException(`Escribe la clave del periodo (${term.code}) para confirmar`);
    }
    if (this.running.has(termId)) throw new ConflictException('Ya se están borrando los archivos de este periodo');

    this.running.add(termId);
    try {
      let files = 0;
      let bytes = 0;
      // Primero el disco y luego la marca: si algo falla a la mitad, se puede repetir.
      for (;;) {
        const batch = await this.prisma.submissionFile.findMany({
          where: this.submissionWhere(term.code),
          select: { id: true, fileUrl: true, size: true },
          take: BATCH,
        });
        if (batch.length === 0) break;
        for (const file of batch) await this.storage.remove(file.fileUrl);
        await this.prisma.submissionFile.updateMany({
          where: { id: { in: batch.map((file) => file.id) } },
          data: { fileDeletedAt: new Date() },
        });
        files += batch.length;
        bytes += batch.reduce((total, file) => total + file.size, 0);
      }
      for (;;) {
        const batch = await this.prisma.courseMaterial.findMany({
          where: this.materialWhere(term.code),
          select: { id: true, fileUrl: true, size: true },
          take: BATCH,
        });
        if (batch.length === 0) break;
        for (const material of batch) await this.storage.remove(material.fileUrl);
        await this.prisma.courseMaterial.updateMany({
          where: { id: { in: batch.map((material) => material.id) } },
          data: { fileDeletedAt: new Date() },
        });
        files += batch.length;
        bytes += batch.reduce((total, material) => total + (material.size ?? 0), 0);
      }
      return { code: term.code, files, bytes };
    } finally {
      this.running.delete(termId);
    }
  }

  private async findTerm(termId: string) {
    const term = await this.prisma.academicTerm.findUnique({
      where: { id: termId },
      select: { code: true, closed: true, _count: { select: { courses: true } } },
    });
    if (!term) throw new NotFoundException('No se encontró el periodo');
    return term;
  }

  private submissionWhere(code: string): Prisma.SubmissionFileWhereInput {
    return { fileDeletedAt: null, submission: { assignment: { course: { term: code } } } };
  }

  private materialWhere(code: string): Prisma.CourseMaterialWhereInput {
    return { fileDeletedAt: null, kind: 'FILE', fileUrl: { not: null }, course: { term: code } };
  }
}

/** «1.5 MB» para la bitácora y los mensajes. */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
