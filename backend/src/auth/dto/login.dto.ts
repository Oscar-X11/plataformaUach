import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña' })
  @MaxLength(72)
  password!: string;
}
