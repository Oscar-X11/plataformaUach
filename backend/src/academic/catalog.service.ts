import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CareerDto, FacultyDto, SubjectDto, TermDto, UpdateTermDto } from './catalog.dto';

const TERM_SELECT = {
  id: true,
  code: true,
  name: true,
  scheme: true,
  startsAt: true,
  endsAt: true,
  isCurrent: true,
  closed: true,
  _count: { select: { courses: true } },
} satisfies Prisma.AcademicTermSelect;

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(`${value.slice(0, 10)}T00:00:00Z`);

/** Traduce los errores de Prisma a mensajes para el administrador. */
function friendly(error: unknown, what: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ConflictException(`Ya existe ${what} con esa clave`);
    if (error.code === 'P2025') throw new NotFoundException(`No se encontró ${what}`);
    if (error.code === 'P2003') throw new ConflictException(`${what} está en uso y no se puede borrar`);
  }
  throw error;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Catálogo académico (niveles → carreras → materias) y periodos.
 * En el código el nivel se llama Faculty; en la web nunca se dice «facultad».
 * Solo los administradores los modifican. Borrar algo que ya se usa no se
 * permite: primero hay que mover o borrar lo que depende de ello.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────── Catálogo completo (vista de administración) ─────────────

  catalog() {
    return this.prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        scheme: true,
        passingGrade: true,
        _count: { select: { users: true } },
        careers: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            code: true,
            _count: { select: { users: true } },
            subjects: {
              orderBy: [{ semester: 'asc' }, { name: 'asc' }],
              select: {
                id: true,
                name: true,
                code: true,
                semester: true,
                _count: { select: { courses: true, resources: true } },
              },
            },
          },
        },
      },
    });
  }

  // ───────────── Facultades ─────────────

  createFaculty(dto: FacultyDto) {
    return this.prisma.faculty.create({ data: dto }).catch((e) => friendly(e, 'un nivel'));
  }

  updateFaculty(id: string, dto: FacultyDto) {
    return this.prisma.faculty.update({ where: { id }, data: dto }).catch((e) => friendly(e, 'un nivel'));
  }

  async deleteFaculty(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      select: { _count: { select: { careers: true } } },
    });
    if (!faculty) throw new NotFoundException('No se encontró el nivel');
    if (faculty._count.careers > 0) {
      throw new ConflictException(
        `El nivel tiene ${plural(faculty._count.careers, 'carrera', 'carreras')}; bórralas o muévelas primero`,
      );
    }
    await this.prisma.faculty.delete({ where: { id } }).catch((e) => friendly(e, 'El nivel'));
  }

  // ───────────── Carreras ─────────────

  async createCareer(dto: CareerDto) {
    await this.assertExists('faculty', dto.facultyId, 'El nivel no existe');
    return this.prisma.career.create({ data: dto }).catch((e) => friendly(e, 'una carrera'));
  }

  async updateCareer(id: string, dto: CareerDto) {
    await this.assertExists('faculty', dto.facultyId, 'El nivel no existe');
    const career = await this.prisma.career
      .update({ where: { id }, data: dto })
      .catch((e) => friendly(e, 'una carrera'));
    // Si la carrera cambió de facultad, sus alumnos también.
    await this.prisma.user.updateMany({ where: { careerId: id }, data: { facultyId: dto.facultyId } });
    return career;
  }

  async deleteCareer(id: string) {
    const career = await this.prisma.career.findUnique({
      where: { id },
      select: { _count: { select: { subjects: true, users: true } } },
    });
    if (!career) throw new NotFoundException('No se encontró la carrera');
    const { subjects, users } = career._count;
    if (subjects > 0 || users > 0) {
      const parts = [
        subjects > 0 && plural(subjects, 'materia', 'materias'),
        users > 0 && plural(users, 'alumno asignado', 'alumnos asignados'),
      ].filter(Boolean);
      throw new ConflictException(`La carrera tiene ${parts.join(' y ')}; no se puede borrar`);
    }
    await this.prisma.career.delete({ where: { id } }).catch((e) => friendly(e, 'La carrera'));
  }

  // ───────────── Materias ─────────────

  async createSubject(dto: SubjectDto) {
    await this.assertExists('career', dto.careerId, 'La carrera no existe');
    return this.prisma.subject.create({ data: dto }).catch((e) => friendly(e, 'una materia'));
  }

  async updateSubject(id: string, dto: SubjectDto) {
    await this.assertExists('career', dto.careerId, 'La carrera no existe');
    return this.prisma.subject.update({ where: { id }, data: dto }).catch((e) => friendly(e, 'una materia'));
  }

  async deleteSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      select: { _count: { select: { courses: true, resources: true } } },
    });
    if (!subject) throw new NotFoundException('No se encontró la materia');
    const { courses, resources } = subject._count;
    if (courses > 0 || resources > 0) {
      const parts = [
        courses > 0 && plural(courses, 'curso', 'cursos'),
        resources > 0 && plural(resources, 'recurso del repositorio', 'recursos del repositorio'),
      ].filter(Boolean);
      throw new ConflictException(`La materia tiene ${parts.join(' y ')}; no se puede borrar`);
    }
    await this.prisma.subject.delete({ where: { id } }).catch((e) => friendly(e, 'La materia'));
  }

  // ───────────── Periodos ─────────────

  terms() {
    return this.prisma.academicTerm.findMany({
      orderBy: [{ scheme: 'asc' }, { isCurrent: 'desc' }, { startsAt: 'desc' }, { code: 'desc' }],
      select: TERM_SELECT,
    });
  }

  async createTerm(dto: TermDto) {
    this.assertRange(dto.startsAt, dto.endsAt);
    const scheme = dto.scheme ?? 'CUATRIMESTRAL';
    // El primer periodo de cada tipo queda como actual.
    const isFirst = (await this.prisma.academicTerm.count({ where: { scheme } })) === 0;
    return this.prisma.academicTerm
      .create({
        data: {
          code: dto.code,
          name: dto.name,
          scheme,
          startsAt: toDate(dto.startsAt),
          endsAt: toDate(dto.endsAt),
          isCurrent: isFirst,
        },
        select: TERM_SELECT,
      })
      .catch((e) => friendly(e, 'un periodo'));
  }

  async updateTerm(id: string, dto: UpdateTermDto) {
    const term = await this.prisma.academicTerm.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('No se encontró el periodo');
    const startsAt = dto.startsAt === undefined ? term.startsAt?.toISOString() : dto.startsAt;
    const endsAt = dto.endsAt === undefined ? term.endsAt?.toISOString() : dto.endsAt;
    this.assertRange(startsAt, endsAt);

    // Un periodo cerrado no puede ser el actual, y el actual no puede estar cerrado.
    const data: Prisma.AcademicTermUpdateInput = {
      name: dto.name,
      startsAt: toDate(dto.startsAt),
      endsAt: toDate(dto.endsAt),
    };
    if (dto.closed !== undefined) {
      data.closed = dto.closed;
      if (dto.closed) data.isCurrent = false;
    }
    if (dto.isCurrent) {
      data.isCurrent = true;
      data.closed = false;
    } else if (dto.isCurrent === false) {
      data.isCurrent = false;
    }

    if (!dto.isCurrent) {
      return this.prisma.academicTerm.update({ where: { id }, data, select: TERM_SELECT });
    }
    // Un periodo actual por tipo: el anterior del mismo tipo deja de serlo en la misma transacción.
    const [, updated] = await this.prisma.$transaction([
      this.prisma.academicTerm.updateMany({
        where: { id: { not: id }, scheme: term.scheme, isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.academicTerm.update({ where: { id }, data, select: TERM_SELECT }),
    ]);
    return updated;
  }

  async deleteTerm(id: string) {
    const term = await this.prisma.academicTerm.findUnique({
      where: { id },
      select: { _count: { select: { courses: true } } },
    });
    if (!term) throw new NotFoundException('No se encontró el periodo');
    if (term._count.courses > 0) {
      throw new ConflictException(
        `El periodo tiene ${plural(term._count.courses, 'curso', 'cursos')}; ciérralo en lugar de borrarlo`,
      );
    }
    await this.prisma.academicTerm.delete({ where: { id } }).catch((e) => friendly(e, 'El periodo'));
  }

  // ───────────── Utilidades ─────────────

  private assertRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
    if (startsAt && endsAt && startsAt.slice(0, 10) > endsAt.slice(0, 10)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
    }
  }

  private async assertExists(model: 'faculty' | 'career', id: string, message: string) {
    const found =
      model === 'faculty'
        ? await this.prisma.faculty.findUnique({ where: { id }, select: { id: true } })
        : await this.prisma.career.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(message);
  }
}
