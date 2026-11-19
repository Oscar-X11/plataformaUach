import { Module } from '@nestjs/common';
import { CourseAccessService } from './course-access.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessService],
  // Tareas, entregas y tablón validan la pertenencia con CourseAccessService.
  exports: [CourseAccessService],
})
export class CoursesModule {}
