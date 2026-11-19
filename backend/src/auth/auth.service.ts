import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  enrollment: true,
  facultyId: true,
  careerId: true,
} satisfies Prisma.UserSelect;

type SessionUser = Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>;

// Hash usado para igualar el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync('uach-timing-equalizer', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    this.assertAllowedDomain(email);
    await this.assertAcademicData(dto.facultyId, dto.careerId);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(dto.enrollment ? [{ enrollment: dto.enrollment }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo o matrícula',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName,
        enrollment: dto.enrollment || null,
        role: 'STUDENT',
        facultyId: dto.facultyId,
        careerId: dto.careerId,
      },
      select: SESSION_USER_SELECT,
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { ...SESSION_USER_SELECT, passwordHash: true },
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

  private createSession(user: SessionUser) {
    const { token, expiresAt } = this.tokens.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { user, accessToken: token, expiresAt };
  }

  private assertAllowedDomain(email: string) {
    const domains = this.config
      .get('REGISTRATION_EMAIL_DOMAINS', { infer: true })
      ?.split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    if (domains?.length && !domains.includes(email.split('@')[1])) {
      throw new BadRequestException(
        `Usa tu correo institucional (${domains.join(', ')})`,
      );
    }
  }

  private async assertAcademicData(facultyId?: string, careerId?: string) {
    if (!careerId) {
      if (facultyId) {
        const faculty = await this.prisma.faculty.findUnique({
          where: { id: facultyId },
          select: { id: true },
        });
        if (!faculty) throw new BadRequestException('La facultad no existe');
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
        'La carrera no pertenece a la facultad seleccionada',
      );
    }
  }
}
