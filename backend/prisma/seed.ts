/**
 * Seed inicial de la Plataforma UACH.
 *
 * Ejecutar:  npm run prisma:seed   (desde la raíz)
 *
 * - Crea/actualiza el catálogo académico (facultades, carreras y materias).
 *   Carreras y áreas de bachillerato tomadas del sitio de la universidad; las materias aún son de
 *   ejemplo y se capturan en Administración → Materias.
 * - Para cada tipo de periodo sin periodo actual, crea el periodo en curso y lo marca como actual:
 *   cuatrimestres (licenciaturas e ingenierías): ene–abr = AAAA-C1, may–ago = AAAA-C2, sep–dic = AAAA-C3;
 *   semestres (bachillerato): ene–jun = AAAA-S1, ago–dic = AAAA-S2. Los demás los da de alta un admin.
 * - Crea el usuario administrador inicial con SEED_ADMIN_USERNAME (número de empleado) /
 *   SEED_ADMIN_PASSWORD.
 *   Si el administrador ya existe, NO se modifica su contraseña.
 *
 * Es idempotente: puede ejecutarse varias veces.
 */
import { PrismaClient, TermScheme } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SubjectSeed {
  code: string;
  name: string;
  semester: number;
}

interface CareerSeed {
  code: string;
  name: string;
  subjects: SubjectSeed[];
}

interface FacultySeed {
  code: string;
  name: string;
  scheme: TermScheme;
  careers: CareerSeed[];
}

// Oferta publicada en https://www.uach.edu.mx/Courses.php y niveles.php (consultado el 2026-11-23).
// El sitio no publica facultades: agrupa la oferta en «Licenciaturas», «Ingenierías» y la
// Preparatoria «Rosario Castellanos» (CCT 07PBHO120Y), y aquí se sigue esa agrupación.
// Siglas: las del sitio; LA, LG y LT las definió la universidad; las del bachillerato
// (marcadas «propia») no aparecen en el sitio. Las materias siguen siendo de EJEMPLO.
const CATALOG: FacultySeed[] = [
  {
    code: 'LIC',
    name: 'Licenciaturas',
    scheme: 'CUATRIMESTRAL',
    careers: [
      {
        code: 'LAE',
        name: 'Licenciatura en Administración de Empresas',
        subjects: [
          { code: 'LAE-101', name: 'Fundamentos de Administración', semester: 1 },
          { code: 'LAE-102', name: 'Contabilidad Básica', semester: 1 },
        ],
      },
      { code: 'LA', name: 'Licenciatura en Arquitectura', subjects: [] },
      { code: 'LCC', name: 'Licenciatura en Ciencias de la Comunicación', subjects: [] },
      { code: 'LCP', name: 'Licenciatura en Contaduría Pública', subjects: [] },
      { code: 'LD', name: 'Licenciatura en Derecho', subjects: [] },
      { code: 'LDG', name: 'Licenciatura en Diseño Gráfico', subjects: [] },
      { code: 'LG', name: 'Licenciatura en Gastronomía', subjects: [] },
      { code: 'LIA', name: 'Licenciatura en Informática Administrativa', subjects: [] },
      { code: 'MKT', name: 'Licenciatura en Mercadotecnia', subjects: [] },
      { code: 'LPRP', name: 'Licenciatura en Publicidad y Relaciones Públicas', subjects: [] },
      { code: 'LT', name: 'Licenciatura en Turismo', subjects: [] },
    ],
  },
  {
    code: 'ING',
    name: 'Ingenierías',
    scheme: 'CUATRIMESTRAL',
    careers: [
      { code: 'IC', name: 'Ingeniería Civil', subjects: [] },
      { code: 'IP', name: 'Ingeniería Petrolera', subjects: [] },
      {
        code: 'ISC',
        name: 'Ingeniería en Sistemas Computacionales',
        subjects: [
          { code: 'ISC-101', name: 'Fundamentos de Programación', semester: 1 },
          { code: 'ISC-102', name: 'Matemáticas Discretas', semester: 1 },
          { code: 'ISC-201', name: 'Estructuras de Datos', semester: 2 },
          { code: 'ISC-301', name: 'Bases de Datos', semester: 3 },
        ],
      },
      { code: 'ISPO', name: 'Ingeniería en Sistemas de Planeación y Organización', subjects: [] },
    ],
  },
  {
    // En el sitio aparecen como «BPProfesional …»; se dejan solo con el nombre del área.
    code: 'PREP',
    name: 'Preparatoria Rosario Castellanos',
    scheme: 'SEMESTRAL',
    careers: [
      { code: 'BEA', name: 'Bachillerato Económico-Administrativas', subjects: [] }, // propia
      { code: 'BFM', name: 'Bachillerato Físico-Matemáticas', subjects: [] }, // propia
      { code: 'BQB', name: 'Bachillerato Químico-Biológicas', subjects: [] }, // propia
      { code: 'BSH', name: 'Bachillerato Sociales-Humanidades', subjects: [] }, // propia
    ],
  },
];

/** Claves de carrera anteriores → clave vigente (se renombran conservando alumnos y materias). */
const LEGACY_CAREERS: Record<string, string> = { LARQ: 'LA', LGAS: 'LG', LTUR: 'LT' };

async function renameLegacyCareers() {
  for (const [oldCode, newCode] of Object.entries(LEGACY_CAREERS)) {
    const old = await prisma.career.findUnique({ where: { code: oldCode }, select: { id: true } });
    if (!old) continue;
    if (await prisma.career.findUnique({ where: { code: newCode }, select: { id: true } })) continue;
    await prisma.career.update({ where: { id: old.id }, data: { code: newCode } });
    console.log(`✔ Carrera ${oldCode} renombrada a ${newCode}`);
  }
}

/** Facultades del catálogo de ejemplo anterior → grupo que las sustituye. */
const LEGACY_FACULTIES: Record<string, string> = { FING: 'ING', FCA: 'LIC' };

/**
 * Pasa usuarios y carreras de las facultades de ejemplo a su grupo nuevo y borra las
 * que quedan vacías. Se ejecuta después de crear los grupos nuevos.
 */
async function migrateLegacyFaculties() {
  for (const [oldCode, newCode] of Object.entries(LEGACY_FACULTIES)) {
    const old = await prisma.faculty.findUnique({ where: { code: oldCode } });
    if (!old) continue;
    const target = await prisma.faculty.findUniqueOrThrow({ where: { code: newCode } });
    await prisma.$transaction([
      prisma.user.updateMany({ where: { facultyId: old.id }, data: { facultyId: target.id } }),
      prisma.career.updateMany({ where: { facultyId: old.id }, data: { facultyId: target.id } }),
      prisma.faculty.delete({ where: { id: old.id } }),
    ]);
    console.log(`✔ Facultad de ejemplo ${oldCode} integrada en ${newCode}`);
  }
}

async function seedCatalog() {
  await renameLegacyCareers();
  for (const faculty of CATALOG) {
    const savedFaculty = await prisma.faculty.upsert({
      where: { code: faculty.code },
      update: { name: faculty.name, scheme: faculty.scheme },
      create: { code: faculty.code, name: faculty.name, scheme: faculty.scheme },
    });

    for (const career of faculty.careers) {
      const savedCareer = await prisma.career.upsert({
        where: { code: career.code },
        update: { name: career.name, facultyId: savedFaculty.id },
        create: {
          code: career.code,
          name: career.name,
          facultyId: savedFaculty.id,
        },
      });

      for (const subject of career.subjects) {
        await prisma.subject.upsert({
          where: { code: subject.code },
          update: {
            name: subject.name,
            semester: subject.semester,
            careerId: savedCareer.id,
          },
          create: { ...subject, careerId: savedCareer.id },
        });
      }
    }
  }
  await migrateLegacyFaculties();
  const careers = CATALOG.reduce((n, f) => n + f.careers.length, 0);
  console.log(`✔ Catálogo académico: ${CATALOG.length} grupos, ${careers} carreras`);
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Periodo del tipo dado que contiene la fecha: meses inicial y final (1-12) y sufijo de la clave. */
function periodFor(scheme: TermScheme, date: Date) {
  const month = date.getMonth() + 1;
  if (scheme === 'CUATRIMESTRAL') {
    const index = Math.ceil(month / 4); // 1: ene–abr, 2: may–ago, 3: sep–dic
    return { code: `C${index}`, first: index * 4 - 3, last: index * 4 };
  }
  // Semestres: julio es vacaciones y cuenta como parte del segundo.
  return month <= 6 ? { code: 'S1', first: 1, last: 6 } : { code: 'S2', first: 8, last: 12 };
}

async function seedTerms() {
  const now = new Date();
  const year = now.getFullYear();
  for (const scheme of Object.values(TermScheme)) {
    if (await prisma.academicTerm.findFirst({ where: { scheme, isCurrent: true }, select: { id: true } })) {
      console.log(`✔ Periodo ${scheme.toLowerCase()} actual conservado`);
      continue;
    }
    const period = periodFor(scheme, now);
    const code = `${year}-${period.code}`;
    const lastDay = new Date(Date.UTC(year, period.last, 0)).getUTCDate();
    await prisma.academicTerm.upsert({
      where: { code },
      update: { isCurrent: true, closed: false },
      create: {
        code,
        name: `${MONTHS[period.first - 1]} – ${MONTHS[period.last - 1]} ${year}`,
        scheme,
        startsAt: new Date(`${year}-${pad(period.first)}-01T00:00:00Z`),
        endsAt: new Date(`${year}-${pad(period.last)}-${pad(lastDay)}T00:00:00Z`),
        isCurrent: true,
      },
    });
    console.log(`✔ Periodo ${scheme.toLowerCase()} actual: ${code}`);
  }
}

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim().toUpperCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn(
      '⚠ SEED_ADMIN_USERNAME o SEED_ADMIN_PASSWORD no definidos: se omite el administrador.',
    );
    return;
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  if (!/^[A-Z0-9-]{3,30}$/.test(username)) {
    throw new Error('SEED_ADMIN_USERNAME solo admite letras, números y guiones (3 a 30).');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { username }, data: { role: 'ADMIN' } });
    }
    console.log(`✔ Administrador existente conservado: ${username}`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      fullName: process.env.SEED_ADMIN_NAME?.trim() || 'Administrador UACH',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });
  console.log(`✔ Administrador creado: ${username}`);
}

async function main() {
  await seedCatalog();
  await seedTerms();
  await seedAdmin();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
