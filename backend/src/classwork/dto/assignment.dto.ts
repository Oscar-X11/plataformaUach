import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsUUID,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAssignmentDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000, { message: 'Las instrucciones no pueden exceder 5000 caracteres' })
  instructions?: string;

  /** ISO 8601. null = sin fecha de entrega. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'La fecha de entrega no es válida' })
  dueAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  @Min(1, { message: 'Los puntos deben ser al menos 1' })
  @Max(100, { message: 'Los puntos no pueden exceder 100' })
  points?: number;

  /** Acceso condicional: visible desde esta fecha (ISO). null = siempre. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'La fecha de disponibilidad no es válida' })
  availableFrom?: string | null;

  /** Acceso condicional: completar antes otra actividad ("assignment" | "quiz"). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['assignment', 'quiz'], { message: 'Tipo de actividad requerida inválido' })
  requiresKind?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'Actividad requerida inválida' })
  requiresId?: string | null;
}

/** Edición parcial: mismas reglas, todo opcional. */
export class UpdateAssignmentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000, { message: 'Las instrucciones no pueden exceder 5000 caracteres' })
  instructions?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'La fecha de entrega no es válida' })
  dueAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  @Min(1, { message: 'Los puntos deben ser al menos 1' })
  @Max(100, { message: 'Los puntos no pueden exceder 100' })
  points?: number;

  /** Acceso condicional: visible desde esta fecha (ISO). null = siempre. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'La fecha de disponibilidad no es válida' })
  availableFrom?: string | null;

  /** Acceso condicional: completar antes otra actividad ("assignment" | "quiz"). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['assignment', 'quiz'], { message: 'Tipo de actividad requerida inválido' })
  requiresKind?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'Actividad requerida inválida' })
  requiresId?: string | null;
}

/** Rúbrica completa (reemplaza la anterior). Lista vacía = quitar la rúbrica. */
export class RubricDto {
  @IsArray({ message: 'La rúbrica debe ser una lista de criterios' })
  criteria!: unknown[];
}
