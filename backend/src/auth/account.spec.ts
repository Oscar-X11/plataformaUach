import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AllowPendingPassword } from '../common/decorators/allow-pending-password.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EnvironmentVariables, validateEnv } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { generateTemporaryPassword } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionStateService } from './session-state.service';
import { TokenService } from './token.service';

const env = validateEnv({ DATABASE_URL: 'mysql://x', JWT_SECRET: 'x'.repeat(48) });
const tokens = new TokenService({
  get: (key: keyof EnvironmentVariables) => env[key],
} as unknown as ConfigService<EnvironmentVariables, true>);

class Handlers {
  normal() {}
  @AllowPendingPassword()
  account() {}
}

function contextFor(handler: keyof Handlers, token: string) {
  const request = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
  return {
    getHandler: () => Handlers.prototype[handler],
    getClass: () => Handlers,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** Guard con una BD simulada: `row` es lo que hay guardado del usuario u1. */
function guardWith(row: Record<string, unknown> | null) {
  const findUnique = jest.fn().mockImplementation(() => Promise.resolve(row));
  const sessions = new SessionStateService({ user: { findUnique } } as unknown as PrismaService);
  return { guard: new JwtAuthGuard(new Reflector(), tokens, sessions), sessions, findUnique };
}

const activeRow = (extra: Record<string, unknown> = {}) => ({
  status: 'ACTIVE',
  sessionVersion: 0,
  role: 'STUDENT',
  mustChangePassword: false,
  ...extra,
});

describe('Contraseña temporal pendiente', () => {
  const normal = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: false, sv: 0 }).token;

  it('bloquea la API salvo las rutas de cuenta', async () => {
    const { guard } = guardWith(activeRow({ mustChangePassword: true }));
    await expect(guard.canActivate(contextFor('normal', normal))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(contextFor('account', normal))).resolves.toBe(true);
  });

  it('no afecta a sesiones normales', async () => {
    const { guard } = guardWith(activeRow());
    await expect(guard.canActivate(contextFor('normal', normal))).resolves.toBe(true);
  });
});

describe('Sesiones revocadas', () => {
  const token = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: false, sv: 0 }).token;

  it('rechaza el token si la cuenta se desactivó', async () => {
    const { guard } = guardWith(activeRow({ status: 'INACTIVE' }));
    await expect(guard.canActivate(contextFor('normal', token))).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el token si se restableció o cambió la contraseña después', async () => {
    const { guard } = guardWith(activeRow({ sessionVersion: 1 }));
    await expect(guard.canActivate(contextFor('normal', token))).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el token de una cuenta borrada', async () => {
    const { guard } = guardWith(null);
    await expect(guard.canActivate(contextFor('normal', token))).rejects.toThrow(UnauthorizedException);
  });

  it('usa el rol guardado en la BD, no el del token', async () => {
    const { guard } = guardWith(activeRow({ role: 'TEACHER' }));
    const request = { headers: { authorization: `Bearer ${token}` }, cookies: {} } as { user?: { role: string } };
    const context = {
      getHandler: () => Handlers.prototype.normal,
      getClass: () => Handlers,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await guard.canActivate(context);
    expect(request.user?.role).toBe('TEACHER');
  });

  it('cachea la consulta y la repite tras forget()', async () => {
    const { guard, sessions, findUnique } = guardWith(activeRow());
    await guard.canActivate(contextFor('normal', token));
    await guard.canActivate(contextFor('normal', token));
    expect(findUnique).toHaveBeenCalledTimes(1);
    sessions.forget('u1');
    await guard.canActivate(contextFor('normal', token));
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});

describe('Matrícula / número de empleado', () => {
  it('se normaliza a mayúsculas sin espacios', () => {
    const dto = plainToInstance(LoginDto, { username: '  a2023-0148 ', password: 'x' });
    expect(dto.username).toBe('A2023-0148');
  });

  it('el registro rechaza caracteres no permitidos', () => {
    const base = { password: 'secreta123', fullName: 'Ana Ruiz' };
    const ok = plainToInstance(RegisterDto, { ...base, username: 'a2023-0148' });
    const bad = plainToInstance(RegisterDto, { ...base, username: 'ana@uach.mx' });
    expect(validateSync(ok)).toHaveLength(0);
    expect(validateSync(bad).map((error) => error.property)).toEqual(['username']);
  });
});

describe('generateTemporaryPassword', () => {
  it('genera contraseñas legibles y distintas', () => {
    const values = new Set(Array.from({ length: 50 }, generateTemporaryPassword));
    expect(values.size).toBe(50);
    for (const value of values) expect(value).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  });
});
