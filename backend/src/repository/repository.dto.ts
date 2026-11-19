import { ResourceType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

const TYPES = Object.values(ResourceType);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class ListResourcesQuery {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(TYPES)
  type?: ResourceType;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all')
  subjectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/** Campos del formulario multipart (el archivo va en "file"). */
export class UploadResourceDto {
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede exceder 150 caracteres' })
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description?: string;

  @IsIn(TYPES, { message: 'Elige el tipo de recurso' })
  type!: ResourceType;

  @IsUUID('all', { message: 'Selecciona una materia' })
  subjectId!: string;
}

export class ReviewResourceDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500, { message: 'El motivo no puede exceder 500 caracteres' })
  note?: string;
}
