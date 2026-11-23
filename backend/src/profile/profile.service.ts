import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../files/storage.service';
import { IMAGE_EXTENSIONS, inspectUpload, MB, UploadedFileData } from '../files/upload';

const MAX_AVATAR_BYTES = 2 * MB;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        faculty: { select: { id: true, name: true } },
        career: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, taughtCourses: true } },
      },
    });
    const { _count, ...rest } = user;
    return { ...rest, courseCount: user.role === 'STUDENT' ? _count.enrollments : _count.taughtCourses };
  }

  async setAvatar(userId: string, file: UploadedFileData | undefined) {
    if (!file) throw new BadRequestException('Selecciona una imagen');
    const info = await inspectUpload(file, IMAGE_EXTENSIONS, MAX_AVATAR_BYTES);
    const avatarUrl = await this.storage.save(`avatars/${userId}`, info.ext, file);
    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    await this.storage.remove(previous.avatarUrl);
    return this.get(userId);
  }

  async removeAvatar(userId: string) {
    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    await this.storage.remove(previous.avatarUrl);
    return this.get(userId);
  }
}
