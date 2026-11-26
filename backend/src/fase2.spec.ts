import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TokenPayload } from './auth/token.service';
import { CourseAccessService } from './courses/course-access.service';
import { ProgressService } from './classwork/progress.service';
import { PrismaService } from './database/prisma.service';
import { StorageService } from './files/storage.service';
import { GroupsService } from './groups/groups.service';
import { MaterialsService, safeUrl } from './materials/materials.service';
import { NotificationsService } from './notifications/notifications.service';
import { ReportsService } from './reports/reports.service';
import { RepositoryService } from './repository/repository.service';

const as = (sub: string, role: TokenPayload['role']): TokenPayload => ({ sub, role, mustChangePassword: false, sv: 0 });
const student = as('s1', 'STUDENT');
const teacher = as('t1', 'TEACHER');
const admin = as('a1', 'ADMIN');
const PDF = Buffer.from('%PDF-1.7 demo');
const pdf = { originalname: 'guia.pdf', mimetype: 'application/pdf', size: PDF.length, buffer: PDF };

const storageMock = () => {
  const save = jest.fn().mockResolvedValue('x/y.pdf');
  return { save, storage: { save, remove: jest.fn() } as unknown as StorageService };
};

describe('safeUrl', () => {
  it('acepta http(s) y rechaza esquemas peligrosos', () => {
    expect(safeUrl('https://uach.mx/guia')).toBe('https://uach.mx/guia');
    expect(() => safeUrl('javascript:alert(1)')).toThrow(BadRequestException);
    expect(() => safeUrl('data:text/html,hola')).toThrow(BadRequestException);
    expect(() => safeUrl('no es url')).toThrow(BadRequestException);
  });
});

describe('MaterialsService', () => {
  function setup(role: 'teacher' | 'student') {
    const access = {
      roleIn: jest.fn().mockResolvedValue(role),
      assertCanManage: jest.fn().mockImplementation(() =>
        role === 'student' ? Promise.reject(new ForbiddenException()) : Promise.resolve(role),
      ),
    } as unknown as CourseAccessService;
    const create = jest.fn().mockResolvedValue({ id: 'm1', title: 'Guía' });
    const prisma = {
      courseMaterial: { create },
      courseTopic: { findFirst: jest.fn() },
      course: { findUniqueOrThrow: jest.fn().mockResolvedValue({ name: 'BD', enrollments: [{ studentId: 's1' }] }) },
    };
    const notify = jest.fn();
    const { save, storage } = storageMock();
    const service = new MaterialsService(prisma as unknown as PrismaService, access, storage, { notify } as unknown as NotificationsService);
    return { service, create, save, notify };
  }

  it('los alumnos no publican material', async () => {
    const { service } = setup('student');
    await expect(service.create('c1', { title: 'Guía', url: 'https://x.mx' }, undefined, student)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige archivo o enlace, no ambos ni ninguno', async () => {
    const { service } = setup('teacher');
    await expect(service.create('c1', { title: 'Guía' }, undefined, teacher)).rejects.toThrow(/archivo o escribe/);
    await expect(service.create('c1', { title: 'Guía', url: 'https://x.mx' }, pdf, teacher)).rejects.toThrow(/no ambos/);
  });

  it('guarda el archivo en classroom-drive y avisa a los alumnos', async () => {
    const { service, save, create, notify } = setup('teacher');
    await service.create('c1', { title: 'Guía' }, pdf, teacher);
    expect(save).toHaveBeenCalledWith('classroom-drive/c1', 'pdf', pdf);
    expect(create.mock.calls[0][0].data).toMatchObject({ kind: 'FILE', originalName: 'guia.pdf' });
    expect(notify).toHaveBeenCalledWith(['s1'], expect.objectContaining({ type: 'MATERIAL_CREATED' }));
  });
});

describe('RepositoryService', () => {
  function setup() {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = {
      subject: { findUnique: jest.fn().mockResolvedValue({ id: 'sub' }) },
      resource: { create, findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), delete: jest.fn() },
    };
    const notify = jest.fn();
    const { storage } = storageMock();
    const service = new RepositoryService(prisma as unknown as PrismaService, storage, { notify } as unknown as NotificationsService);
    return { service, prisma, notify };
  }
  const dto = { title: 'Guía de SQL', type: 'STUDY_GUIDE' as const, subjectId: 'sub' };

  it('lo de alumnos queda pendiente; lo de docentes se publica', async () => {
    const { service } = setup();
    await expect(service.upload(dto, pdf, student)).resolves.toMatchObject({ status: 'PENDING' });
    await expect(service.upload(dto, pdf, teacher)).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('acepta un enlace en lugar del archivo, pero no ambos ni ninguno', async () => {
    const { service } = setup();
    const drive = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing';
    await expect(service.upload({ ...dto, url: drive }, undefined, student)).resolves.toMatchObject({ url: drive, status: 'PENDING' });
    await expect(service.upload({ ...dto, url: drive }, pdf, student)).rejects.toThrow(/no ambos/);
    await expect(service.upload(dto, undefined, student)).rejects.toThrow(/archivo o escribe un enlace/);
    await expect(service.upload({ ...dto, url: 'javascript:alert(1)' }, undefined, student)).rejects.toThrow(/http/);
  });

  it('rechazar exige motivo y avisa al autor', async () => {
    const { service, prisma, notify } = setup();
    prisma.resource.findUnique.mockResolvedValue({ authorId: 's1', title: 'Guía' });
    await expect(service.review('r1', { approve: false }, admin)).rejects.toThrow(/por qué/);
    await service.review('r1', { approve: false, note: 'Archivo ilegible' }, admin);
    expect(notify).toHaveBeenCalledWith(['s1'], expect.objectContaining({ type: 'RESOURCE_REVIEWED' }));
  });

  it('solo el autor o un admin borran', async () => {
    const { service, prisma } = setup();
    prisma.resource.findUnique.mockResolvedValue({ authorId: 'otro', fileUrl: 'repository/x.pdf' });
    await expect(service.remove('r1', student)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('r1', admin)).resolves.toBeUndefined();
  });
});

describe('GroupsService', () => {
  function setup(group: { capacity: number; members: number }, already = false) {
    const tx = {
      studyGroup: { findUnique: jest.fn().mockResolvedValue({ capacity: group.capacity, _count: { members: group.members } }) },
      studyGroupMember: { findUnique: jest.fn().mockResolvedValue(already ? { userId: 's1' } : null), create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      studyGroup: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'g1', title: 'SQL', description: 'Repaso', capacity: group.capacity, meetingInfo: null, createdAt: new Date(),
          creatorId: 'c1', subject: null, creator: { id: 'c1', fullName: 'Ana' }, _count: { members: group.members },
        }),
      },
      studyGroupMember: {
        findMany: jest.fn().mockResolvedValue([{ joinedAt: new Date(), user: { id: 'c1', fullName: 'Ana', role: 'STUDENT' } }]),
        deleteMany: jest.fn(),
      },
    };
    return { service: new GroupsService(prisma as unknown as PrismaService), tx, prisma };
  }

  it('no deja unirse a un grupo lleno', async () => {
    const { service, tx } = setup({ capacity: 2, members: 2 });
    await expect(service.join('g1', student)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.studyGroupMember.create).not.toHaveBeenCalled();
  });

  it('unirse dos veces no falla ni duplica', async () => {
    const { service, tx } = setup({ capacity: 2, members: 2 }, true);
    await expect(service.join('g1', student)).resolves.toBeDefined();
    expect(tx.studyGroupMember.create).not.toHaveBeenCalled();
  });

  it('quien no es integrante no ve la lista de miembros', async () => {
    const { service } = setup({ capacity: 5, members: 1 });
    await expect(service.get('g1', student)).resolves.toMatchObject({ isMember: false, members: [] });
  });

  it('quien creó el grupo no puede salirse (debe borrarlo)', async () => {
    const { service } = setup({ capacity: 5, members: 1 });
    await expect(service.leave('g1', as('c1', 'STUDENT'))).rejects.toThrow(/bórralo/);
  });
});

describe('ReportsService', () => {
  it('calcula % de entrega sobre tareas vencidas, entregas sin calificar y alumnos en riesgo', async () => {
    const past = new Date(Date.now() - 86_400_000);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'c1', name: 'BD', term: '2026-2', grade: 3, career: { code: 'ISC', name: 'Ingeniería en Sistemas Computacionales', faculty: { scheme: 'CUATRIMESTRAL' } },
          teacher: { fullName: 'Laura' }, _count: { enrollments: 3 },
          assignments: [
            {
              dueAt: past,
              submissions: [
                { status: 'RETURNED', submittedAt: new Date(past.getTime() - 1000) },
                { status: 'SUBMITTED', submittedAt: new Date(past.getTime() + 1000) },
              ],
            },
          ],
        },
      ])
      .mockResolvedValueOnce([{ term: '2026-2' }]);
    const careers = jest.fn().mockResolvedValue([{ id: 'k1', code: 'ISC', name: 'ISC' }]);
    const studentRows = jest.fn().mockResolvedValue([{ risk: ['2 actividades vencidas sin entregar'] }, { risk: [] }, { risk: [] }]);
    const reports = new ReportsService(
      { course: { findMany }, career: { findMany: careers } } as unknown as PrismaService,
      { studentRows } as unknown as ProgressService,
    );
    const { rows, terms, careers: options } = await reports.courses({});
    expect(terms).toEqual(['2026-2']);
    expect(options).toHaveLength(1);
    expect(studentRows).toHaveBeenCalledWith('c1');
    // 2 de 3 entregaron (una tarde); la tardía sigue sin calificar.
    expect(rows[0]).toMatchObject({ students: 3, deliveryRate: 67, onTime: 1, ungraded: 1, atRisk: 1 });
  });
});
