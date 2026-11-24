import { QuizKind, QuizResultsVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_QUESTIONS } from './quiz-rules';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** Ajustes del formulario. Las preguntas se validan aparte (quiz-rules). */
export class UpdateQuizDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  title?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(5000, { message: 'La descripción no puede exceder 5000 caracteres' })
  description?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({}, { message: 'Fecha de apertura inválida' })
  opensAt?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString({}, { message: 'Fecha de cierre inválida' })
  closesAt?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @Type(() => Number)
  @IsInt({ message: 'El tiempo límite debe ser un número entero de minutos' })
  @Min(1, { message: 'El tiempo límite va de 1 a 300 minutos' })
  @Max(300, { message: 'El tiempo límite va de 1 a 300 minutos' })
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsEnum(QuizResultsVisibility, { message: 'Opción de resultados inválida' })
  resultsVisibility?: QuizResultsVisibility;

  /** Lista completa de preguntas (reemplaza las anteriores). Solo mientras nadie haya respondido. */
  @IsOptional()
  @IsArray({ message: 'Las preguntas deben ser una lista' })
  @ArrayMaxSize(MAX_QUESTIONS, { message: `Un formulario admite como máximo ${MAX_QUESTIONS} preguntas` })
  questions?: unknown[];
}

export class CreateQuizDto extends UpdateQuizDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  declare title: string;

  @IsEnum(QuizKind, { message: 'Elige cuestionario o encuesta' })
  kind!: QuizKind;
}

export class PublishQuizDto {
  @IsBoolean()
  published!: boolean;
}

/** Respuestas del alumno: [{ questionId, value }]. */
export class SaveAnswersDto {
  @IsArray({ message: 'Las respuestas deben ser una lista' })
  @ArrayMaxSize(MAX_QUESTIONS)
  answers!: unknown[];
}

export class GradeQuizAnswerDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Los puntos deben ser un número' })
  @Min(0, { message: 'Los puntos no pueden ser negativos' })
  points!: number;
}
