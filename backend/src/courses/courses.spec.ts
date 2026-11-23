import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TokenPayload } from '../auth/token.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CourseAccessService } from './course-access.service';
import { CoursesService, generateInvitationCode } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JoinCourseDto } from './dto/join-course.dto';

const as = (sub: string, role: TokenPayload['role']): TokenPayload => ({
  sub,
  role,
  mustChangePassword: false,
});
const admin = as('a1', 'ADMIN');
const teacher = as('t1', 'TEACHER');
const otherTeacher = as('t2', 'TEACHER');
const student = as('s1', 'STUDENT');
const stranger = as('s2', 'STUDENT');

const COURSE_ID = '11111111-1111-4111-8111-111111111111';

function courseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    name: 'Bases de Datos',
    term: '2026-2',
    invitation: 'ABC2345',
    teacherId: 't1',
    createdAt: new Date('2026-08-01'),
    subject: { id: 'sub', name: 'Bases de Datos', code: 'ISC-301', semester: 3 },
    teacher: { id: 't1', fullName: 'Laura Gómez' },
    _count: { enrollments: 2 },
    ...overrides,
  };
}

function setup() {
  const prisma = {
    course: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn().mockResolvedValue(courseRow()),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    subject: { findUnique: jest.fn() },
    academicTerm: { findUnique: jest.fn().mockResolvedValue({ code: '2026-2', closed: false, scheme: 'CUATRIMESTRAL' }) },
    user: { findUnique: jest.fn() },
    enrollment: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
  const access = new CourseAccessService(prisma as unknown as PrismaService);
  const notify = jest.fn();
  const service = new CoursesService(prisma as unknown as PrismaService, access, {
    notify,
  } as unknown as NotificationsService);
  /** Simula la consulta de pertenencia de CourseAccessService. */
  const membership = (enrolled: string[]) =>
    prisma.course.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(
        where.id === COURSE_ID
          ? { teacherId: 't1', enrollments: enrolled.map((id) => ({ id })) }
          : null,
      ),
    );
  return { prisma, access, service, membership, notify };
}

describe('CourseAccessService', () => {
  it('resuelve el rol de cada usuario en el curso', async () => {
    const { access, prisma } = setup();
    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1', enrollments: [] });
    await expect(access.roleIn(COURSE_ID, teacher)).resolves.toBe('teacher');
    await expect(access.roleIn(COURSE_ID, admin)).resolves.toBe('admin');

    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1', enrollments: [{ id: 'e' }] });
    await expect(access.roleIn(COURSE_ID, student)).resolves.toBe('student');
  });

  it('responde 404 a quien no pertenece, sin revelar que el curso existe', async () => {
    const { access, prisma } = setup();
    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1', enrollments: [] });
    await expect(access.roleIn(COURSE_ID, stranger)).rejects.toBeInstanceOf(NotFoundException);
    await expect(access.roleIn(COURSE_ID, otherTeacher)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.course.findUnique.mockResolvedValue(null);
    await expect(access.roleIn(COURSE_ID, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('solo el docente del curso o un admin pueden gestionarlo', async () => {
    const { access, prisma } = setup();
    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1', enrollments: [{ id: 'e' }] });
    await expect(access.assertCanManage(COURSE_ID, teacher)).resolves.toBe('teacher');
    await expect(access.assertCanManage(COURSE_ID, student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('CoursesService', () => {
  it('los alumnos no ven el código de invitación', async () => {
    const { service, membership } = setup();
    membership(['s1']);
    await expect(service.get(COURSE_ID, student)).resolves.toMatchObject({
      myRole: 'student',
      invitation: null,
      studentCount: 2,
    });
    await expect(service.get(COURSE_ID, teacher)).resolves.toMatchObject({
      myRole: 'teacher',
      invitation: 'ABC2345',
    });
  });

  it('lista solo los cursos propios según el rol', async () => {
    const { service, prisma } = setup();
    prisma.course.findMany.mockResolvedValue([]);
    await service.list(teacher);
    await service.list(student);
    await service.list(admin);
    const wheres = prisma.course.findMany.mock.calls.map(([args]) => args.where);
    expect(wheres).toEqual([
      { teacherId: 't1' },
      { enrollments: { some: { studentId: 's1' } } },
      {},
    ]);
  });

  it('unirse con un código válido inscribe al alumno (idempotente)', async () => {
    const { service, prisma, membership } = setup();
    membership(['s1']);
    prisma.course.findUnique.mockImplementationOnce(() => Promise.resolve({ id: COURSE_ID }));
    await expect(service.join('ABC2345', student)).resolves.toMatchObject({ id: COURSE_ID });
    expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {}, create: { courseId: COURSE_ID, studentId: 's1' } }),
    );
  });

  it('rechaza códigos inexistentes y a quien no es alumno', async () => {
    const { service, prisma } = setup();
    prisma.course.findUnique.mockResolvedValue(null);
    await expect(service.join('ZZZ9999', student)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.join('ABC2345', teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
  });

  it('crear exige una materia existente y reintenta si el código choca', async () => {
    const { service, prisma } = setup();
    prisma.subject.findUnique.mockResolvedValueOnce(null);
    const dto = { name: 'Bases de Datos', term: '2026-2', subjectId: 'sub' };
    await expect(service.create(dto, teacher)).rejects.toBeInstanceOf(BadRequestException);

    prisma.subject.findUnique.mockResolvedValue({ id: 'sub', career: { faculty: { scheme: 'CUATRIMESTRAL' } } });
    const duplicate = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.course.create.mockRejectedValueOnce(duplicate).mockResolvedValueOnce(courseRow());
    await expect(service.create(dto, teacher)).resolves.toMatchObject({ myRole: 'teacher' });
    expect(prisma.course.create).toHaveBeenCalledTimes(2);
  });

  it('solo se crean cursos en periodos dados de alta y abiertos', async () => {
    const { service, prisma } = setup();
    const dto = { name: 'Bases de Datos', term: '2026-2', subjectId: 'sub' };
    prisma.subject.findUnique.mockResolvedValue({ id: 'sub', career: { faculty: { scheme: 'CUATRIMESTRAL' } } });
    prisma.academicTerm.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(dto, teacher)).rejects.toThrow(/periodo abierto/);
    prisma.academicTerm.findUnique.mockResolvedValueOnce({ code: '2026-2', closed: true });
    await expect(service.create(dto, teacher)).rejects.toThrow(/periodo abierto/);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('una materia de licenciatura no se abre en un periodo semestral', async () => {
    const { service, prisma } = setup();
    const dto = { name: 'Bases de Datos', term: '2026-S2', subjectId: 'sub' };
    prisma.subject.findUnique.mockResolvedValue({ id: 'sub', career: { faculty: { scheme: 'CUATRIMESTRAL' } } });
    prisma.academicTerm.findUnique.mockResolvedValueOnce({ code: '2026-S2', closed: false, scheme: 'SEMESTRAL' });
    await expect(service.create(dto, teacher)).rejects.toThrow(/cuatrimestral/);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('el admin reasigna el curso a otro docente activo y se le avisa', async () => {
    const { service, prisma, notify } = setup();
    prisma.course.findUnique.mockResolvedValue({ teacherId: 't1', name: 'BD' });
    prisma.user.findUnique.mockResolvedValueOnce({ role: 'STUDENT', status: 'ACTIVE' });
    await expect(service.reassignTeacher(COURSE_ID, 's1')).rejects.toThrow(/docente/);
    prisma.user.findUnique.mockResolvedValueOnce({ role: 'TEACHER', status: 'INACTIVE' });
    await expect(service.reassignTeacher(COURSE_ID, 't9')).rejects.toThrow(/no está activa/);

    prisma.user.findUnique.mockResolvedValueOnce({ role: 'TEACHER', status: 'ACTIVE' });
    prisma.course.update.mockResolvedValue(courseRow({ teacherId: 't2' }));
    await expect(service.reassignTeacher(COURSE_ID, 't2')).resolves.toMatchObject({ myRole: 'admin' });
    expect(prisma.course.update).toHaveBeenCalledWith(expect.objectContaining({ data: { teacherId: 't2' } }));
    expect(notify).toHaveBeenCalledWith(['t2'], expect.objectContaining({ type: 'COURSE_ASSIGNED' }));
  });

  it('los alumnos no ven las matrículas de sus compañeros', async () => {
    const { service, prisma, membership } = setup();
    membership(['s1']);
    prisma.course.findUniqueOrThrow.mockResolvedValue({
      teacher: { id: 't1', fullName: 'Laura Gómez' },
      enrollments: [
        { joinedAt: new Date(), student: { id: 's1', fullName: 'Ana', username: 'A2023-0148' } },
      ],
    });
    const asStudent = await service.people(COURSE_ID, student);
    const asTeacher = await service.people(COURSE_ID, teacher);
    expect(asStudent.students[0].username).toBeNull();
    expect(asTeacher.students[0].username).toBe('A2023-0148');
  });

  it('quitar a un alumno que no está inscrito responde 404', async () => {
    const { service, prisma, membership } = setup();
    membership([]);
    prisma.enrollment.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeStudent(COURSE_ID, 's9', teacher)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('DTOs y códigos', () => {
  it('genera códigos de 7 caracteres sin ambigüedades', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInvitationCode()).toMatch(/^[A-HJKMNP-Z2-9]{7}$/);
    }
  });

  it('normaliza el código al unirse', () => {
    const dto = plainToInstance(JoinCourseDto, { code: ' abc 2345 ' });
    expect(dto.code).toBe('ABC2345');
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('valida los datos al crear un curso', () => {
    const ok = plainToInstance(CreateCourseDto, {
      name: '  Bases   de Datos ',
      term: '2026-2',
      subjectId: '11111111-1111-4111-8111-111111111111',
    });
    expect(ok.name).toBe('Bases de Datos');
    expect(validateSync(ok)).toHaveLength(0);

    const bad = plainToInstance(CreateCourseDto, { name: 'BD', term: '<x>', subjectId: 'no' });
    expect(validateSync(bad).map((error) => error.property).sort()).toEqual([
      'name',
      'subjectId',
      'term',
    ]);
  });
});
