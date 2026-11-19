import { AcademicStatus, UserRole } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
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

export class UpdateStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE', 'GRADUATED'], { message: 'Estado inválido' })
  status!: AcademicStatus;
}
