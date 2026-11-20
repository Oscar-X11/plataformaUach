"use client";

import { useRef, useState } from "react";
import { CircleCheck, Download, FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { FormAlert } from "@/components/ui/form";
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";

/** Fila que se manda al backend (POST /users/import-students). */
interface ImportInput {
  line: number;
  matricula: string;
  nombre: string;
  apPat: string;
  apMat: string;
}

interface ImportRow {
  line: number;
  username: string;
  fullName: string;
  status: "new" | "exists" | "error" | "created";
  error?: string;
  initialPassword?: string;
}

interface ImportResult {
  rows: ImportRow[];
  summary: { new: number; created: number; exists: number; errors: number };
}

/** Cuentas por petición al importar (el backend acepta hasta 100). */
const CHUNK = 100;

/** Encabezados aceptados por columna (sin acentos, minúsculas, sin espacios ni guiones). */
const COLUMNS: Record<keyof Omit<ImportInput, "line">, string[]> = {
  matricula: ["matricula"],
  nombre: ["nombre", "nombres"],
  apPat: ["appat", "apellidopaterno", "paterno"],
  apMat: ["apmat", "apellidomaterno", "materno"],
};

const headerKey = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const cell = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

/** Lee la primera hoja del Excel. La primera fila deben ser los encabezados. */
async function readStudents(file: File): Promise<ImportInput[]> {
  const { readSheet } = await import("read-excel-file/browser");
  // parseNumber devuelve el texto tal cual: la matrícula no se convierte en número.
  const data = await readSheet<string>(file, { parseNumber: (text) => text, trim: true });
  const [header = [], ...body] = data;
  const keys = header.map(headerKey);

  const index = {} as Record<keyof typeof COLUMNS, number>;
  const missing: string[] = [];
  for (const [field, names] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string[]][]) {
    index[field] = keys.findIndex((key) => names.includes(key));
    if (index[field] === -1 && field !== "apMat") missing.push(names[0]);
  }
  if (missing.length) {
    throw new Error(
      `No encontré las columnas: ${missing.join(", ")}. La primera fila debe tener matricula, nombre, ap_pat y ap_mat.`,
    );
  }

  return body
    .map((row, i) => ({
      line: i + 2, // fila 1 = encabezados
      matricula: cell(row[index.matricula]),
      nombre: cell(row[index.nombre]),
      apPat: cell(row[index.apPat]),
      apMat: index.apMat === -1 ? "" : cell(row[index.apMat]),
    }))
    .filter((row) => row.matricula || row.nombre || row.apPat || row.apMat);
}

/** CSV con BOM para que Excel respete los acentos. */
function downloadCredentials(rows: ImportRow[]) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    "matricula,nombre,contrasena_inicial",
    ...rows.map((row) => [row.username, row.fullName, row.initialPassword ?? ""].map(quote).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `alumnos-importados-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${tone}`}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

export function StudentImport({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [inputs, setInputs] = useState<ImportInput[]>([]);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [created, setCreated] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setCreated(null);
    setError(null);
    setBusy("Leyendo el archivo…");
    try {
      const rows = await readStudents(file);
      if (rows.length === 0) throw new Error("El archivo no tiene alumnos debajo de los encabezados.");
      setInputs(rows);
      setBusy(`Revisando ${rows.length} alumnos…`);
      setPreview(await api<ImportResult>("/users/import-students", { method: "POST", body: { rows, dryRun: true } }));
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "No se pudo leer el archivo. Asegúrate de que sea un Excel (.xlsx).",
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirm() {
    if (!preview) return;
    const pending = new Set(preview.rows.filter((row) => row.status === "new").map((row) => row.line));
    const rows = inputs.filter((row) => pending.has(row.line));
    const done: ImportRow[] = [];
    setError(null);
    try {
      for (let start = 0; start < rows.length; start += CHUNK) {
        setBusy(`Creando cuentas… ${start} de ${rows.length}`);
        const result = await api<ImportResult>("/users/import-students", {
          method: "POST",
          body: { rows: rows.slice(start, start + CHUNK) },
        });
        done.push(...result.rows.filter((row) => row.status === "created"));
      }
      setCreated(done);
    } catch (caught) {
      const reason = caught instanceof ApiError ? caught.message : "Error de conexión.";
      setError(
        `${reason} Se crearon ${done.length} de ${rows.length} cuentas. Vuelve a subir el archivo para continuar: las que ya se crearon se omiten.`,
      );
      if (done.length) setCreated(done);
    } finally {
      setBusy(null);
      onImported();
    }
  }

  const errors = preview?.rows.filter((row) => row.status === "error") ?? [];
  const sample = preview?.rows.filter((row) => row.status === "new").slice(0, 5) ?? [];

  return (
    <section className={`${CARD} space-y-4 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-uach-ink">Importar alumnos desde Excel</h2>
          <p className="mt-1 text-sm text-uach-ink/75">
            Columnas: <span className="font-mono text-xs">matricula, nombre, ap_pat, ap_mat</span>. La carrera se puede
            asignar después.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar importación"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-uach-ink/75 hover:bg-uach-canvas"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <FormAlert
        tone="info"
        message="Contraseña inicial: últimos 3 dígitos de la matrícula + primer nombre en minúsculas y sin acentos (500525123, Óscar → 123oscar). Al entrar por primera vez, la plataforma les pedirá cambiarla."
      />

      {!created && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            id="student-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0])}
          />
          <label htmlFor="student-file" className={`${BTN_SECONDARY} cursor-pointer`} aria-disabled={Boolean(busy)}>
            <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {fileName ? "Elegir otro archivo" : "Elegir archivo .xlsx"}
          </label>
          {fileName && (
            <span className="flex min-w-0 items-center gap-2 text-sm text-uach-ink/75">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-uach-emerald" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{fileName}</span>
            </span>
          )}
        </div>
      )}

      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm text-uach-ink/75">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> {busy}
        </p>
      )}
      {error && <FormAlert message={error} />}

      {preview && !created && !busy && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat value={preview.summary.new} label="Cuentas nuevas" tone="bg-uach-emerald/10 text-uach-emerald" />
            <Stat value={preview.summary.exists} label="Ya tienen cuenta (se omiten)" tone="bg-uach-canvas text-uach-ink/75" />
            <Stat value={preview.summary.errors} label="Con errores (se omiten)" tone={errors.length ? "bg-red-50 text-red-700" : "bg-uach-canvas text-uach-ink/75"} />
          </div>

          {errors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-uach-ink">Filas con errores</h3>
              <ul className="max-h-60 divide-y divide-uach-ink/[0.06] overflow-y-auto rounded-xl ring-1 ring-uach-ink/10">
                {errors.map((row) => (
                  <li key={row.line} className="flex gap-3 px-3 py-2 text-sm">
                    <span className="w-16 shrink-0 tabular-nums text-uach-ink/60">Fila {row.line}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-uach-ink">{row.fullName || row.username || "(vacía)"}</span>
                      <span className="block text-xs text-red-700">{row.error}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-uach-ink/75">Puedes corregirlas en el Excel y volver a subirlo después.</p>
            </div>
          )}

          {sample.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-uach-ink">Así quedarán (primeros {sample.length})</h3>
              <ul className="divide-y divide-uach-ink/[0.06] rounded-xl ring-1 ring-uach-ink/10">
                {sample.map((row) => (
                  <li key={row.line} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-uach-ink">{row.fullName}</span>
                    <span className="shrink-0 tabular-nums text-uach-ink/75">{row.username}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={BTN_GHOST}>Cancelar</button>
            <button type="button" disabled={preview.summary.new === 0} onClick={confirm} className={BTN_PRIMARY}>
              Crear {preview.summary.new} {preview.summary.new === 1 ? "cuenta" : "cuentas"}
            </button>
          </div>
        </div>
      )}

      {created && !busy && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-medium text-uach-emerald">
            <CircleCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            Se crearon {created.length} {created.length === 1 ? "cuenta" : "cuentas"} de alumno.
          </p>
          <p className="text-sm text-uach-ink/75">
            Descarga la lista para repartir las contraseñas iniciales. Guárdala en un lugar seguro y bórrala cuando ya no
            la necesites: no se podrá volver a descargar.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={BTN_GHOST}>Cerrar</button>
            <button type="button" disabled={created.length === 0} onClick={() => downloadCredentials(created)} className={BTN_PRIMARY}>
              <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Descargar lista (CSV)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
