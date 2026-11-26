import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../auth/token.service';
import { ErrorsService } from './errors.service';

/**
 * Registra los errores inesperados (respuesta 500) para el administrador y luego deja
 * que Nest responda como siempre. Los errores esperados (400, 403, 404, 429…) no se guardan.
 */
@Catch()
export class ErrorCaptureFilter extends BaseExceptionFilter {
  constructor(private readonly errors: ErrorsService) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500 && host.getType() === 'http') {
      const request = host.switchToHttp().getRequest<Request & { user?: TokenPayload }>();
      const error = exception instanceof Error ? exception : new Error(String(exception));
      void this.errors.capture({
        source: 'SERVER',
        message: `${error.name}: ${error.message}`,
        detail: error.stack ?? null,
        path: `${request.method} ${request.originalUrl ?? request.url}`,
        userId: request.user?.sub ?? null,
        userAgent: request.headers['user-agent'] ?? null,
      });
    }
    super.catch(exception, host);
  }
}
