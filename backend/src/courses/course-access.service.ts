import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';

/** Relación del usuario con un curso. */
export type CourseRole = 'teacher' | 'student' | 'admin';

/**
 * Validación de pertenencia al curso. El rol global no basta: un docente solo
 * gestiona sus cursos y un alumno solo ve aquellos en los que está inscrito.
 * Úsalo en todo endpoint que reciba un courseId (tareas, entregas, tablón…).
 */
@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve el rol del usuario en el curso. Si no pertenece responde 404
   * (no 403) para no revelar qué cursos existen.
   */
  async roleIn(courseId: string, user: TokenPayload): Promise<CourseRole> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        teacherId: true,
        enrollments: { where: { studentId: user.sub }, select: { id: true } },
      },
    });

    if (course) {
      if (user.role === 'ADMIN') return 'admin';
      if (user.role === 'TEACHER' && course.teacherId === user.sub) return 'teacher';
      if (user.role === 'STUDENT' && course.enrollments.length > 0) return 'student';
    }
    throw new NotFoundException('Curso no encontrado');
  }

  /** Exige ser el docente del curso (o administrador). */
  async assertCanManage(courseId: string, user: TokenPayload) {
    const role = await this.roleIn(courseId, user);
    if (role === 'student') {
      throw new ForbiddenException('Solo el docente del curso puede hacer esto');
    }
    return role;
  }

  /**
   * Con el periodo cerrado ya no se cambia nada que afecte calificaciones:
   * crear tareas o cuestionarios, rúbricas, puntos, pesos ni calificar.
   */
  async assertTermOpen(courseId: string, action = 'las calificaciones ya no se pueden cambiar') {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { academicTerm: { select: { closed: true } } },
    });
    if (course?.academicTerm.closed) {
      throw new ConflictException(`El periodo está cerrado: ${action}`);
    }
  }
}
