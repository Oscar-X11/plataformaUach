import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskUpload } from '../files/disk-upload';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import type { UploadedFileData } from '../files/upload';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, RubricDto, UpdateAssignmentDto } from './dto/assignment.dto';
import { GradeSubmissionDto, WeightsDto } from './dto/grade.dto';
import { GradesService } from './grades.service';
import { ProgressService } from './progress.service';
import { MAX_FILE_BYTES, SubmissionsService } from './submissions.service';

const Id = (name: string) => Param(name, ParseUUIDPipe);

/** Trabajo de clase: tareas, entregas y calificaciones. */
@Controller()
export class ClassworkController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly submissions: SubmissionsService,
    private readonly grades: GradesService,
    private readonly progress: ProgressService,
  ) {}

  // Progreso, seguimiento y pesos
  /** Docente: progreso, promedios y alumnos en riesgo de la clase. */
  @Get('courses/:courseId/tracking')
  tracking(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.progress.tracking(courseId, user);
  }

  /** Alumno: su progreso y su calificación final en la clase. */
  @Get('courses/:courseId/progress')
  myProgress(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.progress.mine(courseId, user);
  }

  @Patch('courses/:courseId/weights')
  setWeights(@Id('courseId') courseId: string, @Body() dto: WeightsDto, @Req() { user }: AuthenticatedRequest) {
    if (dto.weightAssignments + dto.weightQuizzes !== 100) {
      throw new BadRequestException('Los pesos deben sumar 100 %');
    }
    return this.progress.setWeights(courseId, dto, user);
  }

  /** El alumno abrió un material (cuenta para su progreso). */
  @HttpCode(200)
  @Post('materials/:id/view')
  viewMaterial(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.progress.markMaterialViewed(id, user);
  }

  // Tareas
  @Get('courses/:courseId/assignments')
  list(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.assignments.list(courseId, user);
  }

  @Post('courses/:courseId/assignments')
  create(
    @Id('courseId') courseId: string,
    @Body() dto: CreateAssignmentDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.assignments.create(courseId, dto, user);
  }

  @Get('assignments/:id')
  get(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.assignments.get(id, user);
  }

  @Patch('assignments/:id')
  update(@Id('id') id: string, @Body() dto: UpdateAssignmentDto, @Req() { user }: AuthenticatedRequest) {
    return this.assignments.update(id, dto, user);
  }

  /** Rúbrica de la tarea (reemplaza la anterior; lista vacía la quita). */
  @Put('assignments/:id/rubric')
  setRubric(@Id('id') id: string, @Body() dto: RubricDto, @Req() { user }: AuthenticatedRequest) {
    return this.assignments.setRubric(id, dto.criteria, user);
  }

  @HttpCode(204)
  @Delete('assignments/:id')
  async remove(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.assignments.remove(id, user);
  }

  // Entrega del alumno
  @Post('assignments/:id/submission/files')
  @UseInterceptors(FilesInterceptor('files', 5, diskUpload(MAX_FILE_BYTES, 5)))
  upload(
    @Id('id') id: string,
    @UploadedFiles() files: UploadedFileData[],
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.submissions.uploadFiles(id, files, user);
  }

  @Delete('assignments/:id/submission/files/:fileId')
  removeFile(
    @Id('id') id: string,
    @Id('fileId') fileId: string,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.submissions.removeFile(id, fileId, user);
  }

  @HttpCode(200)
  @Post('assignments/:id/submission/turn-in')
  turnIn(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.submissions.turnIn(id, user);
  }

  @HttpCode(200)
  @Post('assignments/:id/submission/unsubmit')
  unsubmit(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.submissions.unsubmit(id, user);
  }

  // Revisión del docente
  @Get('assignments/:id/submissions')
  submissionsFor(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.submissions.listForAssignment(id, user);
  }

  @Patch('assignments/:id/submissions/:studentId')
  grade(
    @Id('id') id: string,
    @Id('studentId') studentId: string,
    @Body() dto: GradeSubmissionDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.submissions.grade(id, studentId, dto, user);
  }

  // Vistas generales
  /** ?from=ISO&to=ISO (máximo 62 días). */
  @Get('calendar')
  calendar(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() { user }: AuthenticatedRequest,
  ) {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    if (end.getTime() - start.getTime() > 62 * 86_400_000) {
      throw new BadRequestException('El rango máximo es de 62 días');
    }
    return this.assignments.calendar(user, start, end);
  }

  @Get('classwork/overview')
  overview(@Req() { user }: AuthenticatedRequest) {
    return this.submissions.overview(user);
  }

  @Get('courses/:courseId/grades')
  courseGrades(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.grades.forCourse(courseId, user);
  }

  @Get('courses/:courseId/grades/export')
  async exportGrades(
    @Id('courseId') courseId: string,
    @Req() { user }: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.grades.exportCsv(courseId, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(content);
  }
}
