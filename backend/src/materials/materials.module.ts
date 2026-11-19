import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { FilesModule } from '../files/files.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [CoursesModule, FilesModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
