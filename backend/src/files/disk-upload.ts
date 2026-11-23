import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Carpeta raíz de storage/. Misma regla que FilesService: STORAGE_PATH si existe;
 * si no, storage/ en la raíz del monorepo (el backend corre dentro de backend/).
 */
export function resolveStorageRoot(configured = process.env.STORAGE_PATH) {
  if (!configured) return resolve(process.cwd(), '..', 'storage');
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

/**
 * Las subidas se escriben aquí mientras se validan. Está dentro de storage/ para
 * que guardarlas sea un simple rename (mismo disco) y no una copia.
 * No es un área descargable: FilesService solo sirve las de STORAGE_AREAS.
 */
export const UPLOAD_TMP_DIR = '.tmp';

interface IncomingFile {
  stream: Readable;
}

type Callback = (error: Error | null, info?: { path: string; size: number }) => void;

/**
 * Motor de almacenamiento de multer que escribe cada archivo en disco en lugar de
 * guardarlo en RAM. Con 4 GB en el servidor, varias entregas grandes a la vez en
 * memoria bastan para que el sistema mate procesos.
 */
const diskEngine = {
  _handleFile(_req: unknown, file: IncomingFile, cb: Callback) {
    const directory = join(resolveStorageRoot(), UPLOAD_TMP_DIR);
    const path = join(directory, `${randomUUID()}.upload`);
    let size = 0;
    try {
      mkdirSync(directory, { recursive: true });
    } catch (error) {
      return cb(error as Error);
    }
    file.stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
    });
    pipeline(file.stream, createWriteStream(path, { flags: 'wx' }))
      .then(() => cb(null, { path, size }))
      .catch(async (error: Error) => {
        await unlink(path).catch(() => undefined);
        cb(error);
      });
  },
  _removeFile(_req: unknown, file: { path?: string }, cb: (error: Error | null) => void) {
    if (!file.path) return cb(null);
    unlink(file.path).then(
      () => cb(null),
      () => cb(null),
    );
  },
};

/** Opciones para FileInterceptor / FilesInterceptor: a disco y con límites. */
export function diskUpload(maxBytes: number, files = 1) {
  return { storage: diskEngine, limits: { fileSize: maxBytes, files } };
}

/** Borra los temporales que no se guardaron (por ejemplo, si la validación falló). */
export async function discardTemporary(files: Array<{ path?: string } | undefined>) {
  await Promise.all(
    files.map((file) => (file?.path ? unlink(file.path).catch(() => undefined) : undefined)),
  );
}
