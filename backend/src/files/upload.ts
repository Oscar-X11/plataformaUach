import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';

/**
 * Forma del archivo que entrega multer. Evita depender de @types/multer.
 * En producción multer escribe en disco (`path`) para no cargar el archivo en RAM;
 * `buffer` queda para pruebas y subidas pequeñas en memoria.
 */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
  buffer?: Buffer;
}

export const MB = 1024 * 1024;

interface FileKind {
  ext: string;
  mime: string;
  /** Comprueba los primeros bytes: no basta con confiar en la extensión. */
  matches: (head: Buffer) => boolean;
}

const startsWith = (head: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => head[offset + index] === byte);

const ZIP = (head: Buffer) => startsWith(head, [0x50, 0x4b, 0x03, 0x04]);
const OLE = (head: Buffer) => startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/** Recorre el contenido en trozos, venga de memoria o de disco. */
async function* chunks(file: UploadedFileData): AsyncGenerator<Buffer> {
  if (file.buffer) {
    yield file.buffer;
    return;
  }
  if (!file.path) throw new BadRequestException('No se recibió el contenido del archivo.');
  for await (const chunk of createReadStream(file.path, { highWaterMark: 64 * 1024 })) {
    yield chunk as Buffer;
  }
}

/** Primeros bytes del archivo, suficientes para reconocer su tipo. */
async function readHead(file: UploadedFileData, length = 16) {
  if (file.buffer) return file.buffer.subarray(0, length);
  const handle = await open(file.path!, 'r');
  try {
    const head = Buffer.alloc(length);
    const { bytesRead } = await handle.read(head, 0, length, 0);
    return head.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * Una sola lectura: calcula el sha256 y, si se pide, comprueba que sea texto
 * (UTF-8 válido y sin bytes nulos al inicio).
 */
async function digest(file: UploadedFileData, checkText: boolean) {
  const hash = createHash('sha256');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let isText = checkText;
  let offset = 0;
  for await (const chunk of chunks(file)) {
    hash.update(chunk);
    if (isText) {
      if (offset < 8192 && chunk.subarray(0, 8192 - offset).includes(0)) isText = false;
      try {
        decoder.decode(chunk, { stream: true });
      } catch {
        isText = false;
      }
    }
    offset += chunk.length;
  }
  if (isText) {
    try {
      decoder.decode();
    } catch {
      isText = false;
    }
  }
  return { sha256: hash.digest('hex'), isText };
}

const KINDS: Record<string, FileKind> = {
  pdf: { ext: 'pdf', mime: 'application/pdf', matches: (h) => startsWith(h, [0x25, 0x50, 0x44, 0x46]) },
  png: { ext: 'png', mime: 'image/png', matches: (h) => startsWith(h, [0x89, 0x50, 0x4e, 0x47]) },
  jpg: { ext: 'jpg', mime: 'image/jpeg', matches: (h) => startsWith(h, [0xff, 0xd8, 0xff]) },
  jpeg: { ext: 'jpg', mime: 'image/jpeg', matches: (h) => startsWith(h, [0xff, 0xd8, 0xff]) },
  webp: {
    ext: 'webp',
    mime: 'image/webp',
    matches: (h) => startsWith(h, [0x52, 0x49, 0x46, 0x46]) && startsWith(h, [0x57, 0x45, 0x42, 0x50], 8),
  },
  docx: {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    matches: ZIP,
  },
  xlsx: {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    matches: ZIP,
  },
  pptx: {
    ext: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    matches: ZIP,
  },
  doc: { ext: 'doc', mime: 'application/msword', matches: OLE },
  xls: { ext: 'xls', mime: 'application/vnd.ms-excel', matches: OLE },
  ppt: { ext: 'ppt', mime: 'application/vnd.ms-powerpoint', matches: OLE },
  zip: { ext: 'zip', mime: 'application/zip', matches: ZIP },
  txt: { ext: 'txt', mime: 'text/plain; charset=utf-8', matches: () => true },
  csv: { ext: 'csv', mime: 'text/csv; charset=utf-8', matches: () => true },
};

const TEXT_KINDS = new Set(['txt', 'csv']);

export const SUBMISSION_EXTENSIONS = Object.keys(KINDS);
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** Nombre seguro para mostrar: sin rutas, caracteres de control ni longitudes absurdas. */
export function safeDisplayName(name: string) {
  // multer entrega el nombre como latin1; los navegadores lo envían en UTF-8.
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  const base = decoded.split(/[\\/]/).pop() ?? 'archivo';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim();
  return (clean || 'archivo').slice(-150);
}

/**
 * Valida tipo (por extensión Y por contenido) y tamaño.
 * Devuelve la extensión normalizada, el MIME y el sha256 del contenido.
 */
export async function inspectUpload(
  file: UploadedFileData,
  allowed: string[],
  maxBytes: number,
) {
  const name = safeDisplayName(file.originalname);
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const kind = allowed.includes(ext) ? KINDS[ext] : undefined;

  if (!kind) {
    throw new BadRequestException(
      `«${name}»: tipo de archivo no permitido. Usa ${allowed.join(', ')}.`,
    );
  }
  if (file.size === 0) throw new BadRequestException(`«${name}» está vacío.`);
  if (file.size > maxBytes) {
    throw new BadRequestException(
      `«${name}» pesa más de ${Math.round(maxBytes / MB)} MB.`,
    );
  }
  const textKind = TEXT_KINDS.has(ext);
  const head = textKind ? Buffer.alloc(0) : await readHead(file);
  if (!textKind && !kind.matches(head)) {
    throw new BadRequestException(
      `«${name}» no parece un archivo .${ext} válido.`,
    );
  }
  const { sha256, isText } = await digest(file, textKind);
  if (textKind && !isText) {
    throw new BadRequestException(
      `«${name}» no parece un archivo .${ext} válido.`,
    );
  }

  return {
    name,
    ext: kind.ext,
    mime: kind.mime,
    sha256,
  };
}
