import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email?: string;
    nickname?: string;
  };
};

@Injectable()
export class AuthUserMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const token =
      req.cookies?.access_token ?? req.cookies?.accessToken ?? bearerToken;

    if (!token) {
      return next();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
        nickname?: string;
      }>(token, {
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      });

      req.user = {
        id: payload.sub,
        email: payload.email,
        nickname: payload.nickname,
      };
    } catch {
      // Dejamos req.user vacío para que cada endpoint decida si requiere auth.
    }

    next();
  }
}
