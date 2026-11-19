import { Controller, Get, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles('STUDENT')
  @Get('student')
  student(@Req() { user }: AuthenticatedRequest) {
    return this.dashboard.student(user);
  }

  @Roles('TEACHER')
  @Get('teacher')
  teacher(@Req() { user }: AuthenticatedRequest) {
    return this.dashboard.teacher(user);
  }

  @Roles('ADMIN')
  @Get('admin')
  admin() {
    return this.dashboard.admin();
  }
}
