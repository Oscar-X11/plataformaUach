import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionStateService } from './session-state.service';
import { TokenService } from './token.service';

export const BCRYPT_ROUNDS = 12;

const SESSION_USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  status: true,
  mustChangePassword: true,
  facultyId: true,
  careerId: true,
} satisfies Prisma.UserSelect;

type SessionUser = Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>;

/** Datos del usuario + la versión de sesión, que va en el token pero no se devuelve al cliente. */
const SESSION_SELECT = { ...SESSION_USER_SELECT, sessionVersion: true } satisfies Prisma.UserSelect;

// Hash usado para igualar el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync('uach-timing-equalizer', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionStateService,
  ) {}

  async register(dto: RegisterDto) {
    await this.assertAcademicData(dto.facultyId, dto.careerId);

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con esa matrícula');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          username: dto.username,
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          fullName: dto.fullName,
          role: 'STUDENT',
          facultyId: dto.facultyId,
          careerId: dto.careerId,
        },
        select: SESSION_SELECT,
      });
      return this.createSession(user);
    } catch (error) {
      // Dos registros simultáneos con la misma matrícula.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una cuenta con esa matrícula');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { ...SESSION_SELECT, passwordHash: true },
    });

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('La cuenta no está activa');
    }

    const { passwordHash: _passwordHash, ...sessionUser } = user;
    return this.createSession(sessionUser);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SESSION_USER_SELECT,
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return user;
  }

  /**
   * Cambia la contraseña propia y emite una sesión nueva sin la marca de temporal.
   * Las demás sesiones abiertas (otros dispositivos) dejan de valer.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
      select: SESSION_SELECT,
    });
    this.sessions.forget(userId);
    return this.createSession(updated);
  }

  private createSession({ sessionVersion, ...user }: SessionUser & { sessionVersion: number }) {
    const { token, expiresAt } = this.tokens.sign({
      sub: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      sv: sessionVersion,
    });
    return { user, accessToken: token, expiresAt };
  }

  private async assertAcademicData(facultyId?: string, careerId?: string) {
    if (!careerId) {
      if (facultyId) {
        const faculty = await this.prisma.faculty.findUnique({
          where: { id: facultyId },
          select: { id: true },
        });
        if (!faculty) throw new BadRequestException('El nivel no existe');
      }
      return;
    }

    const career = await this.prisma.career.findUnique({
      where: { id: careerId },
      select: { facultyId: true },
    });

    if (!career) {
      throw new BadRequestException('La carrera no existe');
    }
    if (facultyId && career.facultyId !== facultyId) {
      throw new BadRequestException(
        'La carrera no pertenece al nivel seleccionado',
      );
    }
  }
}
