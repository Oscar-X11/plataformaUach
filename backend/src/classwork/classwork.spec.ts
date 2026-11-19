import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TokenPayload } from '../auth/token.service';
import { CourseAccessService } from '../courses/course-access.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { inspectUpload, MB, SUBMISSION_EXTENSIONS, safeDisplayName } from '../files/upload';
import { NotificationsService } from '../notifications/notifications.service';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { AssignmentsService } from './assignments.service';
import { GradesService } from './grades.service';
import { SubmissionsService } from './submissions.service';
import { average, submissionState } from './submission-state';

const as = (sub: string, role: TokenPayload['role']): TokenPayload => ({ sub, role, mustChangePassword: false });
const teacher = as('t1', 'TEACHER');
const student = as('s1', 'STUDENT');

const file = (name: string, content: Buffer | string) => {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { originalname: name, mimetype: 'application/octet-stream', size: buffer.length, buffer };
};
const PDF = Buffer.from('%PDF-1.7\n...');

describe('inspectUpload', () => {
  it('acepta un PDF real y calcula su sha256', () => {
    const info = inspectUpload(file('Tarea 1.pdf', PDF), SUBMISSION_EXTENSIONS, MB);
    expect(info).toMatchObject({ name: 'Tarea 1.pdf', ext: 'pdf', mime: 'application/pdf' });
    expect(info.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rechaza extensiones no permitidas, archivos disfrazados, vacíos y grandes', () => {
    expect(() => inspectUpload(file('virus.exe', 'MZ'), SUBMISSION_EXTENSIONS, MB)).toThrow(BadRequestException);
    expect(() => inspectUpload(file('falso.pdf', 'MZ\x90\x00'), SUBMISSION_EXTENSIONS, MB)).toThrow(/no parece/);
    expect(() => inspectUpload(file('vacio.pdf', ''), SUBMISSION_EXTENSIONS, MB)).toThrow(/vacío/);
    const big = file('grande.pdf', PDF);
    expect(() => inspectUpload({ ...big, size: 2 * MB }, SUBMISSION_EXTENSIONS, MB)).toThrow(/pesa más/);
    expect(() => inspectUpload(file('binario.txt', Buffer.from([0x41, 0x00, 0x42])), SUBMISSION_EXTENSIONS, MB)).toThrow(/no parece/);
  });

  it('limpia el nombre: sin rutas ni caracteres peligrosos, en UTF-8', () => {
    expect(safeDisplayName('../../etc/passwd')).toBe('passwd');
    expect(safeDisplayName('C:\\temp\\a<b>.pdf')).toBe('ab.pdf');
    const latin1 = Buffer.from('Práctica.pdf', 'utf8').toString('latin1');
    expect(safeDisplayName(latin1)).toBe('Práctica.pdf');
  });
});

describe('submissionState y promedio', () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it('distingue pendiente, sin entregar, a tiempo, tarde y devuelta', () => {
    expect(submissionState(future, null)).toBe('pending');
    expect(submissionState(null, null)).toBe('pending');
    expect(submissionState(past, null)).toBe('missing');
    expect(submissionState(future, { status: 'SUBMITTED', submittedAt: new Date() })).toBe('submitted');
    expect(submissionState(past, { status: 'SUBMITTED', submittedAt: new Date() })).toBe('late');
    expect(submissionState(past, { status: 'RETURNED', submittedAt: null })).toBe('returned');
  });

  it('promedia en escala 0–10 ponderando por puntos', () => {
    expect(average([])).toBeNull();
    expect(average([{ grade: null, points: 10 }])).toBeNull();
    expect(average([{ grade: 8, points: 10 }, { grade: 20, points: 20 }])).toBe(9.3);
  });
});

function classworkSetup() {
  const prisma = {
    assignment: { findUnique: jest.fn(), findMany: jest.fn() },
    course: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    enrollment: { findUnique: jest.fn(), findMany: jest.fn() },
    submission: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    submissionFile: { count: jest.fn(), create: jest.fn() },
  };
  const access = { roleIn: jest.fn(), assertCanManage: jest.fn() } as unknown as CourseAccessService;
  const notify = jest.fn();
  const save = jest.fn().mockResolvedValue('submissions/c/a/x.pdf');
  const notifications = { notify } as unknown as NotificationsService;
  const storage = { save, remove: jest.fn() } as unknown as StorageService;
  const db = prisma as unknown as PrismaService;
  const assignments = new AssignmentsService(db, access, notifications, storage);
  const submissions = new SubmissionsService(db, access, assignments, storage, notifications);
  const grades = new GradesService(db, access);
  prisma.assignment.findUnique.mockResolvedValue({
    id: 'a1',
    courseId: 'c1',
    title: 'Práctica',
    dueAt: null,
    points: 10,
  });
  return { prisma, access, notify, save, submissions, grades };
}

describe('SubmissionsService', () => {
  it('solo los alumnos inscritos entregan', async () => {
    const { access, submissions } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('teacher');
    await expect(submissions.turnIn('a1', teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no permite cambiar archivos de una entrega ya entregada', async () => {
    const { access, prisma, save, submissions } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('student');
    prisma.submission.upsert.mockResolvedValue({ id: 'sub', status: 'SUBMITTED' });
    await expect(submissions.uploadFiles('a1', [file('t.pdf', PDF)], student)).rejects.toThrow(/Anula/);
    expect(save).not.toHaveBeenCalled();
  });

  it('valida todos los archivos antes de guardar alguno', async () => {
    const { access, prisma, save, submissions } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('student');
    prisma.submission.upsert.mockResolvedValue({ id: 'sub', status: 'ASSIGNED' });
    await expect(
      submissions.uploadFiles('a1', [file('ok.pdf', PDF), file('mal.exe', 'MZ')], student),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('respeta el máximo de puntos y notifica al devolver', async () => {
    const { access, prisma, notify, submissions } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('teacher');
    prisma.enrollment.findUnique.mockResolvedValue({ id: 'e' });
    await expect(submissions.grade('a1', 's1', { grade: 11 }, teacher)).rejects.toThrow(/máxima es 10/);

    prisma.submission.upsert.mockResolvedValue({
      id: 'sub', status: 'RETURNED', grade: new Prisma.Decimal(9), feedback: 'Bien', submittedAt: null, returnedAt: new Date(), files: [],
    });
    prisma.course.findUnique.mockResolvedValue({ name: 'BD' });
    await expect(submissions.grade('a1', 's1', { grade: 9, return: true }, teacher)).resolves.toMatchObject({ grade: 9 });
    expect(notify).toHaveBeenCalledWith(['s1'], expect.objectContaining({ type: 'SUBMISSION_RETURNED' }));
  });

  it('no califica a quien no está inscrito', async () => {
    const { access, prisma, submissions } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('teacher');
    prisma.enrollment.findUnique.mockResolvedValue(null);
    await expect(submissions.grade('a1', 'x', { grade: 5 }, teacher)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('GradesService', () => {
  it('el alumno solo ve calificaciones devueltas', async () => {
    const { access, prisma, grades } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('student');
    prisma.assignment.findMany.mockResolvedValue([
      { id: 'a1', title: 'A', dueAt: null, points: 10 },
      { id: 'a2', title: 'B', dueAt: null, points: 10 },
    ]);
    prisma.submission.findMany.mockResolvedValue([
      { assignmentId: 'a1', status: 'RETURNED', submittedAt: null, grade: new Prisma.Decimal(8), feedback: 'ok' },
      { assignmentId: 'a2', status: 'SUBMITTED', submittedAt: new Date(), grade: new Prisma.Decimal(10), feedback: 'oculto' },
    ]);
    const result = await grades.forCourse('c1', student);
    expect(result.assignments.map((a) => 'grade' in a && a.grade)).toEqual([8, null]);
    expect('average' in result && result.average).toBe(8);
  });

  it('el CSV neutraliza fórmulas y usa ; con BOM', async () => {
    const { access, prisma, grades } = classworkSetup();
    (access.roleIn as jest.Mock).mockResolvedValue('teacher');
    prisma.assignment.findMany.mockResolvedValue([{ id: 'a1', title: '=HYPERLINK("x")', dueAt: null, points: 10 }]);
    prisma.enrollment.findMany.mockResolvedValue([{ student: { id: 's1', fullName: 'Ana; Ruiz', username: 'A1' } }]);
    prisma.submission.findMany.mockResolvedValue([
      { assignmentId: 'a1', studentId: 's1', status: 'RETURNED', submittedAt: null, grade: new Prisma.Decimal(9.5) },
    ]);
    prisma.course.findUniqueOrThrow.mockResolvedValue({ name: 'Bases de Datos', term: '2026-2' });
    const { filename, content } = await grades.exportCsv('c1', teacher);
    expect(filename).toBe('calificaciones-bases-de-datos-2026-2.csv');
    expect(content.startsWith('\uFEFFMatrícula;Nombre;')).toBe(true);
    expect(content).toContain(`"'=HYPERLINK(""x"") (/10)"`);
    expect(content).toContain('A1;"Ana; Ruiz";9.5;9.5');
  });
});

describe('StreamService', () => {
  it('los alumnos no publican avisos ni borran lo ajeno', async () => {
    const access = {
      roleIn: jest.fn().mockResolvedValue('student'),
      assertCanManage: jest.fn().mockRejectedValue(new ForbiddenException()),
    } as unknown as CourseAccessService;
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue({ courseId: 'c1', authorId: 't1' }), delete: jest.fn() },
    };
    const stream = new StreamService(prisma as unknown as PrismaService, access, { notify: jest.fn() } as unknown as NotificationsService);
    await expect(stream.create('c1', { content: 'Hola' }, student)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(stream.remove('p1', student)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.delete).not.toHaveBeenCalled();
  });
});

describe('UsersService', () => {
  it('un admin no puede desactivarse a sí mismo', async () => {
    const users = new UsersService({} as PrismaService);
    await expect(users.setStatus('a1', 'INACTIVE', 'a1')).rejects.toThrow(/propia cuenta/);
  });

  it('crea personal con contraseña temporal y cambio obligatorio', async () => {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u', ...data }));
    const users = new UsersService({ user: { create } } as unknown as PrismaService);
    const result = await users.createStaff({ username: 'D2002', fullName: 'Docente', role: 'TEACHER' });
    expect(result.temporaryPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(create.mock.calls[0][0].data).toMatchObject({ mustChangePassword: true, role: 'TEACHER' });
  });
});
