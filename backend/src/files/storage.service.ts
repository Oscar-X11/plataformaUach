import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { FilesService } from './files.service';
import type { UploadedFileData } from './upload';

/** Escritura en storage/. Las rutas devueltas son relativas (se guardan en la BD). */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly files: FilesService) {}

  /**
   * Guarda con un nombre aleatorio: el nombre original solo se muestra.
   * Si multer ya lo escribió en storage/.tmp solo se mueve (sin copiar ni usar RAM).
   */
  async save(directory: string, ext: string, file: Pick<UploadedFileData, 'path' | 'buffer'>) {
    const relativePath = posix.join(directory, `${randomUUID()}.${ext}`);
    const absolutePath = join(this.files.root, ...relativePath.split('/'));
    await mkdir(dirname(absolutePath), { recursive: true });
    if (file.path) {
      await rename(file.path, absolutePath);
    } else if (file.buffer) {
      await writeFile(absolutePath, file.buffer, { flag: 'wx' });
    } else {
      throw new Error('Archivo sin contenido');
    }
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
