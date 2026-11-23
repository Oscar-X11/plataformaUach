import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TokenPayload } from './token.service';

/** Lo que decide si una sesión sigue valiendo. Sale de la BD, no del token. */
export interface SessionState {
  role: UserRole;
  mustChangePassword: boolean;
}

interface CachedUser {
  active: boolean;
  sessionVersion: number;
  role: UserRole;
  mustChangePassword: boolean;
  expiresAt: number;
}

/** Segundos que se reutiliza la consulta. Los cambios hechos por la API se aplican al instante (`forget`). */
const CACHE_TTL_MS = 30_000;
/** Tope de usuarios en memoria (servidor de 4 GB). Al llenarse se vacía. */
const CACHE_MAX = 5_000;

/**
 * Comprueba en cada petición que la cuenta siga activa y que el token no sea
 * anterior al último cambio de contraseña o desactivación (`sessionVersion`).
 *
 * Cachea por usuario 30 s. Quien cambie el estado, la contraseña o el rol de una
 * cuenta desde la API debe subir `sessionVersion` y llamar a `forget(userId)`.
 * Solo hay una instancia del backend, así que la caché en memoria basta.
 */
@Injectable()
export class SessionStateService {
  private readonly cache = new Map<string, CachedUser>();

  constructor(private readonly prisma: PrismaService) {}

  /** null si la sesión ya no vale (cuenta inactiva o borrada, o token revocado). */
  async check(payload: TokenPayload): Promise<SessionState | null> {
    const user = await this.load(payload.sub);
    if (!user || !user.active || user.sessionVersion !== payload.sv) return null;
    return { role: user.role, mustChangePassword: user.mustChangePassword };
  }

  forget(userId: string) {
    this.cache.delete(userId);
  }

  private async load(userId: string): Promise<CachedUser | null> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, sessionVersion: true, role: true, mustChangePassword: true },
    });
    if (!user) {
      this.cache.delete(userId);
      return null;
    }
    if (this.cache.size >= CACHE_MAX) this.cache.clear();
    const entry: CachedUser = {
      active: user.status === 'ACTIVE',
      sessionVersion: user.sessionVersion,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    this.cache.set(userId, entry);
    return entry;
  }
}
