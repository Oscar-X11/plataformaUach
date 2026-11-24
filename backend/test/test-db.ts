/**
 * Base de datos de las pruebas e2e. Nunca se usa la de desarrollo: se toma
 * DATABASE_URL_TEST o, si no existe, la misma URL con "_test" al final del
 * nombre de la base (uach_platform → uach_platform_test).
 */
export function testDatabaseUrl() {
  const explicit = process.env.DATABASE_URL_TEST;
  if (explicit) return explicit;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('Define DATABASE_URL_TEST (o DATABASE_URL) para las pruebas e2e.');
  const url = new URL(base);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`;
  return url.toString();
}

/** Protección extra: las pruebas borran datos, así que la base debe terminar en "_test". */
export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Las pruebas e2e borran datos: la base debe terminar en "_test" (es "${name}").`);
  }
}
