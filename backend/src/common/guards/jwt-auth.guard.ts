import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SESSION_COOKIE, TokenService } from '../../auth/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthRequest } from '../types/auth-request';

/**
 * Acepta el token desde la cookie httpOnly de sesión (navegador)
 * o desde la cabecera Authorization: Bearer (clientes HTTP).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    request.user = payload;
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
