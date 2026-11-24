import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { SessionStateService } from '../../auth/session-state.service';
import { SESSION_COOKIE, TokenService } from '../../auth/token.service';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthRequest } from '../types/auth-request';

/**
 * Acepta el token desde la cookie httpOnly de sesión (navegador)
 * o desde la cabecera Authorization: Bearer (clientes HTTP).
 *
 * Además de la firma, comprueba en la BD (con caché corta) que la cuenta siga
 * activa y que la sesión no se haya revocado. El rol y la marca de contraseña
 * temporal se toman de la BD, no del token.
 *
 * Sesión deslizante: si la sesión viene en la cookie y el token tiene más de
 * 15 minutos, responde con una cookie renovada (hasta SESSION_MAX_DAYS).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionStateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const { token, fromCookie } = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Sesión requerida');
    }

    const payload = this.tokens.verify(token);
    if (!payload) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    const state = await this.sessions.check(payload);
    if (!state) {
      throw new UnauthorizedException('Tu sesión ya no es válida; vuelve a iniciar sesión');
    }

    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (state.mustChangePassword && !allowPending) {
      throw new ForbiddenException(
        'Debes cambiar tu contraseña temporal antes de continuar',
      );
    }

    request.user = { ...payload, ...state };

    if (fromCookie) {
      const renewed = this.tokens.renew(payload, state);
      if (renewed) {
        const response = context.switchToHttp().getResponse<Response>();
        response.cookie(SESSION_COOKIE, renewed.token, this.tokens.cookieOptions(renewed.expiresAt));
      }
    }
    return true;
  }

  private extractToken(request: AuthRequest): { token?: string; fromCookie: boolean } {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return { token: authorization.slice(7), fromCookie: false };
    }
    const cookies = request.cookies as Record<string, string> | undefined;
    return { token: cookies?.[SESSION_COOKIE], fromCookie: true };
  }
}
