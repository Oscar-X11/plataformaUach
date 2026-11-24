import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
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

  /** Copia un archivo de storage/ a otra carpeta (al reutilizar una clase). Copia en disco, sin usar RAM. */
  async copy(relativePath: string, directory: string) {
    const ext = relativePath.includes('.') ? relativePath.slice(relativePath.lastIndexOf('.') + 1) : 'bin';
    const target = posix.join(directory, `${randomUUID()}.${ext}`);
    const absoluteTarget = join(this.files.root, ...target.split('/'));
    await mkdir(dirname(absoluteTarget), { recursive: true });
    await copyFile(join(this.files.root, ...relativePath.split('/')), absoluteTarget);
    return target;
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
