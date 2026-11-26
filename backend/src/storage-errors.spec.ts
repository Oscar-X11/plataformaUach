import { ArgumentsHost, BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TermFilesService } from './academic/term-files.service';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { PrismaService } from './database/prisma.service';
import { ErrorCaptureFilter } from './errors/error-capture.filter';
import { ErrorsService, normalizePath } from './errors/errors.service';
import { contentDisposition, FilesService } from './files/files.service';
import { StorageService } from './files/storage.service';
import { NotificationsService } from './notifications/notifications.service';

const admin = { sub: 'a1', role: 'ADMIN' as const, mustChangePassword: false, sv: 0 };
const student = { sub: 's1', role: 'STUDENT' as const, mustChangePassword: false, sv: 0 };

describe('contentDisposition', () => {
  it('PDF e imágenes se abren en el navegador; lo demás se descarga', () => {
    expect(contentDisposition('Guía.pdf', 'classroom-drive/c/x.pdf')).toMatch(/^inline; /);
    expect(contentDisposition('foto.png', 'submissions/c/x.png')).toMatch(/^inline; /);
    expect(contentDisposition('Tarea.docx', 'submissions/c/x.docx')).toMatch(/^attachment; /);
    // Manda la extensión guardada (validada), no la del nombre.
    expect(contentDisposition('engaño.pdf', 'submissions/c/x.zip')).toMatch(/^attachment; /);
  });

  it('acentos en filename*, sin ellos en filename; comillas, diagonales y controles no pasan', () => {
    expect(contentDisposition('Año 1 "final"/v2\r\n.pdf', 'x/y.pdf')).toBe(
      `inline; filename="Ano 1 _final__v2__.pdf"; filename*=UTF-8''A%C3%B1o%201%20_final__v2__.pdf`,
    );
    expect(contentDisposition('   ', 'x/y.txt')).toBe(`attachment; filename="archivo"; filename*=UTF-8''archivo`);
  });
});

describe('FilesService (nombre original y archivos borrados)', () => {
  const root = mkdtempSync(join(tmpdir(), 'uach-names-'));
  mkdirSync(join(root, 'classroom-drive'));
  writeFileSync(join(root, 'classroom-drive', 'm.pdf'), 'pdf');
  const material = jest.fn();
  const prisma = { courseMaterial: { findUnique: material } } as unknown as PrismaService;
  const env = validateEnv({ DATABASE_URL: 'mysql://u:p@h/db', JWT_SECRET: 'x'.repeat(48), STORAGE_PATH: root });
  const config = { get: (key: keyof EnvironmentVariables) => env[key] } as unknown as ConfigService<EnvironmentVariables, true>;
  const files = new FilesService(prisma, config);
  const course = { teacherId: 't1', enrollments: [{ id: 'e1' }] };

  it('devuelve el nombre original, también al administrador', async () => {
    material.mockResolvedValue({ originalName: 'Guía 1.pdf', fileDeletedAt: null, course });
    await expect(files.authorize('classroom-drive/m.pdf', student)).resolves.toMatchObject({ downloadName: 'Guía 1.pdf' });
    material.mockResolvedValue({ originalName: 'Guía 1.pdf', fileDeletedAt: null, course: { teacherId: 't1', enrollments: [] } });
    await expect(files.authorize('classroom-drive/m.pdf', admin)).resolves.toMatchObject({ downloadName: 'Guía 1.pdf' });
  });

  it('un archivo borrado al liberar el periodo responde 410 con explicación', async () => {
    material.mockResolvedValue({ originalName: 'Guía 1.pdf', fileDeletedAt: new Date(), course });
    await expect(files.authorize('classroom-drive/m.pdf', student)).rejects.toBeInstanceOf(GoneException);
  });
});

describe('TermFilesService', () => {
  function setup(closed: boolean) {
    const submissionBatches = [
      [{ id: 'f1', fileUrl: 'submissions/c/1.pdf', size: 100 }, { id: 'f2', fileUrl: 'submissions/c/2.pdf', size: 50 }],
      [],
    ];
    const prisma = {
      academicTerm: { findUnique: jest.fn().mockResolvedValue({ code: '2026-C1', closed, _count: { courses: 2 } }) },
      submissionFile: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(submissionBatches.shift() ?? [])),
        updateMany: jest.fn(),
      },
      courseMaterial: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: 'm1', fileUrl: 'classroom-drive/c/m.pdf', size: null }]).mockResolvedValue([]),
        updateMany: jest.fn(),
      },
    };
    const remove = jest.fn();
    const service = new TermFilesService(prisma as unknown as PrismaService, { remove } as unknown as StorageService);
    return { service, prisma, remove };
  }

  it('solo con el periodo cerrado y la clave exacta', async () => {
    await expect(setup(false).service.purge('t', '2026-C1')).rejects.toThrow(/Cierra el periodo/);
    await expect(setup(true).service.purge('t', '2026-C2')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('borra del disco, marca los registros y suma lo liberado', async () => {
    const { service, prisma, remove } = setup(true);
    await expect(service.purge('t', ' 2026-C1 ')).resolves.toEqual({ code: '2026-C1', files: 3, bytes: 150 });
    expect(remove.mock.calls.map(([path]) => path)).toEqual(['submissions/c/1.pdf', 'submissions/c/2.pdf', 'classroom-drive/c/m.pdf']);
    expect(prisma.submissionFile.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['f1', 'f2'] } },
      data: { fileDeletedAt: expect.any(Date) },
    });
    expect(prisma.courseMaterial.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorsService', () => {
  function setup(open: { id: string } | null = null) {
    const prisma = {
      errorReport: {
        findFirst: jest.fn().mockResolvedValue(open),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        findUnique: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]) },
    };
    const notify = jest.fn();
    const service = new ErrorsService(prisma as unknown as PrismaService, { notify } as unknown as NotificationsService);
    return { service, prisma, notify };
  }

  it('agrupa las rutas por forma, sin ids ni consulta', () => {
    expect(normalizePath('GET /courses/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/posts?page=2')).toBe('GET /courses/:id/posts');
  });

  it('un error nuevo se guarda y avisa a los administradores; uno repetido solo suma', async () => {
    const fresh = setup();
    await fresh.service.capture({ source: 'SERVER', message: 'Error: boom', path: 'GET /x' });
    expect(fresh.prisma.errorReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'SERVER', message: 'Error: boom', fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    });
    expect(fresh.notify).toHaveBeenCalledWith(['a1', 'a2'], expect.objectContaining({ type: 'ERROR_REPORTED' }));

    const repeated = setup({ id: 'r1' });
    await repeated.service.capture({ source: 'SERVER', message: 'Error: boom', path: 'GET /x' });
    expect(repeated.prisma.errorReport.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { count: { increment: 1 }, lastSeenAt: expect.any(Date) },
    });
    expect(repeated.prisma.errorReport.create).not.toHaveBeenCalled();
    expect(repeated.notify).not.toHaveBeenCalled();
  });

  it('guardar un error nunca lanza, aunque falle la base', async () => {
    const { service, prisma } = setup();
    prisma.errorReport.findFirst.mockRejectedValue(new Error('sin conexión'));
    await expect(service.capture({ source: 'CLIENT', message: 'x' })).resolves.toBeUndefined();
  });

  it('atender un reporte avisa a quien lo hizo una sola vez', async () => {
    const { service, prisma, notify } = setup();
    prisma.errorReport.findUnique.mockResolvedValueOnce({ source: 'USER', userId: 's1', resolvedAt: null });
    await service.resolve('r1', 'Listo');
    expect(notify).toHaveBeenCalledWith(['s1'], { type: 'REPORT_RESOLVED', title: 'Atendimos tu reporte: Listo' });
    prisma.errorReport.findUnique.mockResolvedValueOnce({ source: 'USER', userId: 's1', resolvedAt: new Date() });
    await service.resolve('r1', 'Otra nota');
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorCaptureFilter', () => {
  function run(exception: unknown) {
    const capture = jest.fn();
    const filter = new ErrorCaptureFilter({ capture } as unknown as ErrorsService);
    const reply = jest.fn();
    Object.assign(filter, { httpAdapterHost: { httpAdapter: { reply, isHeadersSent: () => false, end: jest.fn() } } });
    const request = { method: 'POST', originalUrl: '/materials/1', headers: { 'user-agent': 'Prueba' }, user: student };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
      getArgByIndex: () => ({}),
      getArgs: () => [request, {}],
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return { capture, reply };
  }

  it('registra los errores inesperados y responde 500 como siempre', () => {
    const { capture, reply } = run(new TypeError('x is undefined'));
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'SERVER', message: 'TypeError: x is undefined', path: 'POST /materials/1', userId: 's1' }),
    );
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ statusCode: 500 }), 500);
  });

  it('no registra errores esperados (404, 400…)', () => {
    const { capture, reply } = run(new NotFoundException('No está'));
    expect(capture).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ statusCode: 404 }), 404);
  });
});
