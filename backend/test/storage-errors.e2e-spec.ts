import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { PrismaService } from '../src/database/prisma.service';
import { ADMIN, createTestApp, resetDatabase, seedBasics } from './app-factory';

/**
 * Descargas con el nombre original, liberar el espacio de un periodo cerrado y
 * reportes de errores para el administrador. Las pruebas comparten estado y van en orden.
 */
describe('Archivos de periodos y reportes de errores (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAgent;
  let teacher: TestAgent;
  let student: TestAgent;
  let catalog: { careerId: string; term: string };
  let courseId = '';
  let materialUrl = '';
  let submissionUrl = '';
  let reportId = '';
  const TEACHER = { username: 'D-ARCH', password: 'Docente-arch-2026' };
  const PDF = Buffer.from('%PDF-1.4\n% prueba\n');
  const NOTES = Buffer.from('notas de la práctica\n');

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

  it('prepara docente, alumno y una clase con material y una entrega', async () => {
    await admin.post('/auth/login').send(ADMIN).expect(200);
    const created = await admin.post('/users').send({ username: TEACHER.username, fullName: 'Docente Archivos', role: 'TEACHER' }).expect(201);
    const temporary = created.body.temporaryPassword as string;
    await teacher.post('/auth/login').send({ username: TEACHER.username, password: temporary }).expect(200);
    await teacher.post('/auth/change-password').send({ currentPassword: temporary, newPassword: TEACHER.password }).expect(200);

    const imported = await admin
      .post('/users/import-students')
      .send({ careerId: catalog.careerId, rows: [{ line: 2, matricula: '999000201', nombre: 'Eva', apPat: 'Archivo', apMat: 'E2E' }] })
      .expect(200);
    const row = (imported.body.rows as { username: string; initialPassword: string }[])[0];
    await student.post('/auth/login').send({ username: row.username, password: row.initialPassword }).expect(200);
    await student.post('/auth/change-password').send({ currentPassword: row.initialPassword, newPassword: 'Alumno-arch-2026' }).expect(200);

    const course = await teacher
      .post('/courses')
      .send({ name: 'Redes', careerId: catalog.careerId, grade: 2, term: catalog.term })
      .expect(201);
    courseId = course.body.id;
    await student.post('/courses/join').send({ code: course.body.invitation }).expect(200);

    const material = await teacher
      .post(`/courses/${courseId}/materials`)
      .field('title', 'Guía del parcial')
      .attach('file', PDF, 'Guía práctica "final".pdf')
      .expect(201);
    materialUrl = material.body.fileUrl;

    const task = await teacher.post(`/courses/${courseId}/assignments`).send({ title: 'Práctica 1' }).expect(201);
    const submission = await student
      .post(`/assignments/${task.body.id}/submission/files`)
      .attach('files', NOTES, 'Reporte de Eva.txt')
      .expect(201);
    submissionUrl = submission.body.files[0].fileUrl;
  });

  it('las descargas llevan el nombre original; PDF se abre en el navegador y el resto se descarga', async () => {
    const pdf = await student.get(`/files/${materialUrl}`).expect(200);
    expect(pdf.headers['content-disposition']).toBe(
      // Las comillas ya se quitaron al subirlo; los acentos van en filename* y sin ellos en filename.
      `inline; filename="Guia practica final.pdf"; filename*=UTF-8''Gu%C3%ADa%20pr%C3%A1ctica%20final.pdf`,
    );
    const txt = await teacher.get(`/files/${submissionUrl}`).expect(200);
    expect(txt.headers['content-disposition']).toBe(
      `attachment; filename="Reporte de Eva.txt"; filename*=UTF-8''Reporte%20de%20Eva.txt`,
    );
  });

  it('un periodo abierto no se puede vaciar; cerrado, se confirma con su clave', async () => {
    const term = await prisma.academicTerm.findUniqueOrThrow({ where: { code: catalog.term } });
    await teacher.get(`/academic/terms/${term.id}/files`).expect(403);

    const summary = await admin.get(`/academic/terms/${term.id}/files`).expect(200);
    expect(summary.body).toMatchObject({
      code: catalog.term,
      courses: 1,
      submissions: { count: 1, bytes: NOTES.length },
      materials: { count: 1, bytes: PDF.length },
    });

    await admin.post(`/academic/terms/${term.id}/files/purge`).send({ confirm: catalog.term }).expect(400);
    await admin.patch(`/academic/terms/${term.id}`).send({ closed: true }).expect(200);
    await admin.post(`/academic/terms/${term.id}/files/purge`).send({ confirm: 'otra' }).expect(400);

    const purged = await admin.post(`/academic/terms/${term.id}/files/purge`).send({ confirm: catalog.term }).expect(200);
    expect(purged.body).toEqual({ code: catalog.term, files: 2, bytes: NOTES.length + PDF.length });

    // El archivo ya no está; la entrega, el material y sus nombres se conservan.
    const gone = await student.get(`/files/${materialUrl}`).expect(410);
    expect(gone.body.message).toMatch(/liberar espacio/);
    await teacher.get(`/files/${submissionUrl}`).expect(410);
    const materials = await student.get(`/courses/${courseId}/materials`).expect(200);
    const listed = JSON.stringify(materials.body);
    expect(listed).toContain('"fileDeletedAt":"');
    expect(listed).toContain('Guía práctica');

    const again = await admin.get(`/academic/terms/${term.id}/files`).expect(200);
    expect(again.body).toMatchObject({ submissions: { count: 0 }, materials: { count: 0 } });
    const log = await admin.get('/activity').query({ action: 'TERM_CHANGED' }).expect(200);
    expect(log.body.items[0].summary).toMatch(/Borró los archivos del periodo E2E-C1: 2 archivos/);
  });

  it('un alumno reporta un problema: el administrador lo ve, lo atiende y al alumno le llega la nota', async () => {
    await student.post('/errors/report').send({ message: 'corto' }).expect(400);
    const sent = await student
      .post('/errors/report')
      .send({ message: 'Al subir mi tarea aparece un error\ny no se guarda el archivo.', path: '/cursos/x/tareas/y' })
      .expect(201);
    reportId = sent.body.id;

    await student.get('/errors').expect(403);
    const list = await admin.get('/errors').expect(200);
    expect(list.body.open).toBe(1);
    expect(list.body.items[0]).toMatchObject({
      id: reportId,
      source: 'USER',
      message: 'Al subir mi tarea aparece un error',
      path: '/cursos/x/tareas/y',
      user: { fullName: expect.stringContaining('Eva') },
    });
    const adminNotices = await admin.get('/notifications').expect(200);
    expect(adminNotices.body.items[0]).toMatchObject({ type: 'ERROR_REPORTED', link: '/administracion/errores' });

    await admin.patch(`/errors/${reportId}/resolve`).send({ note: 'Ya quedó; vuelve a intentarlo.' }).expect(200);
    const notices = await student.get('/notifications').expect(200);
    expect(notices.body.items[0]).toMatchObject({
      type: 'REPORT_RESOLVED',
      title: 'Atendimos tu reporte: Ya quedó; vuelve a intentarlo.',
    });
    const resolved = await admin.get('/errors').query({ status: 'resolved' }).expect(200);
    expect(resolved.body.items.map((item: { id: string }) => item.id)).toContain(reportId);
    expect((await admin.get('/errors').expect(200)).body.open).toBe(0);
  });

  it('los errores de pantalla iguales se agrupan y se cuentan', async () => {
    const error = { message: 'TypeError: x is undefined', path: `/cursos/${courseId}`, digest: '123' };
    await student.post('/errors/client').send(error).expect(201);
    await teacher.post('/errors/client').send(error).expect(201);
    // Se guarda sin hacer esperar al navegador: dar tiempo a que termine.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const list = await admin.get('/errors').query({ source: 'CLIENT' }).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ count: 2, path: '/cursos/:id', message: 'TypeError: x is undefined' });
    expect(list.body.items[0].detail).toContain('Ref: 123');
  });
});
