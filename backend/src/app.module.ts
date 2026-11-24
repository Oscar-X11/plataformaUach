import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { UploadCleanupInterceptor } from './files/upload-cleanup.interceptor';
import { createObserveModule } from '@nestjs/observe';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcademicModule } from './academic/academic.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ClassworkModule } from './classwork/classwork.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { FilesModule } from './files/files.module';
import { GroupsModule } from './groups/groups.module';
import { MaterialsModule } from './materials/materials.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { ReportsModule } from './reports/reports.module';
import { RepositoryModule } from './repository/repository.module';
import { StreamModule } from './stream/stream.module';
import { UsersModule } from './users/users.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    // Límite general: 120 peticiones por minuto por IP.
    // THROTTLE_DISABLED=true solo lo usan las pruebas e2e (inician sesión muchas veces seguidas).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true' && process.env.NODE_ENV === 'test',
    }),
    DatabaseModule,
    AuthModule,
    AcademicModule,
    CoursesModule,
    ClassworkModule,
    QuizzesModule,
    NotificationsModule,
    StreamModule,
    ProfileModule,
    DashboardModule,
    MaterialsModule,
    RepositoryModule,
    GroupsModule,
    ReportsModule,
    FilesModule,
    UsersModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [
    // El orden importa: límite de peticiones → autenticación → roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: UploadCleanupInterceptor },
  ],
})
export class AppModule {}
