import { Controller, Delete, Get, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { MB, type UploadedFileData } from '../files/upload';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@Req() { user }: AuthenticatedRequest) {
    return this.profile.get(user.sub);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * MB, files: 1 } }))
  setAvatar(@UploadedFile() file: UploadedFileData, @Req() { user }: AuthenticatedRequest) {
    return this.profile.setAvatar(user.sub, file);
  }

  @Delete('avatar')
  removeAvatar(@Req() { user }: AuthenticatedRequest) {
    return this.profile.removeAvatar(user.sub);
  }
}
