import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AllowPendingPassword } from '../common/decorators/allow-pending-password.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EnvironmentVariables, validateEnv } from '../config/env.validation';
import { generateTemporaryPassword } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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

describe('Contraseña temporal pendiente', () => {
  const guard = new JwtAuthGuard(new Reflector(), tokens);
  const pending = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: true }).token;
  const normal = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: false }).token;

  it('bloquea la API salvo las rutas de cuenta', () => {
    expect(() => guard.canActivate(contextFor('normal', pending))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('account', pending))).toBe(true);
  });

  it('no afecta a sesiones normales', () => {
    expect(guard.canActivate(contextFor('normal', normal))).toBe(true);
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
