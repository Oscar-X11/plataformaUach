/**
 * Seed inicial de la Plataforma UACH.
 *
 * Ejecutar:  npm run prisma:seed   (desde la raíz)
 *
 * - Crea/actualiza el catálogo académico (facultades, carreras y materias).
 *   ⚠️ Los datos de CATALOG son de EJEMPLO: reemplázalos por el catálogo oficial.
 * - Crea el usuario administrador inicial con SEED_ADMIN_USERNAME (número de empleado) /
 *   SEED_ADMIN_PASSWORD.
 *   Si el administrador ya existe, NO se modifica su contraseña.
 *
 * Es idempotente: puede ejecutarse varias veces.
 */
import { PrismaClient } from '@prisma/client';
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
  careers: CareerSeed[];
}

// ⚠️ CATÁLOGO DE EJEMPLO — sustituir por facultades, carreras y materias reales.
const CATALOG: FacultySeed[] = [
  {
    code: 'FING',
    name: 'Facultad de Ingeniería',
    careers: [
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
    ],
  },
  {
    code: 'FCA',
    name: 'Facultad de Ciencias Administrativas',
    careers: [
      {
        code: 'LAE',
        name: 'Licenciatura en Administración de Empresas',
        subjects: [
          { code: 'LAE-101', name: 'Fundamentos de Administración', semester: 1 },
          { code: 'LAE-102', name: 'Contabilidad Básica', semester: 1 },
        ],
      },
    ],
  },
];

async function seedCatalog() {
  for (const faculty of CATALOG) {
    const savedFaculty = await prisma.faculty.upsert({
      where: { code: faculty.code },
      update: { name: faculty.name },
      create: { code: faculty.code, name: faculty.name },
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
  console.log(`✔ Catálogo académico: ${CATALOG.length} facultades`);
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
  await seedAdmin();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
