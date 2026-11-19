import { IsString, MaxLength, MinLength } from 'class-validator';
import { NewPasswordField } from './fields';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña actual' })
  @MaxLength(72)
  currentPassword!: string;

  @NewPasswordField()
  newPassword!: string;
}
