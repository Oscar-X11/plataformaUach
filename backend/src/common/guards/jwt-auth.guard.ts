import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
    const token = this.extractToken(request);

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
    return true;
  }

  private extractToken(request: AuthRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice(7);
    }
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[SESSION_COOKIE];
  }
}
