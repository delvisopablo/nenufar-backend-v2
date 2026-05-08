import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EstadoCuenta, RolGlobal } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../common/middleware/request-context.middleware';

type AuthenticatedRequest = RequestWithContext &
  Request & {
    user?: {
      id: number;
      sub: number;
      email?: string;
      nickname?: string;
      rolGlobal?: RolGlobal;
      isAdmin?: boolean;
    };
    usuario?: {
      id: number;
      email?: string;
    };
  };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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

      if (!usuario) {
        throw new UnauthorizedException('Token inválido');
      }
      if (
        usuario.eliminadoEn ||
        usuario.estadoCuenta === EstadoCuenta.ELIMINADA
      ) {
        throw new UnauthorizedException('Esta cuenta ha sido eliminada.');
      }

      request.user = {
        id: usuario.id,
        sub: usuario.id,
        email: usuario.email,
        nickname: usuario.nickname,
        rolGlobal: usuario.rolGlobal,
        isAdmin: usuario.rolGlobal === RolGlobal.ADMIN,
      };
      request.usuario = { id: usuario.id, email: usuario.email };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido');
    }
  }
}
