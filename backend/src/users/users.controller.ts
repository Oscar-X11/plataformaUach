import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Genera una contraseña temporal para un usuario que olvidó la suya. */
  @HttpCode(200)
  @Post(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.resetPassword(id);
  }
}
