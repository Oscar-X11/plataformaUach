import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class JoinCourseDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9]{6,8}$/, { message: 'El código de invitación no es válido' })
  code!: string;
}
