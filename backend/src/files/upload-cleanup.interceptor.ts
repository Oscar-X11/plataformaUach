import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { finalize } from 'rxjs';
import { discardTemporary } from './disk-upload';

interface UploadRequest {
  file?: { path?: string };
  files?: Array<{ path?: string }> | Record<string, Array<{ path?: string }>>;
}

/**
 * Al terminar cada petición borra los archivos temporales de subida que sigan en
 * storage/.tmp. Los que se guardaron ya se movieron a su lugar (rename), así que
 * aquí solo quedan los rechazados por validación o por un error.
 */
@Injectable()
export class UploadCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<UploadRequest>();
    return next.handle().pipe(
      finalize(() => {
        const { file, files } = request;
        const list = Array.isArray(files) ? files : Object.values(files ?? {}).flat();
        if (file || list.length) void discardTemporary([file, ...list]);
      }),
    );
  }
}
