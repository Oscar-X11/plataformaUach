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
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import type { UploadedFileData } from '../files/upload';
import { ListResourcesQuery, ReviewResourceDto, UploadResourceDto } from './repository.dto';
import { MAX_RESOURCE_BYTES, RepositoryService } from './repository.service';

@Controller('repository')
export class RepositoryController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  search(@Query() query: ListResourcesQuery) {
    return this.repository.search(query);
  }

  @Get('mine')
  mine(@Req() { user }: AuthenticatedRequest) {
    return this.repository.mine(user);
  }

  @Roles('ADMIN')
  @Get('pending')
  pending() {
    return this.repository.pending();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RESOURCE_BYTES, files: 1 } }))
  upload(
    @Body() dto: UploadResourceDto,
    @UploadedFile() file: UploadedFileData | undefined,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.repository.upload(dto, file, user);
  }

  @Roles('ADMIN')
  @Patch(':id/review')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewResourceDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.repository.review(id, dto, user);
  }

  @HttpCode(204)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() { user }: AuthenticatedRequest) {
    await this.repository.remove(id, user);
  }
}
