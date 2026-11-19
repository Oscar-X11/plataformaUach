import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { CreateStaffDto, ListUsersQuery, UpdateStatusDto } from './dto/users.dto';
import { UsersService } from './users.service';

/** Administración de cuentas (solo ADMIN). */
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post()
  createStaff(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() { user }: AuthenticatedRequest,
  ) {
    return this.users.setStatus(id, dto.status, user.sub);
  }

  /** Genera una contraseña temporal para un usuario que olvidó la suya. */
  @HttpCode(200)
  @Post(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.resetPassword(id);
  }
}
