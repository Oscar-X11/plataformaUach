import {
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
import { CreateCourseDto, UpdateMeetingInfoDto } from './dto/create-course.dto';
import { JoinCourseDto } from './dto/join-course.dto';

const as = (sub: string, role: TokenPayload['role']): TokenPayload => ({
  sub,
  role,
  mustChangePassword: false,
  sv: 0,
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
    description: null,
    meetingInfo: null,
    teacherId: 't1',
    createdAt: new Date('2026-08-01'),
    subject: { id: 'sub', name: 'Bases de Datos', code: 'ISC-301', semester: 3 },
    grade: 3,
    career: { id: 'isc', name: 'Ingeniería en Sistemas Computacionales', code: 'ISC', faculty: { name: 'Ingenierías', scheme: 'CUATRIMESTRAL' } },
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
    career: { findUnique: jest.fn() },
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

  const ISC = { id: 'isc', faculty: { scheme: 'CUATRIMESTRAL' } };
  const dto = { name: 'Redes 2 — 4.º ISC', term: '2026-2', careerId: 'isc', grade: 4 };

  it('crear exige una carrera existente y reintenta si el código choca', async () => {
    const { service, prisma } = setup();
    prisma.career.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(dto, teacher)).rejects.toThrow(/carrera no existe/);

    prisma.career.findUnique.mockResolvedValue(ISC);
    const duplicate = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.course.create.mockRejectedValueOnce(duplicate).mockResolvedValueOnce(courseRow());
    await expect(service.create(dto, teacher)).resolves.toMatchObject({ myRole: 'teacher' });
    expect(prisma.course.create).toHaveBeenCalledTimes(2);
    expect(prisma.course.create.mock.calls[1][0].data).toMatchObject({ careerId: 'isc', grade: 4, subjectId: null });
  });

  it('el cuatrimestre o semestre no pasa del máximo del nivel', async () => {
    const { service, prisma } = setup();
    prisma.career.findUnique.mockResolvedValue({ id: 'bfm', faculty: { scheme: 'SEMESTRAL' } });
    await expect(service.create({ ...dto, careerId: 'bfm', grade: 7 }, teacher)).rejects.toThrow(/semestre va de 1 a 6/);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('la materia opcional debe ser de la misma carrera', async () => {
    const { service, prisma } = setup();
    prisma.career.findUnique.mockResolvedValue(ISC);
    prisma.subject.findUnique.mockResolvedValue({ careerId: 'lae' });
    await expect(service.create({ ...dto, subjectId: 'sub' }, teacher)).rejects.toThrow(/no pertenece/);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('solo se crean cursos en periodos dados de alta y abiertos', async () => {
    const { service, prisma } = setup();
    prisma.career.findUnique.mockResolvedValue(ISC);
    prisma.academicTerm.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(dto, teacher)).rejects.toThrow(/periodo abierto/);
    prisma.academicTerm.findUnique.mockResolvedValueOnce({ code: '2026-2', closed: true });
    await expect(service.create(dto, teacher)).rejects.toThrow(/periodo abierto/);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('una carrera cuatrimestral no se abre en un periodo semestral', async () => {
    const { service, prisma } = setup();
    prisma.career.findUnique.mockResolvedValue(ISC);
    prisma.academicTerm.findUnique.mockResolvedValueOnce({ code: '2026-S2', closed: false, scheme: 'SEMESTRAL' });
    await expect(service.create({ ...dto, term: '2026-S2' }, teacher)).rejects.toThrow(/cuatrimestral/);
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
      careerId: '11111111-1111-4111-8111-111111111111',
      grade: '4',
    });
    expect(ok.grade).toBe(4);
    expect(ok.name).toBe('Bases de Datos');
    expect(validateSync(ok)).toHaveLength(0);

    const bad = plainToInstance(CreateCourseDto, { name: 'BD', term: '<x>', careerId: 'no', grade: 0, subjectId: 'no' });
    expect(validateSync(bad).map((error) => error.property).sort()).toEqual([
      'careerId',
      'grade',
      'name',
      'subjectId',
      'term',
    ]);
  });
});

describe('Lugar y horario del curso', () => {
  it('solo el docente del curso (o un admin) lo cambia', async () => {
    const { service, prisma, membership } = setup();
    membership(['s1']);
    prisma.course.update.mockResolvedValue(courseRow({ meetingInfo: 'Lunes 8:00, salón 12' }));
    await expect(service.updateMeetingInfo(COURSE_ID, { meetingInfo: 'x' }, student)).rejects.toThrow(/docente/);
    await expect(service.updateMeetingInfo(COURSE_ID, { meetingInfo: 'x' }, otherTeacher)).rejects.toThrow();
    await expect(
      service.updateMeetingInfo(COURSE_ID, { meetingInfo: 'Lunes 8:00, salón 12' }, teacher),
    ).resolves.toMatchObject({ meetingInfo: 'Lunes 8:00, salón 12' });
    expect(prisma.course.update).toHaveBeenCalledTimes(1);
  });

  it('el texto vacío lo borra y se limita a 200 caracteres', () => {
    const empty = plainToInstance(UpdateMeetingInfoDto, { meetingInfo: '   ' });
    expect(empty.meetingInfo).toBeNull();
    expect(validateSync(empty)).toHaveLength(0);
    const long = plainToInstance(UpdateMeetingInfoDto, { meetingInfo: 'a'.repeat(201) });
    expect(validateSync(long).map((error) => error.property)).toEqual(['meetingInfo']);
  });
});
