import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RequestWithContext } from '../common/middleware/request-context.middleware';

type AuthenticatedRequest = RequestWithContext &
  Request & {
    user?: {
      id: number;
      sub: number;
      email?: string;
      nickname?: string;
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
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;
    const token =
      request.cookies?.access_token ??
      request.cookies?.accessToken ??
      bearerToken;

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
        nickname?: string;
      }>(token, {
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      });
      request.user = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        nickname: payload.nickname,
      };
      request.usuario = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
