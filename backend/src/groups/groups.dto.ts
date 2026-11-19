import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class ListGroupsQuery {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all')
  subjectId?: string;

  /** ?mine=true → solo los grupos donde participo. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  mine?: boolean;
}

export class CreateGroupDto {
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  title!: string;

  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(10, { message: 'Describe el grupo en al menos 10 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description!: string;

  @Type(() => Number)
  @IsInt({ message: 'El cupo debe ser un número entero' })
  @Min(2, { message: 'El cupo mínimo es 2' })
  @Max(50, { message: 'El cupo máximo es 50' })
  capacity!: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200, { message: 'Máximo 200 caracteres' })
  meetingInfo?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all', { message: 'Materia inválida' })
  subjectId?: string;
}
