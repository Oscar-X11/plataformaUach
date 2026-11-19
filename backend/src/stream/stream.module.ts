import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';

@Module({
  imports: [CoursesModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
