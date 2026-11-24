import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
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
}
