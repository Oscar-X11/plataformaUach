import { Controller, Delete, Get, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskUpload } from '../files/disk-upload';
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
  @UseInterceptors(FileInterceptor('file', diskUpload(2 * MB)))
  setAvatar(@UploadedFile() file: UploadedFileData, @Req() { user }: AuthenticatedRequest) {
    return this.profile.setAvatar(user.sub, file);
  }

  @Delete('avatar')
  removeAvatar(@Req() { user }: AuthenticatedRequest) {
    return this.profile.removeAvatar(user.sub);
  }
}
