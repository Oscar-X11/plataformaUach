import { IsUUID } from 'class-validator';

export class ReassignTeacherDto {
  @IsUUID('all', { message: 'Selecciona un docente' })
  teacherId!: string;
}
