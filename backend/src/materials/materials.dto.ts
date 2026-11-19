import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Los formularios multipart envían "" para campos vacíos. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class TopicDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'El tema debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El tema no puede exceder 120 caracteres' })
  title!: string;
}

/** Campos de texto del formulario multipart (el archivo va aparte). */
export class CreateMaterialDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Escribe un título' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all', { message: 'Tema inválido' })
  topicId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500, { message: 'El enlace no puede exceder 500 caracteres' })
  url?: string;
}
