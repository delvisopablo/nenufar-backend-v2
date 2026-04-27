import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { StructuredLogger } from '../common/logger/structured-logger';
import { RequestWithContext } from '../common/middleware/request-context.middleware';

type AuthenticatedRequest = RequestWithContext &
  Request & {
  user?: {
    id: number;
    sub: number;
    email?: string;
  };
  usuario?: {
    id: number;
    email?: string;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
      }>(token, {
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      });
      request.user = { id: payload.sub, sub: payload.sub, email: payload.email };
      request.usuario = { id: payload.sub, email: payload.email };
      return true;
    } catch (err: any) {
      StructuredLogger.warn('invalid_access_token', {
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        reason: err?.message,
      });
      throw new UnauthorizedException('Token inválido');
    }
  }
}
