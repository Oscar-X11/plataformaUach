import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionStateService } from './session-state.service';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, SessionStateService],
  exports: [TokenService, SessionStateService],
})
export class AuthModule {}
