import { jest } from '@jest/globals';
import type { PrismaService } from '../database/prisma.service';
import { AvailabilityService } from './availability.service';

/** availableMany: lo que se oculta al alumno en el inicio, el calendario y la búsqueda. */
describe('AvailabilityService.availableMany', () => {
  const A1 = '11111111-1111-4111-8111-111111111111';
  const A2 = '22222222-2222-4222-8222-222222222222';
  const Q1 = '33333333-3333-4333-8333-333333333333';

  function setup({ submitted = [] as string[], answered = [] as string[], existing = [A1, A2, Q1] } = {}) {
    const prisma = {
      submission: { findMany: jest.fn(async () => submitted.map((assignmentId) => ({ assignmentId }))) },
      quizAttempt: { findMany: jest.fn(async () => answered.map((quizId) => ({ quizId }))) },
      assignment: { findMany: jest.fn(async () => existing.filter((id) => id !== Q1).map((id) => ({ id }))) },
      quiz: { findMany: jest.fn(async () => existing.filter((id) => id === Q1).map((id) => ({ id }))) },
    };
    return { prisma, service: new AvailabilityService(prisma as unknown as PrismaService) };
  }

  it('sin condiciones no consulta nada y todo está disponible', async () => {
    const { prisma, service } = setup();
    await expect(service.availableMany('s1', [{}, { from: null }])).resolves.toEqual([true, true]);
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
    expect(prisma.quiz.findMany).not.toHaveBeenCalled();
  });

  it('una fecha futura bloquea; una pasada no', async () => {
    const { service } = setup();
    const future = new Date(Date.now() + 3_600_000);
    const past = new Date(Date.now() - 3_600_000);
    await expect(service.availableMany('s1', [{ from: future }, { from: past }])).resolves.toEqual([false, true]);
  });

  it('bloquea hasta completar la actividad requerida', async () => {
    const { service } = setup({ submitted: [A1], answered: [] });
    const result = await service.availableMany('s1', [
      { requiresKind: 'assignment', requiresId: A1 },
      { requiresKind: 'assignment', requiresId: A2 },
      { requiresKind: 'quiz', requiresId: Q1 },
    ]);
    expect(result).toEqual([true, false, false]);
  });

  it('si la actividad requerida se borró, la condición ya no aplica', async () => {
    const { service } = setup({ existing: [] });
    await expect(service.availableMany('s1', [{ requiresKind: 'assignment', requiresId: A2 }])).resolves.toEqual([true]);
  });
});
