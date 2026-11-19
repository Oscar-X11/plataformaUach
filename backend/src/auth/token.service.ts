import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { EnvironmentVariables } from '../config/env.validation';

export const SESSION_COOKIE = 'uach_session';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  sign(payload: TokenPayload) {
    const token = jwt.sign(payload, this.secret, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', {
        infer: true,
      }) as SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * 1000) };
  }

  verify(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return null;
      }
      return {
        sub: payload.sub,
        email: payload.email as string,
        role: payload.role as UserRole,
      };
    } catch {
      return null;
    }
  }

  private get secret() {
    return this.config.get('JWT_SECRET', { infer: true });
  }
}
