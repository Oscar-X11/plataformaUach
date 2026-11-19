import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { FilesModule } from '../files/files.module';
import { AssignmentsService } from './assignments.service';
import { ClassworkController } from './classwork.controller';
import { GradesService } from './grades.service';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [CoursesModule, FilesModule],
  controllers: [ClassworkController],
  providers: [AssignmentsService, SubmissionsService, GradesService],
  exports: [AssignmentsService],
})
export class ClassworkModule {}
