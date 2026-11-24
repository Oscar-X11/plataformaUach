import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AllowPendingPassword } from '../common/decorators/allow-pending-password.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SESSION_COOKIE, TokenService } from './token.service';

/** Máximo 5 intentos por minuto por IP en login, registro y cambio de contraseña. */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokens: TokenService,
  ) {}

  // No hay registro abierto: las cuentas de alumnos solo se crean al importar el
  // Excel de la universidad (POST /users/import-students) y las de personal, desde
  // la administración. Así nadie puede apropiarse de la matrícula de otro alumno.

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.login(dto);
    this.setSessionCookie(res, session.accessToken, session.expiresAt);
    return session;
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @AllowPendingPassword()
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user.sub);
  }

  /** Cambio de contraseña propia (también para salir de una contraseña temporal). */
  @AllowPendingPassword()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.changePassword(request.user.sub, dto);
    this.setSessionCookie(res, session.accessToken, session.expiresAt);
    return session;
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE, token, this.tokens.cookieOptions(expiresAt));
  }

  private cookieOptions(): CookieOptions {
    return this.tokens.cookieOptions();
  }
}
