import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Throttle } from '@nestjs/throttler';
import { ErrorSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth-request';
import { ErrorCaptureFilter } from './error-capture.filter';
import { ErrorsService } from './errors.service';

class ReportProblemDto {
  @IsString()
  @MinLength(10, { message: 'Cuéntanos un poco más (al menos 10 caracteres)' })
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  path?: string;
}

/** Error de una pantalla, enviado por el navegador (error.tsx). */
class ClientErrorDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  digest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  path?: string;
}

class ErrorsQuery {
  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: 'open' | 'resolved';

  @IsOptional()
  @IsEnum(ErrorSource)
  source?: ErrorSource;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

class ResolveErrorDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

@Controller('errors')
class ErrorsController {
  constructor(private readonly errors: ErrorsService) {}

  /** Cualquier usuario con sesión reporta un problema. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('report')
  report(@Body() dto: ReportProblemDto, @Req() request: AuthenticatedRequest) {
    return this.errors.report(
      { message: dto.message, path: dto.path, userAgent: request.headers['user-agent'] },
      request.user,
    );
  }

  /** El navegador avisa que una pantalla falló. Responde sin esperar a guardarlo. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('client')
  client(@Body() dto: ClientErrorDto, @Req() request: AuthenticatedRequest) {
    void this.errors.capture({
      source: 'CLIENT',
      message: dto.message,
      detail: [dto.digest ? `Ref: ${dto.digest}` : null, dto.stack].filter(Boolean).join('\n') || null,
      path: dto.path,
      userId: request.user.sub,
      userAgent: request.headers['user-agent'],
    });
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get()
  list(@Query() query: ErrorsQuery) {
    return this.errors.list(query);
  }

  @Roles('ADMIN')
  @Patch(':id/resolve')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveErrorDto) {
    return this.errors.resolve(id, dto.note);
  }
}

/** Errores del sistema y reportes de usuarios para el administrador. */
@Module({
  controllers: [ErrorsController],
  providers: [ErrorsService, { provide: APP_FILTER, useClass: ErrorCaptureFilter }],
})
export class ErrorsModule {}
