import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class GradeSubmissionDto {
  /** null borra la calificación. El máximo lo marca Assignment.points. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La calificación admite hasta 2 decimales' })
  @Min(0, { message: 'La calificación no puede ser negativa' })
  grade?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(3000, { message: 'El comentario no puede exceder 3000 caracteres' })
  feedback?: string;

  /** Con rúbrica: { criterioId: nivelId }. La calificación se calcula con los niveles. */
  @IsOptional()
  @IsObject({ message: 'Selección de rúbrica inválida' })
  rubric?: Record<string, string>;

  /** true = devolver al alumno (verá la calificación y recibirá un aviso). */
  @IsOptional()
  @IsBoolean()
  return?: boolean;
}

/** Pesos del libro de calificaciones (enteros que suman 100). */
export class WeightsDto {
  @Type(() => Number)
  @IsInt({ message: 'El peso de tareas debe ser un entero' })
  @Min(0)
  @Max(100)
  weightAssignments!: number;

  @Type(() => Number)
  @IsInt({ message: 'El peso de cuestionarios debe ser un entero' })
  @Min(0)
  @Max(100)
  weightQuizzes!: number;
}
