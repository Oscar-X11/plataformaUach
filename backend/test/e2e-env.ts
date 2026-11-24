import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertTestDatabase, testDatabaseUrl } from './test-db';

// Se ejecuta antes de cada archivo de pruebas e2e, antes de cargar la app.
const url = testDatabaseUrl();
assertTestDatabase(url);
process.env.DATABASE_URL = url;
process.env.NODE_ENV = 'test';
// Sin límite de peticiones: las pruebas inician sesión muchas veces seguidas.
process.env.THROTTLE_DISABLED = 'true';
// Archivos subidos en una carpeta temporal, no en storage/.
process.env.STORAGE_PATH = mkdtempSync(join(tmpdir(), 'uach-e2e-'));
