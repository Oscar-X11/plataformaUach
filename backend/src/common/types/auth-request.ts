import { Request } from 'express';
import { TokenPayload } from '../../auth/token.service';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}
