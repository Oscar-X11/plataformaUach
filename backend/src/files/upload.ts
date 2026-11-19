import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** Forma del archivo que entrega multer (memoria). Evita depender de @types/multer. */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
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

/** Texto plano: UTF-8 válido y sin bytes nulos. */
const isText = (buffer: Buffer) =>
  !buffer.subarray(0, 8192).includes(0) &&
  Buffer.from(buffer.toString('utf8'), 'utf8').equals(buffer);

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
export function inspectUpload(
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
  const contentOk = TEXT_KINDS.has(ext) ? isText(file.buffer) : kind.matches(file.buffer);
  if (!contentOk) {
    throw new BadRequestException(
      `«${name}» no parece un archivo .${ext} válido.`,
    );
  }

  return {
    name,
    ext: kind.ext,
    mime: kind.mime,
    sha256: createHash('sha256').update(file.buffer).digest('hex'),
  };
}
