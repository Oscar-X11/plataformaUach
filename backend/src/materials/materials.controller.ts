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
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskUpload } from '../files/disk-upload';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import type { UploadedFileData } from '../files/upload';
import { ActivityService } from '../activity/activity.service';
import { CreateMaterialDto, TopicDto } from './materials.dto';
import { MAX_MATERIAL_BYTES, MaterialsService } from './materials.service';
import { Roles } from '../common/decorators/roles.decorator';

const Id = (name: string) => Param(name, ParseUUIDPipe);

@Controller()
export class MaterialsController {
  constructor(
    private readonly materials: MaterialsService,
    private readonly activity: ActivityService,
  ) {}

  @Get('courses/:courseId/materials')
  list(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.materials.list(courseId, user);
  }

  /** multipart: campo "file" opcional (si no, "url"). */
  @Roles('TEACHER')
  @Post('courses/:courseId/materials')
  @UseInterceptors(FileInterceptor('file', diskUpload(MAX_MATERIAL_BYTES)))
  async create(
    @Id('courseId') courseId: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: UploadedFileData | undefined,
    @Req() { user }: AuthenticatedRequest,
  ) {
    const material = await this.materials.create(courseId, dto, file, user);
    this.activity.log({ userId: user.sub, courseId, action: 'MATERIAL_ADDED', summary: `Agregó el material «${material.title}»` });
    return material;
  }

  @HttpCode(204)
  @Delete('materials/:id')
  async remove(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.materials.remove(id, user);
  }

  @Roles('TEACHER')
  @Post('courses/:courseId/topics')
  createTopic(@Id('courseId') courseId: string, @Body() dto: TopicDto, @Req() { user }: AuthenticatedRequest) {
    return this.materials.createTopic(courseId, dto, user);
  }

  @Roles('TEACHER')
  @Patch('topics/:id')
  renameTopic(@Id('id') id: string, @Body() dto: TopicDto, @Req() { user }: AuthenticatedRequest) {
    return this.materials.renameTopic(id, dto, user);
  }

  @HttpCode(204)
  @Delete('topics/:id')
  async removeTopic(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.materials.removeTopic(id, user);
  }
}
