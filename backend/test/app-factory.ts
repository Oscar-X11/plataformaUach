import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/** La app como en main.ts (cookies y validación), sobre la base de pruebas. */
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Vacía todas las tablas (menos el historial de migraciones). */
export async function resetDatabase(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ name: string }[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const { name } of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${name}\``);
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
}

export const ADMIN = { username: 'ADMIN-E2E', password: 'Admin-e2e-2026' };

/** Datos mínimos: administrador, un nivel cuatrimestral con una carrera y el periodo actual. */
export async function seedBasics(prisma: PrismaService) {
  await prisma.user.create({
    data: {
      username: ADMIN.username,
      fullName: 'Administración E2E',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(ADMIN.password, 4),
    },
  });
  const level = await prisma.faculty.create({
    data: {
      code: 'ING',
      name: 'Ingenierías',
      scheme: 'CUATRIMESTRAL',
      careers: { create: { code: 'ISC', name: 'Ingeniería en Sistemas Computacionales' } },
    },
    select: { careers: { select: { id: true } } },
  });
  const now = new Date();
  await prisma.academicTerm.create({
    data: {
      code: 'E2E-C1',
      name: 'Cuatrimestre de pruebas',
      scheme: 'CUATRIMESTRAL',
      isCurrent: true,
      startsAt: new Date(now.getTime() - 30 * 86_400_000),
      endsAt: new Date(now.getTime() + 90 * 86_400_000),
    },
  });
  return { careerId: level.careers[0].id, term: 'E2E-C1' };
}
