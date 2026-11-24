import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { AssignCareerDto, CreateStaffDto, ImportStudentsDto, ListUsersQuery, UpdateStatusDto } from './dto/users.dto';
import { ActivityService } from '../activity/activity.service';
import { UsersService } from './users.service';

const STATUS_TEXT: Record<string, string> = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  GRADUATED: 'egresado',
};

/** Administración de cuentas (solo ADMIN). */
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly activity: ActivityService,
  ) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post()
  async createStaff(@Body() dto: CreateStaffDto, @Req() { user }: AuthenticatedRequest) {
    const result = await this.users.createStaff(dto);
    this.activity.log({
      userId: user.sub,
      action: 'USER_CREATED',
      summary: `Dio de alta a ${result.user.fullName} (${result.user.username}, ${dto.role === 'ADMIN' ? 'administrador' : 'docente'})`,
    });
    return result;
  }

  /** Importa alumnos desde el Excel (vista previa con dryRun: true). */
  @HttpCode(200)
  @Post('import-students')
  async importStudents(@Body() dto: ImportStudentsDto, @Req() { user }: AuthenticatedRequest) {
    const result = await this.users.importStudents(dto);
    const created = result.rows.filter((row) => row.status === 'created').length;
    if (!dto.dryRun && created > 0) {
      this.activity.log({
        userId: user.sub,
        action: 'STUDENTS_IMPORTED',
        summary: `Importó ${created} ${created === 1 ? 'alumno' : 'alumnos'} desde Excel`,
      });
    }
    return result;
  }

  /** Asigna la carrera a varios alumnos (p. ej. los importados del Excel). */
  @Patch('career')
  assignCareer(@Body() dto: AssignCareerDto) {
    return this.users.assignCareer(dto);
  }

  @Patch(':id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    const updated = await this.users.setStatus(id, dto.status, user.sub);
    this.activity.log({
      userId: user.sub,
      action: 'USER_STATUS',
      summary: `Cambió el estado de ${updated.fullName} (${updated.username}) a ${STATUS_TEXT[dto.status] ?? dto.status}`,
    });
    return updated;
  }

  /** Genera una contraseña temporal para un usuario que olvidó la suya. */
  @HttpCode(200)
  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Req() { user }: AuthenticatedRequest) {
    const result = await this.users.resetPassword(id);
    this.activity.log({
      userId: user.sub,
      action: 'PASSWORD_RESET',
      summary: `Restableció la contraseña de ${result.user.fullName} (${result.user.username})`,
    });
    return result;
  }
}
