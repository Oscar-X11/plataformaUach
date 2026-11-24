import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { CookieOptions } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { EnvironmentVariables } from '../config/env.validation';

export const SESSION_COOKIE = 'uach_session';

/** La cookie se renueva como mucho una vez cada 15 minutos de uso. */
const RENEW_AFTER_SECONDS = 15 * 60;

export interface TokenPayload {
  sub: string;
  role: UserRole;
  /** Contraseña temporal pendiente de cambiar: solo se permiten rutas de cuenta. */
  mustChangePassword: boolean;
  /** Versión de sesión del usuario al emitir el token (User.sessionVersion). */
  sv: number;
  /** Momento del inicio de sesión (segundos). Fija el límite absoluto de la sesión. */
  at?: number;
  /** Momento en que se emitió este token (segundos). */
  iat?: number;
}

/**
 * Tokens de sesión (JWT en cookie httpOnly).
 *
 * Sesión deslizante: cada token dura JWT_EXPIRES_IN (8 h por omisión) y, mientras
 * el usuario siga usando la plataforma, se renueva solo. Nunca pasa de
 * SESSION_MAX_DAYS desde el inicio de sesión; ahí hay que volver a entrar.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  sign(payload: TokenPayload) {
    const now = Math.floor(Date.now() / 1000);
    const at = payload.at ?? now;
    const claims = {
      sub: payload.sub,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
      sv: payload.sv,
      at,
    };
    let token = jwt.sign(claims, this.secret, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', {
        infer: true,
      }) as SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
    let { exp } = jwt.decode(token) as { exp: number };
    // Límite absoluto: la renovación no puede alargar la sesión indefinidamente.
    const cap = at + this.maxSessionSeconds;
    if (exp > cap) {
      exp = cap;
      token = jwt.sign({ ...claims, exp }, this.secret, { algorithm: 'HS256' });
    }
    return { token, expiresAt: new Date(exp * 1000) };
  }

  verify(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return null;
      }
      const iat = typeof payload.iat === 'number' ? payload.iat : undefined;
      return {
        sub: payload.sub,
        role: payload.role as UserRole,
        mustChangePassword: payload.mustChangePassword === true,
        // Los tokens anteriores a este campo equivalen a la versión 0.
        sv: typeof payload.sv === 'number' ? payload.sv : 0,
        // Tokens anteriores a la sesión deslizante: el inicio es su emisión.
        at: typeof payload.at === 'number' ? payload.at : iat,
        iat,
      };
    } catch {
      return null;
    }
  }

  /**
   * Token nuevo para una sesión válida que lleva un rato sin renovarse, o null
   * si todavía no hace falta (o si ya llegó al límite absoluto).
   */
  renew(payload: TokenPayload, current: { role: UserRole; mustChangePassword: boolean }) {
    const now = Math.floor(Date.now() / 1000);
    if (!payload.iat || now - payload.iat < RENEW_AFTER_SECONDS) return null;
    const at = payload.at ?? payload.iat;
    if (now - at >= this.maxSessionSeconds) return null;
    return this.sign({ sub: payload.sub, sv: payload.sv, at, ...current });
  }

  /** Opciones de la cookie de sesión (httpOnly, SameSite=Lax, Secure en producción). */
  cookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      ...(expires ? { expires } : {}),
    };
  }

  private get maxSessionSeconds() {
    return this.config.get('SESSION_MAX_DAYS', { infer: true }) * 86_400;
  }

  private get secret() {
    return this.config.get('JWT_SECRET', { infer: true });
  }
}
