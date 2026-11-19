import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeUsername } from './fields';

export class LoginDto {
  /** Matrícula o número de empleado. Sin validar formato: un error genérico basta. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeUsername(value) : value,
  )
  @IsString()
  @MinLength(1, { message: 'Escribe tu matrícula o número de empleado' })
  @MaxLength(30)
  username!: string;

  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña' })
  @MaxLength(72)
  password!: string;
}
