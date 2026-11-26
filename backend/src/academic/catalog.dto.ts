import { TermScheme } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
/** Claves en mayúsculas y sin espacios: "FING", "ISC-301". */
const code = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;
const CODE_MESSAGE = 'La clave solo admite letras, números y guiones, sin espacios';

class NamedWithCode {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres' })
  name!: string;

  @Transform(code)
  @IsString()
  @MinLength(2, { message: 'La clave debe tener al menos 2 caracteres' })
  @MaxLength(20, { message: 'La clave no puede exceder 20 caracteres' })
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code!: string;
}

const SCHEME_MESSAGE = 'El tipo de periodo debe ser cuatrimestral o semestral';

export class FacultyDto extends NamedWithCode {
  /** Si se omite, el nivel queda cuatrimestral (o conserva el que tenía). */
  @IsOptional()
  @IsEnum(TermScheme, { message: SCHEME_MESSAGE })
  scheme?: TermScheme;

  /** Calificación mínima aprobatoria (0-10). Si se omite, se conserva (7 al crear). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'La calificación aprobatoria admite un decimal' })
  @Min(0, { message: 'La calificación aprobatoria va de 0 a 10' })
  @Max(10, { message: 'La calificación aprobatoria va de 0 a 10' })
  passingGrade?: number;
}

export class CareerDto extends NamedWithCode {
  @IsUUID('all', { message: 'Selecciona un nivel' })
  facultyId!: string;
}

export class SubjectDto extends NamedWithCode {
  @Type(() => Number)
  @IsInt({ message: 'El cuatrimestre o semestre debe ser un número entero' })
  @Min(1, { message: 'El cuatrimestre o semestre va de 1 a 9' })
  @Max(9, { message: 'El cuatrimestre o semestre va de 1 a 9' })
  semester!: number;

  @IsUUID('all', { message: 'Selecciona una carrera' })
  careerId!: string;
}

export class TermDto {
  /** Cuatrimestral (licenciaturas e ingenierías) o semestral (bachillerato). No cambia después. */
  @IsOptional()
  @IsEnum(TermScheme, { message: SCHEME_MESSAGE })
  scheme?: TermScheme;

  /** Clave corta que ven todos: "2026-C3". */
  @Transform(code)
  @IsString()
  @MinLength(3, { message: 'Indica la clave del periodo (por ejemplo 2026-C3)' })
  @MaxLength(30)
  @Matches(/^[A-Z0-9][A-Z0-9 \-/]*$/, {
    message: 'La clave solo admite letras, números, espacios, guiones y "/"',
  })
  code!: string;

  /** Nombre descriptivo: "Septiembre – Diciembre 2026". */
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede exceder 80 caracteres' })
  name!: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({ strict: true }, { message: 'Fecha de inicio inválida' })
  startsAt?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({ strict: true }, { message: 'Fecha de fin inválida' })
  endsAt?: string | null;
}

export class UpdateTermDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede exceder 80 caracteres' })
  name?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({ strict: true }, { message: 'Fecha de inicio inválida' })
  startsAt?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({ strict: true }, { message: 'Fecha de fin inválida' })
  endsAt?: string | null;

  /** true lo vuelve el periodo actual de su tipo (y deja de serlo el anterior del mismo tipo). */
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}
