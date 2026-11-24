import { BadRequestException, Controller, Get, Injectable, Module, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { TokenPayload } from '../auth/token.service';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { AvailabilityService } from '../courses/availability.service';
import { CoursesModule } from '../courses/courses.module';
import { PrismaService } from '../database/prisma.service';

/** Resultados por grupo: pocos, para que la búsqueda sea ligera (servidor de 4 GB). */
const LIMIT = 6;

export interface SearchHit {
  id: string;
  kind: 'course' | 'assignment' | 'quiz' | 'material' | 'user';
  title: string;
  /** Contexto corto: la clase, la carrera o la matrícula. */
  subtitle: string;
  href: string;
}

/**
 * Búsqueda global: clases, tareas, cuestionarios y material de las clases del
 * usuario; la administración también busca usuarios. La colación de MySQL no
 * distingue mayúsculas ni acentos.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  async search(raw: string, user: TokenPayload): Promise<{ query: string; results: SearchHit[] }> {
    const query = raw.trim().replace(/\s+/g, ' ');
    if (query.length < 2) return { query, results: [] };
    const student = user.role === 'STUDENT';
    const mine: Prisma.CourseWhereInput =
      user.role === 'ADMIN'
        ? {}
        : user.role === 'TEACHER'
          ? { teacherId: user.sub }
          : { enrollments: { some: { studentId: user.sub } } };
    const text = { contains: query };

    const [courses, assignments, quizzes, materials, users] = await Promise.all([
      this.prisma.course.findMany({
        where: { ...mine, OR: [{ name: text }, { career: { name: text } }, { subject: { name: text } }] },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: { id: true, name: true, term: true, career: { select: { code: true } } },
      }),
      this.prisma.assignment.findMany({
        where: { course: mine, title: text },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          courseId: true,
          availableFrom: true,
          requiresKind: true,
          requiresId: true,
          course: { select: { name: true } },
        },
      }),
      this.prisma.quiz.findMany({
        where: { course: mine, title: text, ...(student ? { published: true } : {}) },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          id: true,
          title: true,
          kind: true,
          courseId: true,
          requiresKind: true,
          requiresId: true,
          course: { select: { name: true } },
        },
      }),
      this.prisma.courseMaterial.findMany({
        where: { course: mine, OR: [{ title: text }, { originalName: text }] },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: { id: true, title: true, courseId: true, course: { select: { name: true } } },
      }),
      user.role === 'ADMIN'
        ? this.prisma.user.findMany({
            where: { OR: [{ fullName: text }, { username: { contains: query.toUpperCase() } }] },
            orderBy: { fullName: 'asc' },
            take: LIMIT,
            select: { id: true, fullName: true, username: true, role: true },
          })
        : [],
    ]);

    // El alumno no encuentra lo que todavía tiene bloqueado.
    const [assignmentOpen, quizOpen] = student
      ? await Promise.all([
          this.availability.availableMany(
            user.sub,
            assignments.map((row) => ({ from: row.availableFrom, requiresKind: row.requiresKind, requiresId: row.requiresId })),
          ),
          this.availability.availableMany(
            user.sub,
            quizzes.map((row) => ({ requiresKind: row.requiresKind, requiresId: row.requiresId })),
          ),
        ])
      : [null, null];

    const ROLE = { STUDENT: 'Alumno', TEACHER: 'Docente', ADMIN: 'Administrador' } as const;
    const results: SearchHit[] = [
      ...courses.map((row) => ({
        id: row.id,
        kind: 'course' as const,
        title: row.name,
        subtitle: `Clase · ${row.career.code} · ${row.term}`,
        href: `/cursos/${row.id}`,
      })),
      ...assignments
        .filter((_, index) => !assignmentOpen || assignmentOpen[index])
        .map((row) => ({
          id: row.id,
          kind: 'assignment' as const,
          title: row.title,
          subtitle: `Tarea · ${row.course.name}`,
          href: `/cursos/${row.courseId}/tareas/${row.id}`,
        })),
      ...quizzes
        .filter((_, index) => !quizOpen || quizOpen[index])
        .map((row) => ({
          id: row.id,
          kind: 'quiz' as const,
          title: row.title,
          subtitle: `${row.kind === 'SURVEY' ? 'Encuesta' : 'Cuestionario'} · ${row.course.name}`,
          href: `/cursos/${row.courseId}/cuestionarios/${row.id}`,
        })),
      ...materials.map((row) => ({
        id: row.id,
        kind: 'material' as const,
        title: row.title,
        subtitle: `Material · ${row.course.name}`,
        href: `/cursos/${row.courseId}/recursos`,
      })),
      ...users.map((row) => ({
        id: row.id,
        kind: 'user' as const,
        title: row.fullName,
        subtitle: `${ROLE[row.role]} · ${row.username}`,
        href: `/administracion/usuarios?q=${encodeURIComponent(row.username)}`,
      })),
    ];
    return { query, results };
  }
}

@Controller('search')
class SearchController {
  constructor(private readonly service: SearchService) {}

  /** ?q=texto (2 a 80 caracteres). */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  search(@Query('q') q: string | undefined, @Req() { user }: AuthenticatedRequest) {
    if (typeof q !== 'string' || q.length > 80) throw new BadRequestException('Búsqueda inválida');
    return this.service.search(q, user);
  }
}

@Module({
  imports: [CoursesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
