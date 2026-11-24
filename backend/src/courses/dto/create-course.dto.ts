import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
/** Vacío = sin dato (se guarda null). */
const trimToNull = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const text = value.trim().replace(/\s+/g, ' ');
  return text === '' ? null : text;
};
const MEETING_MESSAGE = 'El aula no puede exceder 200 caracteres';
/** Texto largo: conserva los saltos de línea. Vacío = null. */
const textToNull = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? null : text;
};

export class CreateCourseDto {
  /** Nombre de la clase, p. ej. "Bases de Datos — Grupo A". */
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre de la clase debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre de la clase no puede exceder 120 caracteres' })
  name!: string;

  /** Periodo académico, p. ej. "2026-2" o "Otoño 2026". */
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Indica el periodo (por ejemplo 2026-2)' })
  @MaxLength(30)
  @Matches(/^[\p{L}\d][\p{L}\d \-/]*$/u, {
    message: 'El periodo solo admite letras, números, espacios, guiones y "/"',
  })
  term!: string;

  @IsUUID('all', { message: 'Selecciona la carrera' })
  careerId!: string;

  /** Número de cuatrimestre o semestre (el máximo depende del nivel). */
  @Type(() => Number)
  @IsInt({ message: 'Elige el cuatrimestre o semestre' })
  @Min(1, { message: 'Elige el cuatrimestre o semestre' })
  @Max(12, { message: 'El cuatrimestre o semestre va de 1 a 12' })
  grade!: number;

  /** Materia del catálogo (opcional). Debe ser de la misma carrera. */
  @IsOptional()
  @IsUUID('all', { message: 'Materia inválida' })
  subjectId?: string;

  /** Descripción de la clase. Opcional. */
  @IsOptional()
  @Transform(textToNull)
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description?: string | null;

  /** Aula: salón y horario, o enlace de la reunión en línea. Opcional. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(200, { message: MEETING_MESSAGE })
  meetingInfo?: string | null;
}

/** Descripción de la clase (editable después de crearla). Vacío la borra. */
export class UpdateDescriptionDto {
  @IsOptional()
  @Transform(textToNull)
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description!: string | null;
}

export class UpdateMeetingInfoDto {
  /** Texto vacío o null lo borra. */
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(200, { message: MEETING_MESSAGE })
  meetingInfo!: string | null;
}
