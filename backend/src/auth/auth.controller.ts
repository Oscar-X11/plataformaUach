import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AllowPendingPassword } from '../common/decorators/allow-pending-password.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { EnvironmentVariables } from '../config/env.validation';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SESSION_COOKIE } from './token.service';

/** Máximo 5 intentos por minuto por IP en login, registro y cambio de contraseña. */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(dto);
    this.setSessionCookie(res, session.accessToken, session.expiresAt);
    return session;
  }

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
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    };
  }
}
