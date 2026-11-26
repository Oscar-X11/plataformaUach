import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { CreateCommentDto, CreatePostDto } from './stream.dto';
import { StreamService } from './stream.service';
import { Roles } from '../common/decorators/roles.decorator';

const Id = (name: string) => Param(name, ParseUUIDPipe);

@Controller()
export class StreamController {
  constructor(private readonly stream: StreamService) {}

  @Get('courses/:courseId/posts')
  list(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.stream.list(courseId, user);
  }

  @Roles('TEACHER')
  @Post('courses/:courseId/posts')
  create(@Id('courseId') courseId: string, @Body() dto: CreatePostDto, @Req() { user }: AuthenticatedRequest) {
    return this.stream.create(courseId, dto, user);
  }

  @HttpCode(204)
  @Delete('posts/:id')
  async remove(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.stream.remove(id, user);
  }

  @Roles('TEACHER', 'STUDENT')
  @Post('posts/:id/comments')
  comment(@Id('id') id: string, @Body() dto: CreateCommentDto, @Req() { user }: AuthenticatedRequest) {
    return this.stream.comment(id, dto, user);
  }

  @HttpCode(204)
  @Delete('comments/:id')
  async removeComment(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.stream.removeComment(id, user);
  }
}
