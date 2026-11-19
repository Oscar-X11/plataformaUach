import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateCourseDto {
  /** Nombre visible, p. ej. "Bases de Datos — Grupo A". */
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El nombre del curso debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre del curso no puede exceder 120 caracteres' })
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

  @IsUUID('all', { message: 'Selecciona una materia' })
  subjectId!: string;
}
