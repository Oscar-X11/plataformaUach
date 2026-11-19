import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePostDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Escribe el aviso' })
  @MaxLength(5000, { message: 'El aviso no puede exceder 5000 caracteres' })
  content!: string;
}

export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Escribe el comentario' })
  @MaxLength(2000, { message: 'El comentario no puede exceder 2000 caracteres' })
  content!: string;
}
