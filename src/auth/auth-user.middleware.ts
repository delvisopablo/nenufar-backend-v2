import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EstadoCuenta, RolGlobal } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    sub?: number;
    email?: string;
    nickname?: string;
    rolGlobal?: RolGlobal;
    isAdmin?: boolean;
  };
};

@Injectable()
export class AuthUserMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
        rolGlobal?: RolGlobal;
      }>(token, {
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      });

      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          nickname: true,
          rolGlobal: true,
          estadoCuenta: true,
          eliminadoEn: true,
        },
      });

      if (
        !usuario ||
        usuario.eliminadoEn ||
        usuario.estadoCuenta === EstadoCuenta.ELIMINADA
      ) {
        return next();
      }

      req.user = {
        id: usuario.id,
        sub: usuario.id,
        email: usuario.email,
        nickname: usuario.nickname,
        rolGlobal: usuario.rolGlobal,
        isAdmin: usuario.rolGlobal === RolGlobal.ADMIN,
      };
    } catch {
      // Dejamos req.user vacío para que cada endpoint decida si requiere auth.
    }

    next();
  }
}
