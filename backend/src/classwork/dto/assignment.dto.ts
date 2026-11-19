import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
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
}
