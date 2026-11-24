import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AvailabilityService } from './availability.service';
import { CourseAccessService } from './course-access.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [FilesModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessService, AvailabilityService],
  // Tareas, entregas y tablón validan la pertenencia con CourseAccessService.
  exports: [CourseAccessService, AvailabilityService],
})
export class CoursesModule {}
