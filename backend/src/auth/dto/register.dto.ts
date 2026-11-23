import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NewPasswordField, UsernameField } from './fields';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Registro público: siempre crea cuentas con rol STUDENT, identificadas por
 * su matrícula. Los roles TEACHER y ADMIN solo los asigna un administrador.
 */
export class RegisterDto {
  /** Matrícula del alumno. */
  @UsernameField()
  username!: string;

  @NewPasswordField()
  password!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Escribe tu nombre completo' })
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @IsUUID('all', { message: 'Nivel inválido' })
  facultyId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Carrera inválida' })
  careerId?: string;
}
