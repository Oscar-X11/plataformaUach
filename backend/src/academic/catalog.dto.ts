import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
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

export class FacultyDto extends NamedWithCode {}

export class CareerDto extends NamedWithCode {
  @IsUUID('all', { message: 'Selecciona una facultad' })
  facultyId!: string;
}

export class SubjectDto extends NamedWithCode {
  @Type(() => Number)
  @IsInt({ message: 'El semestre debe ser un número entero' })
  @Min(1, { message: 'El semestre va de 1 a 12' })
  @Max(12, { message: 'El semestre va de 1 a 12' })
  semester!: number;

  @IsUUID('all', { message: 'Selecciona una carrera' })
  careerId!: string;
}

export class TermDto {
  /** Clave corta que ven todos: "2026-2". */
  @Transform(code)
  @IsString()
  @MinLength(3, { message: 'Indica la clave del periodo (por ejemplo 2026-2)' })
  @MaxLength(30)
  @Matches(/^[A-Z0-9][A-Z0-9 \-/]*$/, {
    message: 'La clave solo admite letras, números, espacios, guiones y "/"',
  })
  code!: string;

  /** Nombre descriptivo: "Agosto – Diciembre 2026". */
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

  /** true lo vuelve el periodo actual (y deja de serlo el anterior). */
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}
