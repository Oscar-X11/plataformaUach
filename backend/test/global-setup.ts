import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { assertTestDatabase, testDatabaseUrl } from './test-db';

/** Antes de todas las pruebas e2e: aplica las migraciones en la base de pruebas. */
export default function globalSetup() {
  const url = testDatabaseUrl();
  assertTestDatabase(url);
  const prisma = join(__dirname, '..', '..', 'node_modules', 'prisma', 'build', 'index.js');
  try {
    execFileSync(process.execPath, [prisma, 'migrate', 'deploy'], {
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = String((error as { stderr?: Buffer }).stderr ?? error);
    throw new Error(
      `No se pudieron aplicar las migraciones en la base de pruebas.\n${output}\n` +
        'Crea la base una vez (ver README › Pruebas e2e) y vuelve a intentarlo.',
    );
  }
}
