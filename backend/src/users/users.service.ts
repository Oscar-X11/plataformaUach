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
import { PrismaService } from '../database/prisma.service';
import { CreateStaffDto, ListUsersQuery } from './dto/users.dto';

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
  career: { select: { name: true, code: true } },
} satisfies Prisma.UserSelect;

const isNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery) {
    const page = query.page ?? 1;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
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

  async setStatus(userId: string, status: AcademicStatus, adminId: string) {
    if (userId === adminId && status !== 'ACTIVE') {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    return this.prisma.user
      .update({ where: { id: userId }, data: { status }, select: USER_LIST_SELECT })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw new NotFoundException('El usuario no existe');
        throw error;
      });
  }

  /**
   * Restablecimiento hecho por un administrador (no hay correo para recuperar).
   * Devuelve la contraseña temporal UNA sola vez; el usuario debe cambiarla al entrar.
   */
  async resetPassword(userId: string) {
    const temporaryPassword = generateTemporaryPassword();
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS),
          mustChangePassword: true,
        },
        select: { id: true, username: true, fullName: true },
      })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw new NotFoundException('El usuario no existe');
        throw error;
      });

    return { user, temporaryPassword };
  }
}
