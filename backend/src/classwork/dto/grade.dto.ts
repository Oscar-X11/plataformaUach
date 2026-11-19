import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

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

  /** true = devolver al alumno (verá la calificación y recibirá un aviso). */
  @IsOptional()
  @IsBoolean()
  return?: boolean;
}
