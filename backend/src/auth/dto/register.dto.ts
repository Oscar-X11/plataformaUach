import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Registro público: siempre crea cuentas con rol STUDENT.
 * Los roles TEACHER, ADMIN y SECURITY solo los asigna un administrador.
 */
export class RegisterDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @MaxLength(191)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Escribe tu nombre completo' })
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  enrollment?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Facultad inválida' })
  facultyId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Carrera inválida' })
  careerId?: string;
}
