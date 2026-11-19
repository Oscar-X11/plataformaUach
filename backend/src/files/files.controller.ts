import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { FilesService } from './files.service';

/**
 * Descarga de archivos de storage/ con autenticación y permisos.
 * Se accede como /api/files/<area>/<ruta>, p. ej. /api/files/submissions/abc/tarea.pdf
 */
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get('*path')
  async download(
    @Param('path') path: string | string[],
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const relativePath = Array.isArray(path) ? path.join('/') : path;
    const file = await this.files.authorize(relativePath, request.user);

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (this.files.useAccelRedirect) {
      // Nginx entrega el archivo desde la ubicación interna /protected-storage/
      res.setHeader('X-Accel-Redirect', `/protected-storage/${file.relativePath}`);
      res.end();
      return;
    }

    res.sendFile(file.absolutePath, { dotfiles: 'deny' });
  }
}
