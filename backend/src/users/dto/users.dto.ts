import { AcademicStatus, UserRole } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UsernameField } from '../../auth/dto/fields';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListUsersQuery {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  role?: UserRole;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'GRADUATED'])
  status?: AcademicStatus;

  /** "none" = alumnos sin carrera asignada; un id = alumnos de esa carrera. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  careerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/** Asignar (o quitar, con null) la carrera a varios alumnos a la vez. */
export class AssignCareerDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un alumno' })
  @ArrayMaxSize(100, { message: 'Asigna como máximo 100 alumnos a la vez' })
  @IsUUID('all', { each: true })
  userIds!: string[];

  @IsOptional()
  @IsUUID('all', { message: 'Selecciona una carrera' })
  careerId!: string | null;
}

/** Alta de personal. Los alumnos se registran solos con su matrícula. */
export class CreateStaffDto {
  /** Número de empleado. */
  @UsernameField()
  username!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Escribe el nombre completo' })
  @MaxLength(150)
  fullName!: string;

  @IsIn(['TEACHER', 'ADMIN'], { message: 'El rol debe ser docente o administrador' })
  role!: 'TEACHER' | 'ADMIN';
}

/** Una fila del Excel de alumnos. Las reglas de cada campo se revisan en el servicio
 * para poder señalar el error fila por fila en lugar de rechazar todo el archivo. */
export class ImportStudentRowDto {
  @IsInt()
  @Min(1)
  line!: number;

  @IsString()
  @MaxLength(100)
  matricula!: string;

  @IsString()
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MaxLength(100)
  apPat!: string;

  @IsString()
  @MaxLength(100)
  apMat!: string;
}

/** Máximo de filas que se revisan por petición (vista previa). */
export const IMPORT_PREVIEW_MAX = 5000;
/** Máximo de cuentas que se crean por petición: cifrar cada contraseña tarda. */
export const IMPORT_CREATE_MAX = 100;

export class ImportStudentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'El archivo no tiene alumnos' })
  @ArrayMaxSize(IMPORT_PREVIEW_MAX, { message: `El archivo no puede tener más de ${IMPORT_PREVIEW_MAX} alumnos` })
  @ValidateNested({ each: true })
  @Type(() => ImportStudentRowDto)
  rows!: ImportStudentRowDto[];

  /** true = solo revisar (vista previa); no crea nada. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  /** Carrera para todos los alumnos nuevos del archivo (el Excel no la trae). */
  @IsOptional()
  @IsUUID('all', { message: 'Selecciona una carrera' })
  careerId?: string;
}

export class UpdateStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'GRADUATED'], { message: 'Estado inválido' })
  status!: AcademicStatus;
}
