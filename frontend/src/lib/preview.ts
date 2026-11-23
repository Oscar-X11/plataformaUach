import { fileHref } from "@/lib/classwork";

/** Lo que se puede mostrar dentro de la plataforma sin descargar. */
export type PreviewSource =
  | { kind: "frame"; src: string; external: boolean }
  | { kind: "image"; src: string };

const DRIVE_ID = "[\w-]{10,}";

/**
 * Convierte un enlace de Google Drive o Docs en su versión incrustable (/preview).
 * Solo funciona si el archivo está compartido como «Cualquier persona con el enlace».
 */
export function googlePreviewUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  if (url.hostname === "drive.google.com") {
    const byPath = url.pathname.match(new RegExp(`^/file/d/(${DRIVE_ID})`));
    const byQuery = /^\/(open|uc)$/.test(url.pathname) ? url.searchParams.get("id") : null;
    const id = byPath?.[1] ?? (byQuery && new RegExp(`^${DRIVE_ID}$`).test(byQuery) ? byQuery : null);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (url.hostname === "docs.google.com") {
    const match = url.pathname.match(new RegExp(`^/(document|presentation|spreadsheets)/d/(${DRIVE_ID})`));
    return match ? `https://docs.google.com/${match[1]}/d/${match[2]}/preview` : null;
  }
  return null;
}

export const isGoogleLink = (raw: string | null | undefined) => !!raw && googlePreviewUrl(raw) !== null;

/** Vista previa de un archivo subido (PDF o imagen) o de un enlace de Google. */
export function previewFor(item: {
  fileUrl?: string | null;
  mimeType?: string | null;
  url?: string | null;
}): PreviewSource | null {
  if (item.fileUrl) {
    if (item.mimeType === "application/pdf") return { kind: "frame", src: fileHref(item.fileUrl), external: false };
    if (item.mimeType?.startsWith("image/")) return { kind: "image", src: fileHref(item.fileUrl) };
    return null;
  }
  const google = item.url ? googlePreviewUrl(item.url) : null;
  return google ? { kind: "frame", src: google, external: true } : null;
}
