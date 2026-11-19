import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { FilesService } from './files.service';

/** Escritura en storage/. Las rutas devueltas son relativas (se guardan en la BD). */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly files: FilesService) {}

  /** Guarda con un nombre aleatorio: el nombre original solo se muestra. */
  async save(directory: string, ext: string, buffer: Buffer) {
    const relativePath = posix.join(directory, `${randomUUID()}.${ext}`);
    const absolutePath = join(this.files.root, ...relativePath.split('/'));
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer, { flag: 'wx' });
    return relativePath;
  }

  /** Borrado tolerante: si el archivo ya no existe no es un error. */
  async remove(relativePath: string | null | undefined) {
    if (!relativePath) return;
    try {
      await unlink(join(this.files.root, ...relativePath.split('/')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`No se pudo borrar ${relativePath}: ${String(error)}`);
      }
    }
  }
}
