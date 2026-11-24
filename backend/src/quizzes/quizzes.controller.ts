import {
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
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import {
  CreateQuizDto,
  GradeQuizAnswerDto,
  PublishQuizDto,
  SaveAnswersDto,
  UpdateQuizDto,
} from './quiz.dto';
import { QuizzesService } from './quizzes.service';

const Id = (name: string) => Param(name, ParseUUIDPipe);

/** Cuestionarios y encuestas de un curso. El acceso se valida por curso en el servicio. */
@Controller()
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get('courses/:courseId/quizzes')
  list(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.list(courseId, user);
  }

  @Post('courses/:courseId/quizzes')
  create(@Id('courseId') courseId: string, @Body() dto: CreateQuizDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.create(courseId, dto, user);
  }

  @Get('quizzes/:id')
  get(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.get(id, user);
  }

  @Patch('quizzes/:id')
  update(@Id('id') id: string, @Body() dto: UpdateQuizDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.update(id, dto, user);
  }

  @HttpCode(200)
  @Post('quizzes/:id/publish')
  publish(@Id('id') id: string, @Body() dto: PublishQuizDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.setPublished(id, dto.published, user);
  }

  @HttpCode(204)
  @Delete('quizzes/:id')
  async remove(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.quizzes.remove(id, user);
  }

  // Alumno
  @HttpCode(200)
  @Post('quizzes/:id/start')
  start(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.start(id, user);
  }

  @Put('quizzes/:id/answers')
  save(@Id('id') id: string, @Body() dto: SaveAnswersDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.saveAnswers(id, dto.answers, user);
  }

  @HttpCode(200)
  @Post('quizzes/:id/submit')
  submit(@Id('id') id: string, @Body() dto: SaveAnswersDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.submit(id, dto.answers, user);
  }

  // Docente
  @Get('quizzes/:id/results')
  results(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.results(id, user);
  }

  @Get('quizzes/:id/results/export')
  async export(@Id('id') id: string, @Req() { user }: AuthenticatedRequest, @Res() res: Response) {
    const { filename, content } = await this.quizzes.exportCsv(id, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(content);
  }

  @Get('quizzes/:id/attempts/:attemptId')
  attempt(@Id('id') id: string, @Id('attemptId') attemptId: string, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.attemptDetail(id, attemptId, user);
  }

  @Patch('quiz-answers/:answerId')
  grade(@Id('answerId') answerId: string, @Body() dto: GradeQuizAnswerDto, @Req() { user }: AuthenticatedRequest) {
    return this.quizzes.gradeAnswer(answerId, dto.points, user);
  }
}
