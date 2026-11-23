import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { SubjectDto, TermDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

function setup() {
  const prisma = {
    faculty: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    career: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    subject: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    user: { updateMany: jest.fn() },
    academicTerm: {
      count: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findUnique: jest.fn(),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma, service: new CatalogService(prisma as unknown as PrismaService) };
}

describe('CatalogService', () => {
  it('no borra lo que está en uso y explica por qué', async () => {
    const { service, prisma } = setup();
    prisma.faculty.findUnique.mockResolvedValue({ _count: { careers: 2 } });
    await expect(service.deleteFaculty('f1')).rejects.toThrow(/2 carreras/);

    prisma.career.findUnique.mockResolvedValue({ _count: { subjects: 0, users: 1 } });
    await expect(service.deleteCareer('c1')).rejects.toThrow(/1 alumno asignado/);

    prisma.subject.findUnique.mockResolvedValue({ _count: { courses: 3, resources: 0 } });
    await expect(service.deleteSubject('s1')).rejects.toThrow(/3 cursos/);

    prisma.academicTerm.findUnique.mockResolvedValue({ _count: { courses: 1 } });
    await expect(service.deleteTerm('t1')).rejects.toThrow(/ciérralo/);

    expect(prisma.faculty.delete).not.toHaveBeenCalled();
    expect(prisma.subject.delete).not.toHaveBeenCalled();
  });

  it('una clave repetida responde 409 con un mensaje claro', async () => {
    const { service, prisma } = setup();
    prisma.faculty.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(service.createFaculty({ name: 'Ingeniería', code: 'FING' })).rejects.toThrow(
      new ConflictException('Ya existe una facultad con esa clave'),
    );
  });

  it('si una carrera cambia de facultad, sus alumnos también', async () => {
    const { service, prisma } = setup();
    prisma.faculty.findUnique.mockResolvedValue({ id: 'f2' });
    prisma.career.update.mockResolvedValue({ id: 'c1' });
    await service.updateCareer('c1', { name: 'Sistemas', code: 'ISC', facultyId: 'f2' });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { careerId: 'c1' }, data: { facultyId: 'f2' } });
  });

  it('el primer periodo es el actual; las fechas deben tener sentido', async () => {
    const { service, prisma } = setup();
    prisma.academicTerm.count.mockResolvedValue(0);
    await expect(service.createTerm({ code: '2026-2', name: 'Ago–Dic 2026' })).resolves.toMatchObject({ isCurrent: true });
    prisma.academicTerm.count.mockResolvedValue(1);
    await expect(service.createTerm({ code: '2027-1', name: 'Ene–Jun 2027' })).resolves.toMatchObject({ isCurrent: false });
    await expect(
      service.createTerm({ code: '2027-2', name: 'X', startsAt: '2027-12-01', endsAt: '2027-08-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('solo hay un periodo actual y un periodo cerrado deja de serlo', async () => {
    const { service, prisma } = setup();
    prisma.academicTerm.findUnique.mockResolvedValue({ id: 't2', startsAt: null, endsAt: null });

    await service.updateTerm('t2', { isCurrent: true });
    expect(prisma.academicTerm.updateMany).toHaveBeenCalledWith({
      where: { id: { not: 't2' }, isCurrent: true },
      data: { isCurrent: false },
    });
    expect(prisma.academicTerm.update.mock.calls[0][0].data).toMatchObject({ isCurrent: true, closed: false });

    await service.updateTerm('t2', { closed: true });
    expect(prisma.academicTerm.update.mock.calls[1][0].data).toMatchObject({ closed: true, isCurrent: false });
  });
});

describe('DTOs del catálogo', () => {
  it('normaliza claves a mayúsculas y valida el semestre', async () => {
    const subject = plainToInstance(SubjectDto, { name: 'Bases de Datos', code: ' isc-301 ', semester: '3', careerId: '1d3c4e5f-1111-4222-8333-944455556666' });
    expect(subject.code).toBe('ISC-301');
    expect(await validate(subject)).toHaveLength(0);

    const bad = plainToInstance(SubjectDto, { name: 'BD', code: 'ISC 301', semester: 15, careerId: 'x' });
    const fields = (await validate(bad)).map((error) => error.property).sort();
    expect(fields).toEqual(['careerId', 'code', 'name', 'semester']);

    const term = plainToInstance(TermDto, { code: '2026-2', name: 'Agosto – Diciembre 2026', startsAt: '', endsAt: '2026-12-15' });
    expect(term.startsAt).toBeNull();
    expect(await validate(term)).toHaveLength(0);
  });
});
