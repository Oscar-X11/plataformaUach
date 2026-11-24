import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { PrismaService } from '../src/database/prisma.service';
import { ADMIN, createTestApp, resetDatabase, seedBasics } from './app-factory';

/**
 * Rúbricas, libro de calificaciones con pesos y final, acceso condicional,
 * progreso y seguimiento, reutilizar clase, bitácora y búsqueda global.
 * Las pruebas comparten estado y se ejecutan en orden.
 */
describe('Rúbricas, progreso, condiciones y bitácora (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  let teacher: TestAgent;
  const students: TestAgent[] = [];
  const studentIds: string[] = [];
  let catalog: { careerId: string; term: string };
  let courseId = '';
  let rubricTask = '';
  let chained = '';
  let later = '';
  let quizId = '';
  const TEACHER = { username: 'D-E2E-3', password: 'Docente-e2e-2026' };
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    catalog = await seedBasics(prisma);
    admin = request.agent(app.getHttpServer());
    teacher = request.agent(app.getHttpServer());
    students.push(request.agent(app.getHttpServer()), request.agent(app.getHttpServer()));
  });

  afterAll(async () => {
    await app.close();
  });

  it('prepara docente, dos alumnos y una clase', async () => {
    await admin.post('/auth/login').send(ADMIN).expect(200);
    const created = await admin.post('/users').send({ username: TEACHER.username, fullName: 'Docente Tres', role: 'TEACHER' }).expect(201);
    const temporary = created.body.temporaryPassword as string;
    await teacher.post('/auth/login').send({ username: TEACHER.username, password: temporary }).expect(200);
    await teacher.post('/auth/change-password').send({ currentPassword: temporary, newPassword: TEACHER.password }).expect(200);

    const imported = await admin
      .post('/users/import-students')
      .send({
        careerId: catalog.careerId,
        rows: [
          { line: 2, matricula: '999000101', nombre: 'Ana', apPat: 'Uno', apMat: 'E2E' },
          { line: 3, matricula: '999000102', nombre: 'Beto', apPat: 'Dos', apMat: 'E2E' },
        ],
      })
      .expect(200);
    const rows = imported.body.rows as { username: string; initialPassword: string }[];

    const course = await teacher
      .post('/courses')
      .send({ name: 'Bases de datos', careerId: catalog.careerId, grade: 3, term: catalog.term })
      .expect(201);
    courseId = course.body.id;

    for (const [index, agent] of students.entries()) {
      const login = await agent.post('/auth/login').send({ username: rows[index].username, password: rows[index].initialPassword }).expect(200);
      studentIds.push(login.body.user.id);
      await agent
        .post('/auth/change-password')
        .send({ currentPassword: rows[index].initialPassword, newPassword: `Alumno-e2e-${index}-2026` })
        .expect(200);
      await agent.post('/courses/join').send({ code: course.body.invitation }).expect(200);
    }
  });

  it('rúbrica: los puntos de la tarea son la suma del mejor nivel de cada criterio', async () => {
    const task = await teacher.post(`/courses/${courseId}/assignments`).send({ title: 'Diseño ER', dueAt: inDays(5) }).expect(201);
    rubricTask = task.body.id;
    const rubric = await teacher
      .put(`/assignments/${rubricTask}/rubric`)
      .send({
        criteria: [
          { title: 'Entidades', levels: [{ id: 'a', label: 'Bien', points: 6 }, { id: 'b', label: 'Mal', points: 0 }] },
          { title: 'Relaciones', levels: [{ id: 'a', label: 'Bien', points: 4 }, { id: 'b', label: 'Regular', points: 2 }] },
        ],
      })
      .expect(200);
    expect(rubric.body.points).toBe(10);
    expect(rubric.body.rubric).toHaveLength(2);

    await teacher.put(`/assignments/${rubricTask}/rubric`).send({ criteria: [{ title: 'Solo uno', levels: [{ label: 'x', points: 1 }] }] }).expect(400);
    await teacher.patch(`/assignments/${rubricTask}`).send({ points: 8 }).expect(400);
  });

  it('acceso condicional: requisito, fecha futura y rechazo de ciclos', async () => {
    const second = await teacher
      .post(`/courses/${courseId}/assignments`)
      .send({ title: 'Normalización', dueAt: inDays(7), requiresKind: 'assignment', requiresId: rubricTask })
      .expect(201);
    chained = second.body.id;
    const third = await teacher
      .post(`/courses/${courseId}/assignments`)
      .send({ title: 'Proyecto final', availableFrom: inDays(10), dueAt: inDays(20) })
      .expect(201);
    later = third.body.id;

    // A pide B y B pide A: ciclo.
    await teacher.patch(`/assignments/${rubricTask}`).send({ requiresKind: 'assignment', requiresId: chained }).expect(400);
    await teacher.patch(`/assignments/${chained}`).send({ requiresKind: 'assignment', requiresId: chained }).expect(400);

    const quiz = await teacher
      .post(`/courses/${courseId}/quizzes`)
      .send({
        kind: 'QUIZ',
        title: 'Examen SQL',
        closesAt: inDays(6),
        requiresKind: 'assignment',
        requiresId: rubricTask,
        questions: [{ type: 'TRUE_FALSE', prompt: '¿SELECT lee datos?', points: 5, answerKey: { option: 'true' } }],
      })
      .expect(201);
    quizId = quiz.body.id;
    await teacher.post(`/quizzes/${quizId}/publish`).send({ published: true }).expect(200);

    // Vencidas sin entregar: cuentan para «en riesgo».
    for (const title of ['Práctica 1', 'Práctica 2']) {
      const past = await teacher.post(`/courses/${courseId}/assignments`).send({ title, dueAt: inDays(1) }).expect(201);
      await prisma.assignment.update({ where: { id: past.body.id }, data: { dueAt: new Date(Date.now() - 86_400_000) } });
    }
  });

  it('el alumno ve bloqueado lo que no cumple y no aparece en inicio, calendario ni búsqueda', async () => {
    const [ana] = students;
    const list = await ana.get(`/courses/${courseId}/assignments`).expect(200);
    const byId = new Map((list.body as { id: string; availability: { available: boolean; reason: string } }[]).map((row) => [row.id, row]));
    expect(byId.get(rubricTask)?.availability.available).toBe(true);
    expect(byId.get(chained)?.availability).toMatchObject({ available: false, reason: 'Entrega «Diseño ER» primero' });
    expect(byId.get(later)?.availability.available).toBe(false);

    await ana.post(`/assignments/${chained}/submission/turn-in`).expect(403);
    await ana.post(`/quizzes/${quizId}/start`).expect(403);

    const quizzes = await ana.get(`/courses/${courseId}/quizzes`).expect(200);
    expect(quizzes.body[0].lockedReason).toBe('Entrega «Diseño ER» primero');

    const dashboard = await ana.get('/dashboard/student').expect(200);
    const pendingIds = (dashboard.body.pending as { id: string }[]).map((item) => item.id);
    expect(pendingIds).toContain(rubricTask);
    expect(pendingIds).not.toContain(chained);
    expect(pendingIds).not.toContain(quizId);

    const calendar = await ana.get('/calendar').query({ from: new Date().toISOString(), to: inDays(30) }).expect(200);
    const calendarIds = (calendar.body as { id: string }[]).map((item) => item.id);
    expect(calendarIds).toEqual([rubricTask]);

    const search = await ana.get('/search').query({ q: 'Normaliz' }).expect(200);
    expect(search.body.results).toEqual([]);
    const found = await ana.get('/search').query({ q: 'diseño' }).expect(200);
    expect(found.body.results.map((hit: { id: string }) => hit.id)).toContain(rubricTask);
  });

  it('dos alumnos entregan el mismo archivo: se marca como duplicado', async () => {
    for (const agent of students) {
      await agent
        .post(`/assignments/${rubricTask}/submission/files`)
        .attach('files', Buffer.from('CREATE TABLE alumnos (id INT);\n'), 'modelo.txt')
        .expect(201);
      await agent.post(`/assignments/${rubricTask}/submission/turn-in`).expect(200);
    }
    const rows = await teacher.get(`/assignments/${rubricTask}/submissions`).expect(200);
    for (const row of rows.body as { duplicateWith: string[] }[]) expect(row.duplicateWith).toHaveLength(1);
  });

  it('entregar desbloquea la siguiente actividad', async () => {
    const list = await students[0].get(`/courses/${courseId}/assignments`).expect(200);
    const next = (list.body as { id: string; availability: { available: boolean } }[]).find((row) => row.id === chained);
    expect(next?.availability.available).toBe(true);
    const sent = await students[0].post(`/quizzes/${quizId}/start`).expect(200);
    await students[0]
      .post(`/quizzes/${quizId}/submit`)
      .send({ answers: [{ questionId: sent.body.questions[0].id, value: { option: 'true' } }] })
      .expect(200);
  });

  it('calificar con rúbrica calcula la nota; después la rúbrica ya no cambia', async () => {
    const graded = await teacher
      .patch(`/assignments/${rubricTask}/submissions/${studentIds[0]}`)
      .send({ rubric: Object.fromEntries((await rubricIds()).map((id, index) => [id, index === 0 ? 'a' : 'b'])), return: true })
      .expect(200);
    expect(graded.body.grade).toBe(8);
    await teacher
      .patch(`/assignments/${rubricTask}/submissions/${studentIds[1]}`)
      .send({ rubric: { nope: 'a' } })
      .expect(400);
    await teacher.put(`/assignments/${rubricTask}/rubric`).send({ criteria: [] }).expect(409);
  });

  async function rubricIds() {
    const task = await teacher.get(`/assignments/${rubricTask}`).expect(200);
    return (task.body.rubric as { id: string }[]).map((criterion) => criterion.id);
  }

  it('libro de calificaciones: pesos, cuestionarios, final y situación', async () => {
    await teacher.patch(`/courses/${courseId}/weights`).send({ weightAssignments: 50, weightQuizzes: 40 }).expect(400);
    await teacher.patch(`/courses/${courseId}/weights`).send({ weightAssignments: 50, weightQuizzes: 50 }).expect(200);
    await students[0].patch(`/courses/${courseId}/weights`).send({ weightAssignments: 50, weightQuizzes: 50 }).expect(403);

    const book = await teacher.get(`/courses/${courseId}/grades`).expect(200);
    expect(book.body).toMatchObject({ weights: { assignments: 50, quizzes: 50 }, passing: 7, locked: false });
    const ana = book.body.students.find((row: { id: string }) => row.id === studentIds[0]);
    // Tareas: 8/10 → 8. Cuestionario: 5/5 → 10. Final 50/50 → 9.
    expect(ana).toMatchObject({ assignmentsAverage: 8, quizzesAverage: 10, final: 9, passed: true });

    const mine = await students[0].get(`/courses/${courseId}/grades`).expect(200);
    expect(mine.body).toMatchObject({ final: 9, passed: true });

    const csv = await teacher.get(`/courses/${courseId}/grades/export`).expect(200);
    expect(csv.text).toContain('Final (0-10)');
    expect(csv.text).toContain('Aprobado');
  });

  it('progreso y seguimiento: completadas, vencidas y en riesgo', async () => {
    const material = await teacher.post(`/courses/${courseId}/materials`).field('title', 'Guía SQL').field('url', 'https://example.com/sql').expect(201);
    await students[0].post(`/materials/${material.body.id}/view`).expect(200);

    const progress = await students[0].get(`/courses/${courseId}/progress`).expect(200);
    // 5 tareas + 1 cuestionario + 1 material = 7; completó tarea, cuestionario y material.
    expect(progress.body).toMatchObject({ total: 7, completed: 3, overdue: 2, passingGrade: 7 });

    const tracking = await teacher.get(`/courses/${courseId}/tracking`).expect(200);
    expect(tracking.body.atRisk).toBe(2);
    await students[0].get(`/courses/${courseId}/tracking`).expect(403);
  });

  it('la calificación aprobatoria del nivel se edita en Carreras', async () => {
    const tree = await admin.get('/academic/catalog').expect(200);
    const level = tree.body[0];
    expect(Number(level.passingGrade)).toBe(7);
    await admin.put(`/academic/faculties/${level.id}`).send({ name: level.name, code: level.code, passingGrade: 11 }).expect(400);
    await admin.put(`/academic/faculties/${level.id}`).send({ name: level.name, code: level.code, passingGrade: 6 }).expect(200);
    const book = await teacher.get(`/courses/${courseId}/grades`).expect(200);
    expect(book.body.passing).toBe(6);
  });

  it('reutilizar la clase copia contenido sin alumnos, sin fechas y con borradores', async () => {
    const copy = await teacher.post(`/courses/${courseId}/copy`).send({ name: 'Bases de datos 2027', term: catalog.term }).expect(201);
    expect(copy.body).toMatchObject({ studentCount: 0, grade: 3 });
    const tasks = await teacher.get(`/courses/${copy.body.id}/assignments`).expect(200);
    expect(tasks.body).toHaveLength(5);
    expect((tasks.body as { dueAt: string | null }[]).every((task) => task.dueAt === null)).toBe(true);
    const copied = (tasks.body as { title: string; rubric: unknown[]; requiresId: string | null }[]);
    expect(copied.find((task) => task.title === 'Diseño ER')?.rubric).toHaveLength(2);
    // El requisito apunta a la copia, no a la tarea original.
    const copiedChained = copied.find((task) => task.title === 'Normalización');
    expect(copiedChained?.requiresId).toBeTruthy();
    expect(copiedChained?.requiresId).not.toBe(rubricTask);
    const quizzes = await teacher.get(`/courses/${copy.body.id}/quizzes`).expect(200);
    expect(quizzes.body).toMatchObject([{ title: 'Examen SQL', published: false }]);
    await students[0].post(`/courses/${copy.body.id}/copy`).send({ name: 'x x x', term: catalog.term }).expect(403);
  });

  it('con el periodo cerrado ya no se cambian calificaciones', async () => {
    const term = await prisma.academicTerm.findUniqueOrThrow({ where: { code: catalog.term } });
    await admin.patch(`/academic/terms/${term.id}`).send({ closed: true }).expect(200);
    await teacher.patch(`/assignments/${rubricTask}/submissions/${studentIds[1]}`).send({ grade: 5 }).expect(409);
    const book = await teacher.get(`/courses/${courseId}/grades`).expect(200);
    expect(book.body.locked).toBe(true);
    await admin.patch(`/academic/terms/${term.id}`).send({ closed: false }).expect(200);
  });

  it('bitácora: administración y por clase; los alumnos no tienen acceso', async () => {
    const all = await admin.get('/activity').expect(200);
    const actions = new Set((all.body.items as { action: string }[]).map((item) => item.action));
    for (const action of [
      'LOGIN',
      'PASSWORD_CHANGED',
      'USER_CREATED',
      'STUDENTS_IMPORTED',
      'COURSE_CREATED',
      'COURSE_JOINED',
      'ASSIGNMENT_CREATED',
      'SUBMISSION_TURNED_IN',
      'GRADE_CHANGED',
      'QUIZ_PUBLISHED',
      'QUIZ_SUBMITTED',
      'MATERIAL_ADDED',
      'WEIGHTS_CHANGED',
      'COURSE_COPIED',
      'TERM_CHANGED',
    ]) {
      expect(actions).toContain(action);
    }
    const filtered = await admin.get('/activity').query({ action: 'LOGIN' }).expect(200);
    expect((filtered.body.items as { action: string }[]).every((item) => item.action === 'LOGIN')).toBe(true);

    const course = await teacher.get(`/courses/${courseId}/activity`).expect(200);
    expect(course.body.total).toBeGreaterThan(0);
    expect((course.body.items as { courseId: string }[]).every((item) => item.courseId === courseId)).toBe(true);
    await students[0].get(`/courses/${courseId}/activity`).expect(403);
    await students[0].get('/activity').expect(403);
  });

  it('búsqueda global: la administración encuentra usuarios; consultas cortas no buscan', async () => {
    const hits = await admin.get('/search').query({ q: 'Docente Tres' }).expect(200);
    expect(hits.body.results).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'user' })]));
    const short = await teacher.get('/search').query({ q: 'a' }).expect(200);
    expect(short.body.results).toEqual([]);
    await teacher.get('/search').query({ q: 'x'.repeat(81) }).expect(400);
  });
});
