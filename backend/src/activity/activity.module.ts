import { Controller, Get, Global, Module, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { CoursesModule } from '../courses/courses.module';
import { ActivityService } from './activity.service';

class ActivityQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@Controller()
class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  /** Administración: bitácora completa. */
  @Roles('ADMIN')
  @Get('activity')
  list(@Query() query: ActivityQuery) {
    return this.activity.list(query);
  }

  /** Docente: actividad de su clase. */
  @Roles('TEACHER', 'ADMIN')
  @Get('courses/:courseId/activity')
  forCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: ActivityQuery,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.activity.forCourse(courseId, user, query.page);
  }
}

/** Global: cualquier módulo registra actividad con ActivityService.log(). */
@Global()
@Module({
  imports: [CoursesModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
