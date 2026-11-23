import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateMeetingInfoDto } from './dto/create-course.dto';
import { JoinCourseDto } from './dto/join-course.dto';
import { ReassignTeacherDto } from './dto/reassign-teacher.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Req() { user }: AuthenticatedRequest) {
    return this.courses.list(user);
  }

  @Roles('TEACHER')
  @Post()
  create(@Body() dto: CreateCourseDto, @Req() { user }: AuthenticatedRequest) {
    return this.courses.create(dto, user);
  }

  /** Límite estricto para que no se puedan adivinar códigos por fuerza bruta. */
  @Roles('STUDENT')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('join')
  join(@Body() dto: JoinCourseDto, @Req() { user }: AuthenticatedRequest) {
    return this.courses.join(dto.code, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() { user }: AuthenticatedRequest) {
    return this.courses.get(id, user);
  }

  @Get(':id/people')
  people(@Param('id', ParseUUIDPipe) id: string, @Req() { user }: AuthenticatedRequest) {
    return this.courses.people(id, user);
  }

  @Roles('TEACHER', 'ADMIN')
  @HttpCode(200)
  @Post(':id/invitation')
  regenerateInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.courses.regenerateInvitation(id, user);
  }

  @Roles('TEACHER', 'ADMIN')
  @Patch(':id/meeting')
  updateMeetingInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeetingInfoDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.courses.updateMeetingInfo(id, dto, user);
  }

  @Roles('ADMIN')
  @Patch(':id/teacher')
  reassignTeacher(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReassignTeacherDto) {
    return this.courses.reassignTeacher(id, dto.teacherId);
  }

  @Roles('TEACHER', 'ADMIN')
  @HttpCode(204)
  @Delete(':id/students/:studentId')
  async removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Req() { user }: AuthenticatedRequest,
  ) {
    await this.courses.removeStudent(id, studentId, user);
  }
}
