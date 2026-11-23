import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AcademicStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../auth/auth.service';
import { SessionStateService } from '../auth/session-state.service';
import { PrismaService } from '../database/prisma.service';
import {
  AssignCareerDto,
  CreateStaffDto,
  IMPORT_CREATE_MAX,
  ImportStudentsDto,
  ListUsersQuery,
} from './dto/users.dto';
import { prepareStudentRows, studentInitialPassword, summarize } from './student-import';

// Sin caracteres que se confunden al dictarlos (0/o, 1/l/i).
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const PAGE_SIZE = 25;

/** Contraseña temporal legible, p. ej. "k7mp-4xr9-qa2h" (≈ 60 bits). */
export function generateTemporaryPassword() {
  const group = () =>
    Array.from({ length: 4 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join('');
  return `${group()}-${group()}-${group()}`;
}

const USER_LIST_SELECT = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  career: { select: { id: true, name: true, code: true } },
} satisfies Prisma.UserSelect;

const isNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStateService,
  ) {}

  async list(query: ListUsersQuery) {
    const page = query.page ?? 1;
    const search = query.search?.trim();
    const careerFilter: Prisma.UserWhereInput =
      query.careerId === 'none'
        ? { role: 'STUDENT', careerId: null }
        : query.careerId
          ? { careerId: query.careerId }
          : {};
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ...careerFilter,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { username: { contains: search.toUpperCase() } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: USER_LIST_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  /** Alta de docente o administrador con contraseña temporal (se muestra una vez). */
  async createStaff(dto: CreateStaffDto) {
    const temporaryPassword = generateTemporaryPassword();
    try {
      const user = await this.prisma.user.create({
        data: {
          username: dto.username,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS),
          mustChangePassword: true,
        },
        select: USER_LIST_SELECT,
      });
      return { user, temporaryPassword };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta con ese número de empleado');
      }
      throw error;
    }
  }

  /**
   * Alta masiva de alumnos desde el Excel de la universidad. Con dryRun solo
   * revisa (vista previa). Las matrículas que ya tienen cuenta se omiten: nunca
   * se sobrescribe la contraseña de alguien que ya entró.
   */
  async importStudents(dto: ImportStudentsDto) {
    const rows = prepareStudentRows(dto.rows);
    const career = dto.careerId ? await this.findCareer(dto.careerId) : null;

    const candidates = rows.filter((row) => row.status === 'new').map((row) => row.username);
    if (candidates.length) {
      const existing = await this.prisma.user.findMany({
        where: { username: { in: candidates } },
        select: { username: true },
      });
      const taken = new Set(existing.map((user) => user.username));
      for (const row of rows) {
        if (row.status === 'new' && taken.has(row.username)) row.status = 'exists';
      }
    }

    const toCreate = rows.filter((row) => row.status === 'new');
    if (dto.dryRun || toCreate.length === 0) return { rows, summary: summarize(rows) };

    if (toCreate.length > IMPORT_CREATE_MAX) {
      throw new BadRequestException(`Importa como máximo ${IMPORT_CREATE_MAX} alumnos por petición`);
    }

    const inputs = new Map(dto.rows.map((row) => [row.line, row]));
    const data = await Promise.all(
      toCreate.map(async (row) => {
        const input = inputs.get(row.line)!;
        row.initialPassword = studentInitialPassword(input.matricula, input.nombre);
        return {
          username: row.username,
          fullName: row.fullName,
          role: 'STUDENT' as const,
          passwordHash: await bcrypt.hash(row.initialPassword, BCRYPT_ROUNDS),
          mustChangePassword: true,
          careerId: career?.id ?? null,
          facultyId: career?.facultyId ?? null,
        };
      }),
    );
    // skipDuplicates por si otra importación creó la misma matrícula al mismo tiempo.
    await this.prisma.user.createMany({ data, skipDuplicates: true });
    for (const row of toCreate) row.status = 'created';

    return { rows, summary: summarize(rows) };
  }

  /** Carrera (y con ella la facultad) de varios alumnos. Solo aplica a alumnos. */
  async assignCareer(dto: AssignCareerDto) {
    const career = dto.careerId ? await this.findCareer(dto.careerId) : null;
    const { count } = await this.prisma.user.updateMany({
      where: { id: { in: dto.userIds }, role: 'STUDENT' },
      data: { careerId: career?.id ?? null, facultyId: career?.facultyId ?? null },
    });
    if (count === 0) throw new BadRequestException('Solo los alumnos tienen carrera');
    return { updated: count };
  }

  private async findCareer(careerId: string) {
    const career = await this.prisma.career.findUnique({
      where: { id: careerId },
      select: { id: true, facultyId: true },
    });
    if (!career) throw new BadRequestException('La carrera no existe');
    return career;
  }

  async setStatus(userId: string, status: AcademicStatus, adminId: string) {
    if (userId === adminId && status !== 'ACTIVE') {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    // Desactivar (baja, egreso, suspensión…) cierra todas sus sesiones abiertas.
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: { status, ...(status !== 'ACTIVE' && { sessionVersion: { increment: 1 } }) },
        select: USER_LIST_SELECT,
      })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw new NotFoundException('El usuario no existe');
        throw error;
      });
    this.sessions.forget(userId);
    return user;
  }

  /**
   * Restablecimiento hecho por un administrador (no hay correo para recuperar).
   * Devuelve la contraseña temporal UNA sola vez; el usuario debe cambiarla al entrar.
   * Cierra todas sus sesiones abiertas.
   */
  async resetPassword(userId: string) {
    const temporaryPassword = generateTemporaryPassword();
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS),
          mustChangePassword: true,
          sessionVersion: { increment: 1 },
        },
        select: { id: true, username: true, fullName: true },
      })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw new NotFoundException('El usuario no existe');
        throw error;
      });
    this.sessions.forget(userId);

    return { user, temporaryPassword };
  }
}
