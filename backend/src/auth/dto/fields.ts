import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Identificador de acceso: matrícula (alumnos) o número de empleado (personal).
 * Se guarda en mayúsculas y sin espacios para que "a2023-0148" y "A2023-0148"
 * sean la misma cuenta.
 */
export function normalizeUsername(value: string) {
  return value.trim().toUpperCase();
}

export const UsernameField = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizeUsername(value) : value,
    ),
    IsString({ message: 'Escribe tu matrícula o número de empleado' }),
    Matches(/^[A-Z0-9-]{3,30}$/, {
      message:
        'La matrícula o número de empleado solo admite letras, números y guiones (3 a 30)',
    }),
  );

/** Reglas para contraseñas nuevas (registro, cambio y restablecimiento). */
export const NewPasswordField = () =>
  applyDecorators(
    IsString(),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' }),
    Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
      message: 'La contraseña debe incluir letras y números',
    }),
  );
