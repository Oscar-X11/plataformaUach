import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SessionStateService } from '../auth/session-state.service';
import { PrismaService } from '../database/prisma.service';
import { ImportStudentRowDto } from './dto/users.dto';
import { prepareStudentRows, studentInitialPassword } from './student-import';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hash:${value}`),
  hashSync: jest.fn(() => 'dummy'),
}));

const row = (line: number, matricula: string, nombre = 'Oscar', apPat = 'Pérez', apMat = 'López'): ImportStudentRowDto => ({
  line,
  matricula,
  nombre,
  apPat,
  apMat,
});

describe('studentInitialPassword', () => {
  it('usa los últimos 3 dígitos y el primer nombre en minúsculas', () => {
    expect(studentInitialPassword('500525123', 'Oscar')).toBe('123oscar');
    expect(studentInitialPassword('500525123', 'OSCAR')).toBe('123oscar');
  });

  it('toma solo el primer nombre y quita acentos y signos', () => {
    expect(studentInitialPassword('100200045', '  María   José ')).toBe('045maria');
    expect(studentInitialPassword('100200045', 'Ma. Guadalupe')).toBe('045ma');
    expect(studentInitialPassword('100200045', 'Begoña')).toBe('045begona');
  });
});

describe('prepareStudentRows', () => {
  it('arma el nombre completo y acepta apellido materno vacío', () => {
    const [result] = prepareStudentRows([row(2, ' 500525123 ', 'Oscar', ' Pérez ', '')]);
    expect(result).toEqual({ line: 2, username: '500525123', fullName: 'Oscar Pérez', status: 'new' });
  });

  it('señala matrícula inválida, datos faltantes y repetidas', () => {
    const results = prepareStudentRows([
      row(2, ''),
      row(3, 'A123'),
      row(4, '500525123', ''),
      row(5, '500525124', 'Oscar', ''),
      row(6, '500525125'),
      row(7, '500525125'),
    ]);
    expect(results.map((r) => r.status)).toEqual(['error', 'error', 'error', 'error', 'new', 'error']);
    expect(results[5].error).toContain('fila 6');
  });
});

describe('UsersService.importStudents', () => {
  const findMany = jest.fn();
  const createMany = jest.fn();
  const updateMany = jest.fn();
  const findCareer = jest.fn().mockResolvedValue({ id: 'isc', facultyId: 'fing' });
  const service = new UsersService({
    user: { findMany, createMany, updateMany },
    career: { findUnique: findCareer },
  } as unknown as PrismaService, { forget: jest.fn() } as unknown as SessionStateService);

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([{ username: '500525124' }]);
    createMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it('la vista previa no crea cuentas y marca las que ya existen', async () => {
    const result = await service.importStudents({ rows: [row(2, '500525123'), row(3, '500525124')], dryRun: true });
    expect(result.summary).toEqual({ new: 1, created: 0, exists: 1, errors: 0 });
    expect(result.rows[0].initialPassword).toBeUndefined();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('crea solo las nuevas, con contraseña cifrada y cambio obligatorio', async () => {
    const result = await service.importStudents({ rows: [row(2, '500525123'), row(3, '500525124')] });
    expect(result.summary).toEqual({ new: 0, created: 1, exists: 1, errors: 0 });
    expect(result.rows[0].initialPassword).toBe('123oscar');
    expect(bcrypt.hash).toHaveBeenCalledWith('123oscar', expect.any(Number));
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          username: '500525123',
          fullName: 'Oscar Pérez López',
          role: 'STUDENT',
          passwordHash: 'hash:123oscar',
          mustChangePassword: true,
          careerId: null,
          facultyId: null,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('asigna a los nuevos la carrera elegida (y su facultad)', async () => {
    await service.importStudents({ rows: [row(2, '500525123')], careerId: 'isc' });
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({ careerId: 'isc', facultyId: 'fing' });
  });

  it('asigna la carrera solo a alumnos', async () => {
    updateMany.mockResolvedValueOnce({ count: 2 });
    await expect(service.assignCareer({ userIds: ['a', 'b', 'd'], careerId: 'isc' })).resolves.toEqual({ updated: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b', 'd'] }, role: 'STUDENT' },
      data: { careerId: 'isc', facultyId: 'fing' },
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.assignCareer({ userIds: ['d'], careerId: null })).rejects.toThrow(/alumnos/);
  });

  it('rechaza crear demasiadas cuentas en una sola petición', async () => {
    findMany.mockResolvedValue([]);
    const rows = Array.from({ length: 101 }, (_, i) => row(i + 2, String(500000000 + i)));
    await expect(service.importStudents({ rows })).rejects.toBeInstanceOf(BadRequestException);
  });
});
