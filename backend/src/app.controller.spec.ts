import type { Response } from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { PrismaService } from './database/prisma.service';

function fakeResponse() {
  const res = { statusCode: 0, status: jest.fn(), setHeader: jest.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  return res;
}

describe('GET /health', () => {
  const previous = process.env.STORAGE_PATH;
  beforeAll(() => {
    process.env.STORAGE_PATH = mkdtempSync(join(tmpdir(), 'uach-health-'));
  });
  afterAll(() => {
    process.env.STORAGE_PATH = previous;
  });

  it('responde 200 cuando la BD y storage funcionan', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) } as unknown as PrismaService;
    const res = fakeResponse();
    const body = await new AppController(prisma).health(res as unknown as Response);
    expect(res.statusCode).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ok', storage: 'ok' });
  });

  it('responde 503 si la BD falla', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('caída')) } as unknown as PrismaService;
    const res = fakeResponse();
    const body = await new AppController(prisma).health(res as unknown as Response);
    expect(res.statusCode).toBe(503);
    expect(body).toMatchObject({ status: 'error', database: 'error' });
  });
});
