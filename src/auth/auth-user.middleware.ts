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
    rememberMe?: boolean;
  };
};

type SessionPayload = {
  sub: number;
  email?: string;
  nickname?: string;
  rolGlobal?: RolGlobal;
  rememberMe?: boolean;
};

@Injectable()
export class AuthUserMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private getBearerToken(req: AuthenticatedRequest) {
    return req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
  }

  private getAccessToken(req: AuthenticatedRequest) {
    return (
      req.cookies?.access_token ??
      req.cookies?.accessToken ??
      this.getBearerToken(req)
    );
  }

  private getRefreshToken(req: AuthenticatedRequest) {
    return req.cookies?.refresh_token ?? req.cookies?.refreshToken;
  }

  private async setRequestUser(
    req: AuthenticatedRequest,
    payload: SessionPayload,
  ) {
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
      return;
    }

    req.user = {
      id: usuario.id,
      sub: usuario.id,
      email: usuario.email,
      nickname: usuario.nickname,
      rolGlobal: usuario.rolGlobal,
      isAdmin: usuario.rolGlobal === RolGlobal.ADMIN,
      rememberMe: payload.rememberMe === true,
    };
  }

  private async tryAccessToken(req: AuthenticatedRequest) {
    const token = this.getAccessToken(req);
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

    if (!token || !secret) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<SessionPayload>(token, {
        secret,
      });
      await this.setRequestUser(req, payload);
      return Boolean(req.user);
    } catch {
      return false;
    }
  }

  private async tryRefreshToken(req: AuthenticatedRequest) {
    const token = this.getRefreshToken(req);
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!token || !secret) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<SessionPayload>(token, {
        secret,
      });
      await this.setRequestUser(req, payload);
      return Boolean(req.user);
    } catch {
      return false;
    }
  }

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    await this.tryAccessToken(req);

    if (!req.user) {
      await this.tryRefreshToken(req);
    }

    next();
  }
}
