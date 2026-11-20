/**
 * Reglas de la importación de alumnos desde el Excel de la universidad
 * (columnas: matricula, nombre, ap_pat, ap_mat). Funciones puras para poder
 * probarlas sin base de datos.
 */

export interface StudentImportInput {
  /** Fila del Excel (para señalar errores). */
  line: number;
  matricula: string;
  nombre: string;
  apPat: string;
  apMat: string;
}

export type StudentImportStatus = 'new' | 'exists' | 'error' | 'created';

export interface StudentImportRow {
  line: number;
  username: string;
  fullName: string;
  status: StudentImportStatus;
  error?: string;
  /** Solo en las filas creadas, para que el admin pueda repartirla. */
  initialPassword?: string;
}

/** Las matrículas de la universidad son solo dígitos. */
const MATRICULA = /^\d{3,30}$/;

const collapse = (value: string) => value.trim().replace(/\s+/g, ' ');

/** Minúsculas, sin acentos ni signos: "José" → "jose", "Ma." → "ma". */
const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/**
 * Contraseña inicial acordada con la universidad: últimos 3 dígitos de la
 * matrícula + primer nombre en minúsculas y sin acentos.
 * Ej.: 500525123 + "Oscar" → "123oscar". Se debe cambiar al primer inicio de sesión.
 */
export function studentInitialPassword(matricula: string, nombre: string) {
  const firstName = plain(collapse(nombre).split(' ')[0] ?? '');
  return `${matricula.trim().slice(-3)}${firstName}`;
}

/** Valida y normaliza las filas; marca vacías, inválidas y repetidas dentro del archivo. */
export function prepareStudentRows(rows: StudentImportInput[]): StudentImportRow[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const username = row.matricula.trim();
    const fullName = [row.nombre, row.apPat, row.apMat].map(collapse).filter(Boolean).join(' ');
    const base = { line: row.line, username, fullName };
    const fail = (error: string): StudentImportRow => ({ ...base, status: 'error', error });

    if (!username) return fail('Falta la matrícula');
    if (!MATRICULA.test(username)) return fail('La matrícula solo debe tener números');
    if (!collapse(row.nombre)) return fail('Falta el nombre');
    if (!plain(collapse(row.nombre).split(' ')[0])) return fail('El nombre no tiene letras válidas');
    if (!collapse(row.apPat)) return fail('Falta el apellido paterno');
    if (fullName.length > 150) return fail('El nombre completo es demasiado largo');

    const firstLine = seen.get(username);
    if (firstLine !== undefined) return fail(`Matrícula repetida (ya aparece en la fila ${firstLine})`);
    seen.set(username, row.line);

    return { ...base, status: 'new' };
  });
}

export function summarize(rows: StudentImportRow[]) {
  const count = (status: StudentImportStatus) => rows.filter((row) => row.status === status).length;
  return { new: count('new'), created: count('created'), exists: count('exists'), errors: count('error') };
}
