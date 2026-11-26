import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { PrismaService } from '../src/database/prisma.service';
import { ADMIN, createTestApp, resetDatabase, seedBasics } from './app-factory';

/**
 * Flujos principales de punta a punta, contra la base de pruebas real:
 * cuentas, clases, tareas, cuestionarios, avisos y cierre de sesiones.
 * Las pruebas comparten estado y se ejecutan en orden.
 */
describe('Flujos principales (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  let teacher: TestAgent;
  let student: TestAgent;
  let catalog: { careerId: string; term: string };
  let courseId = '';
  let quizId = '';
  let teacherId = '';
  let studentId = '';
  const TEACHER = { username: 'D-E2E', password: 'Docente-e2e-2026' };
  const STUDENT = { username: '999000001', password: 'Alumno-e2e-2026' };
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await resetDatabase(prisma);
    catalog = await seedBasics(prisma);
    admin = request.agent(app.getHttpServer());
    teacher = request.agent(app.getHttpServer());
    student = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde y el registro abierto no existe', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ status: 'ok', database: 'ok' });
    });
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'A1', password: 'x', fullName: 'x' })
      .expect(404);
  });

  it('el administrador crea un docente que debe cambiar su contraseña temporal', async () => {
    await admin.post('/auth/login').send(ADMIN).expect(200);
    const created = await admin
      .post('/users')
      .send({ username: TEACHER.username, fullName: 'Docente E2E', role: 'TEACHER' })
      .expect(201);
    teacherId = created.body.user.id;
    const temporary = created.body.temporaryPassword as string;

    await teacher.post('/auth/login').send({ username: TEACHER.username, password: temporary }).expect(200);
    await teacher.get('/courses').expect(403);
    await teacher
      .post('/auth/change-password')
      .send({ currentPassword: temporary, newPassword: TEACHER.password })
      .expect(200);
    await teacher.get('/courses').expect(200);
  });

  it('los alumnos solo existen si se importan; entran con su contraseña inicial', async () => {
    const imported = await admin
      .post('/users/import-students')
      .send({ rows: [{ line: 2, matricula: STUDENT.username, nombre: 'Ana', apPat: 'Prueba', apMat: 'E2E' }] })
      .expect(200);
    const initial = imported.body.rows.find((row: { initialPassword?: string }) => row.initialPassword).initialPassword;
    const login = await student.post('/auth/login').send({ username: STUDENT.username, password: initial }).expect(200);
    studentId = login.body.user.id;
    await student
      .post('/auth/change-password')
      .send({ currentPassword: initial, newPassword: STUDENT.password })
      .expect(200);
  });

  it('el docente crea una clase por carrera y cuatrimestre, y el alumno se une', async () => {
    const course = await teacher
      .post('/courses')
      .send({ name: 'Redes 2', description: 'Clase de prueba', careerId: catalog.careerId, grade: 4, term: catalog.term })
      .expect(201);
    courseId = course.body.id;
    expect(course.body).toMatchObject({ grade: 4, subject: null, career: { code: 'ISC' } });

    await teacher.post('/courses').send({ name: 'Mala', careerId: catalog.careerId, grade: 13, term: catalog.term }).expect(400);
    // Licenciaturas e ingenierías llegan hasta el 9.º cuatrimestre.
    await teacher.post('/courses').send({ name: 'Mala', careerId: catalog.careerId, grade: 10, term: catalog.term }).expect(400);
    await student.post('/courses/join').send({ code: course.body.invitation }).expect(200);

    await teacher.patch(`/courses/${courseId}/description`).send({ description: 'Nueva descripción' }).expect(200);
    await student.get(`/courses/${courseId}`).expect(200).expect(({ body }) => {
      expect(body.description).toBe('Nueva descripción');
    });
    await student.patch(`/courses/${courseId}/description`).send({ description: 'x' }).expect(403);
  });

  it('una tarea y un cuestionario con cierre aparecen en «Lo que sigue» con su enlace', async () => {
    await teacher
      .post(`/courses/${courseId}/assignments`)
      .send({ title: 'Tarea 1', instructions: 'Resolver', points: 10, dueAt: inDays(3) })
      .expect(201);
    const quiz = await teacher
      .post(`/courses/${courseId}/quizzes`)
      .send({
        kind: 'QUIZ',
        title: 'Examen 1',
        closesAt: inDays(5),
        questions: [
          { type: 'TRUE_FALSE', prompt: '¿2 + 2 = 4?', points: 2, answerKey: { option: 'true' } },
          { type: 'PARAGRAPH', prompt: 'Explica', points: 3, required: false },
        ],
      })
      .expect(201);
    quizId = quiz.body.id;
    await teacher.post(`/quizzes/${quizId}/publish`).send({ published: true }).expect(200);

    const dashboard = await student.get('/dashboard/student').expect(200);
    const pending = dashboard.body.pending as { kind: string; href: string }[];
    expect(pending.map((item) => item.kind).sort()).toEqual(['assignment', 'quiz']);
    expect(pending.find((item) => item.kind === 'quiz')?.href).toBe(`/cursos/${courseId}/cuestionarios/${quizId}`);
    expect(dashboard.body.notices.items[0]).toMatchObject({ type: 'QUIZ_PUBLISHED' });

    const calendar = await student
      .get('/calendar')
      .query({ from: new Date().toISOString(), to: inDays(30) })
      .expect(200);
    expect(calendar.body.map((item: { kind: string }) => item.kind).sort()).toEqual(['assignment', 'quiz']);
  });

  it('el alumno responde el cuestionario y el docente califica el párrafo', async () => {
    const started = await student.post(`/quizzes/${quizId}/start`).expect(200);
    const [tf, paragraph] = started.body.questions as { id: string }[];
    const sent = await student
      .post(`/quizzes/${quizId}/submit`)
      .send({
        answers: [
          { questionId: tf.id, value: { option: 'true' } },
          { questionId: paragraph.id, value: { text: 'Un protocolo de red' } },
        ],
      })
      .expect(200);
    expect(sent.body.attempt).toMatchObject({ status: 'submitted', score: 2, maxScore: 5, needsReview: true });

    const results = await teacher.get(`/quizzes/${quizId}/results`).expect(200);
    const attemptId = results.body.students[0].attemptId;
    const detail = await teacher.get(`/quizzes/${quizId}/attempts/${attemptId}`).expect(200);
    const answerId = detail.body.questions[1].answerId;
    const graded = await teacher.patch(`/quiz-answers/${answerId}`).send({ points: 3 }).expect(200);
    expect(graded.body).toMatchObject({ score: 5, needsReview: false });

    const after = await student.get('/dashboard/student').expect(200);
    expect(after.body.pending.map((item: { kind: string }) => item.kind)).toEqual(['assignment']);
  });

  it('marcar una notificación como leída baja el contador', async () => {
    const before = await student.get('/notifications').expect(200);
    const unread = before.body.unreadCount as number;
    expect(unread).toBeGreaterThan(0);
    const first = before.body.items.find((item: { readAt: string | null }) => !item.readAt);
    await student.post(`/notifications/${first.id}/read`).expect(204);
    const after = await student.get('/notifications').expect(200);
    expect(after.body.unreadCount).toBe(unread - 1);
  });

  it('el docente no puede dejar actividades imposibles de responder', async () => {
    const ago = new Date(Date.now() - 2 * 86_400_000).toISOString();
    // Tarea con entrega en el pasado, o que abre después de su entrega.
    await teacher.post(`/courses/${courseId}/assignments`).send({ title: 'Vencida', dueAt: ago }).expect(400);
    await teacher
      .post(`/courses/${courseId}/assignments`)
      .send({ title: 'Al revés', dueAt: inDays(2), availableFrom: inDays(3) })
      .expect(400);
    // Rúbrica con dos niveles que valen lo mismo.
    const task = await teacher.post(`/courses/${courseId}/assignments`).send({ title: 'Ensayo', dueAt: inDays(5) }).expect(201);
    await teacher
      .put(`/assignments/${task.body.id}/rubric`)
      .send({ criteria: [{ title: 'Contenido', levels: [{ label: 'Bien', points: 5 }, { label: 'Regular', points: 5 }] }] })
      .expect(400);
    // Cuestionario: cierre en el pasado o sin puntos.
    await teacher.post(`/courses/${courseId}/quizzes`).send({ title: 'Viejo', kind: 'QUIZ', closesAt: ago }).expect(400);
    const zero = await teacher
      .post(`/courses/${courseId}/quizzes`)
      .send({
        title: 'Sin puntos',
        kind: 'QUIZ',
        questions: [{ type: 'TRUE_FALSE', prompt: '¿Sí?', points: 0, answerKey: { option: 'true' } }],
      })
      .expect(201);
    await teacher.post(`/quizzes/${zero.body.id}/publish`).send({ published: true }).expect(400);
    // El repositorio ya no tiene «Examen resuelto».
    await teacher.post('/repository').field('title', 'Examen').field('type', 'EXAM').field('url', 'https://drive.google.com/x').expect(400);
    // Lo que sube un docente también espera revisión.
    const subject = await admin
      .post('/academic/subjects')
      .send({ code: 'ISC-E2E', name: 'Materia E2E', semester: 1, careerId: catalog.careerId })
      .expect(201);
    const shared = await teacher
      .post('/repository')
      .field('title', 'Guía del parcial')
      .field('type', 'STUDY_GUIDE')
      .field('subjectId', subject.body.id)
      .field('url', 'https://drive.google.com/guia')
      .expect(201);
    expect(shared.body.status).toBe('PENDING');
    const pending = await admin.get('/repository/pending').expect(200);
    expect(pending.body.map((item: { id: string }) => item.id)).toContain(shared.body.id);
    // Solo se publica cuando el administrador lo aprueba, y no se revisa dos veces.
    let explore = await teacher.get('/repository').expect(200);
    expect(explore.body.items.map((item: { id: string }) => item.id)).not.toContain(shared.body.id);
    await admin.patch(`/repository/${shared.body.id}/review`).send({ approve: true }).expect(200);
    explore = await teacher.get('/repository').expect(200);
    expect(explore.body.items.map((item: { id: string }) => item.id)).toContain(shared.body.id);
    await admin.patch(`/repository/${shared.body.id}/review`).send({ approve: false, note: 'Otra vez' }).expect(409);
  });

  it('el administrador consulta y modera las clases, pero no crea contenido ni participa', async () => {
    // Consulta: ve el tablón, el trabajo, el seguimiento y el libro.
    const stream = await admin.get(`/courses/${courseId}/posts`).expect(200);
    expect(stream.body).toMatchObject({ canPost: false, canComment: false, canModerate: true });
    await admin.get(`/courses/${courseId}/assignments`).expect(200);
    await admin.get(`/courses/${courseId}/tracking`).expect(200);
    await admin.get(`/courses/${courseId}/grades`).expect(200);
    await admin.get(`/quizzes/${quizId}/results`).expect(200);

    // No crea ni califica.
    await admin.post(`/courses/${courseId}/posts`).send({ content: 'Aviso' }).expect(403);
    await admin.post(`/courses/${courseId}/assignments`).send({ title: 'Tarea', points: 10 }).expect(403);
    await admin.post(`/courses/${courseId}/quizzes`).send({ title: 'Examen', kind: 'QUIZ' }).expect(403);
    await admin.post(`/quizzes/${quizId}/publish`).send({ published: false }).expect(403);
    await admin.post(`/courses/${courseId}/topics`).send({ title: 'Unidad 1' }).expect(403);
    await admin.patch(`/courses/${courseId}/weights`).send({ weightAssignments: 50, weightQuizzes: 50 }).expect(403);
    await admin.post('/courses/join').send({ code: 'ABC123' }).expect(403);
    await admin.post('/study-groups').send({ title: 'Grupo', capacity: 5 }).expect(403);
    await admin.post('/repository').send({ title: 'Apuntes' }).expect(403);

    // Modera: borra un aviso del docente.
    const post = await teacher.post(`/courses/${courseId}/posts`).send({ content: 'Aviso a moderar' }).expect(201);
    await admin.delete(`/posts/${post.body.id}`).expect(204);
  });

  it('restablecer la contraseña o desactivar la cuenta cierra las sesiones abiertas', async () => {
    await student.get('/auth/me').expect(200);
    await admin.post(`/users/${studentId}/reset-password`).expect(200);
    await student.get('/auth/me').expect(401);

    await teacher.get('/auth/me').expect(200);
    await admin.patch(`/users/${teacherId}/status`).send({ status: 'INACTIVE' }).expect(200);
    await teacher.get('/auth/me').expect(401);
    await teacher.post('/auth/login').send(TEACHER).expect(401);

    // El administrador no se ve afectado.
    await admin.get('/auth/me').expect(200);
  });
});
