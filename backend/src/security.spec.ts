import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TokenService } from './auth/token.service';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { PrismaService } from './database/prisma.service';
import { FilesService } from './files/files.service';

const SECRET = 'x'.repeat(48);

function configFor(values: Partial<EnvironmentVariables>) {
  const env = validateEnv({ DATABASE_URL: 'mysql://u:p@h/db', JWT_SECRET: SECRET, ...values });
  return {
    get: (key: keyof EnvironmentVariables) => env[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

describe('validateEnv', () => {
  it('rechaza JWT_SECRET ausente o corto', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x', JWT_SECRET: 'corto' })).toThrow(
      /32 caracteres/,
    );
  });

  it('aplica valores por defecto y convierte tipos', () => {
    const env = validateEnv({
      DATABASE_URL: 'mysql://x',
      JWT_SECRET: SECRET,
      PORT: '4100',
      COOKIE_SECURE: 'true',
    });
    expect(env.PORT).toBe(4100);
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.FILES_ACCEL_REDIRECT).toBe(false);
    expect(env.JWT_EXPIRES_IN).toBe('8h');
  });
});

describe('TokenService', () => {
  const tokens = new TokenService(configFor({}));

  it('firma y verifica tokens', () => {
    const { token, expiresAt } = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: false, sv: 0 });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(tokens.verify(token)).toMatchObject({ sub: 'u1', role: 'STUDENT', mustChangePassword: false, sv: 0 });
  });

  const now = () => Math.floor(Date.now() / 1000);
  const state = { role: 'STUDENT' as const, mustChangePassword: false };

  it('renueva la sesión solo cuando el token tiene más de 15 minutos', () => {
    const base = { sub: 'u1', role: 'STUDENT' as const, mustChangePassword: false, sv: 2 };
    expect(tokens.renew({ ...base, iat: now() - 60, at: now() - 60 }, state)).toBeNull();
    const renewed = tokens.renew({ ...base, iat: now() - 20 * 60, at: now() - 3600 }, state);
    expect(renewed).not.toBeNull();
    // Conserva la versión de sesión y el momento del inicio de sesión.
    expect(tokens.verify(renewed!.token)).toMatchObject({ sub: 'u1', sv: 2, at: now() - 3600 });
  });

  it('nunca pasa del límite absoluto de la sesión (14 días)', () => {
    const base = { sub: 'u1', role: 'STUDENT' as const, mustChangePassword: false, sv: 0 };
    const started = now() - 14 * 86_400 + 600; // faltan 10 minutos para el límite
    const renewed = tokens.renew({ ...base, iat: now() - 20 * 60, at: started }, state);
    expect(renewed!.expiresAt.getTime()).toBe((started + 14 * 86_400) * 1000);
    expect(tokens.renew({ ...base, iat: now() - 20 * 60, at: now() - 15 * 86_400 }, state)).toBeNull();
  });

  it('rechaza tokens manipulados', () => {
    const { token } = tokens.sign({ sub: 'u1', role: 'STUDENT', mustChangePassword: false, sv: 0 });
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'u1', role: 'ADMIN', mustChangePassword: false }),
    ).toString('base64url');
    expect(tokens.verify(`${header}.${forged}.${signature}`)).toBeNull();
    expect(tokens.verify('basura')).toBeNull();
  });
});

describe('FilesService', () => {
  const root = mkdtempSync(join(tmpdir(), 'uach-storage-'));
  mkdirSync(join(root, 'repository'));
  mkdirSync(join(root, 'submissions'));
  writeFileSync(join(root, 'repository', 'guia.pdf'), 'pdf');
  writeFileSync(join(root, 'submissions', 'tarea.pdf'), 'pdf');

  const findUnique = jest.fn();
  const resourceLookup = jest.fn();
  const prisma = {
    submissionFile: { findUnique },
    resource: { findUnique: resourceLookup },
  } as unknown as PrismaService;
  const files = new FilesService(prisma, configFor({ STORAGE_PATH: root }));
  const student = { sub: 's1', role: 'STUDENT' as const, mustChangePassword: false, sv: 0 };

  it('el repositorio entrega lo aprobado a todos y lo pendiente solo a su autor', async () => {
    resourceLookup.mockResolvedValue({ status: 'APPROVED', authorId: 'otro' });
    await expect(files.authorize('repository/guia.pdf', student)).resolves.toMatchObject({
      relativePath: 'repository/guia.pdf',
    });
    resourceLookup.mockResolvedValue({ status: 'PENDING', authorId: 'otro' });
    await expect(files.authorize('repository/guia.pdf', student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    resourceLookup.mockResolvedValue({ status: 'PENDING', authorId: 's1' });
    await expect(files.authorize('repository/guia.pdf', student)).resolves.toBeDefined();
  });

  it.each(['../.env', 'repository/../../.env', '..%2f.env', 'otra-area/x', '.git/config', ''])(
    'bloquea la ruta %p',
    async (path) => {
      await expect(files.authorize(path, student)).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('solo el alumno dueño o el docente del curso ven una entrega', async () => {
    findUnique.mockResolvedValue({
      submission: { studentId: 'otro', assignment: { course: { teacherId: 't1' } } },
    });
    await expect(files.authorize('submissions/tarea.pdf', student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      files.authorize('submissions/tarea.pdf', { ...student, sub: 't1', role: 'TEACHER' }),
    ).resolves.toBeDefined();
    await expect(
      files.authorize('submissions/tarea.pdf', { ...student, sub: 'otro' }),
    ).resolves.toBeDefined();
  });
});
