import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('academic')
export class AcademicController {
  constructor(private readonly prisma: PrismaService) {}

  /** Niveles con sus carreras (requiere sesión; ya no hay registro abierto). */
  @Get('faculties')
  faculties() {
    return this.prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        scheme: true,
        careers: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /** Materias con su carrera (crear cursos, filtrar repositorio y grupos). */
  @Get('subjects')
  subjects() {
    return this.prisma.subject.findMany({
      orderBy: [{ career: { name: 'asc' } }, { semester: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        semester: true,
        career: {
          select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true, scheme: true } } },
        },
      },
    });
  }
}
