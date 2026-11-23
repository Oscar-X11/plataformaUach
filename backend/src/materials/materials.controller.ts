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
import { CreateMaterialDto, TopicDto } from './materials.dto';
import { MAX_MATERIAL_BYTES, MaterialsService } from './materials.service';

const Id = (name: string) => Param(name, ParseUUIDPipe);

@Controller()
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get('courses/:courseId/materials')
  list(@Id('courseId') courseId: string, @Req() { user }: AuthenticatedRequest) {
    return this.materials.list(courseId, user);
  }

  /** multipart: campo "file" opcional (si no, "url"). */
  @Post('courses/:courseId/materials')
  @UseInterceptors(FileInterceptor('file', diskUpload(MAX_MATERIAL_BYTES)))
  create(
    @Id('courseId') courseId: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: UploadedFileData | undefined,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.materials.create(courseId, dto, file, user);
  }

  @HttpCode(204)
  @Delete('materials/:id')
  async remove(@Id('id') id: string, @Req() { user }: AuthenticatedRequest) {
    await this.materials.remove(id, user);
  }

  @Post('courses/:courseId/topics')
  createTopic(@Id('courseId') courseId: string, @Body() dto: TopicDto, @Req() { user }: AuthenticatedRequest) {
    return this.materials.createTopic(courseId, dto, user);
  }

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
