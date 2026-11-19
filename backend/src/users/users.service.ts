import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

// Sin caracteres que se confunden al dictarlos (0/o, 1/l/i).
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Contraseña temporal legible, p. ej. "k7mp-4xr9-qa2h" (≈ 60 bits). */
export function generateTemporaryPassword() {
  const group = () =>
    Array.from({ length: 4 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join('');
  return `${group()}-${group()}-${group()}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException('El usuario no existe');
        }
        throw error;
      });

    return { user, temporaryPassword };
  }
}
