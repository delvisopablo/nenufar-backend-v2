import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EstadoCuenta, RolGlobal } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

type JwtAccessPayload = {
  sub?: number;
  email?: string;
  nickname?: string;
  rolGlobal?: RolGlobal;
};

type RequestWithCookies = Request & {
  cookies?: {
    access_token?: string;
    accessToken?: string;
  };
};

function fromAccessCookie(req: RequestWithCookies) {
  return req?.cookies?.access_token ?? req?.cookies?.accessToken ?? null;
}

function getAccessSecret() {
  const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
  const legacySecret = process.env.JWT_SECRET?.trim();
  const secret = accessSecret || legacySecret;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET o JWT_SECRET no configurado');
  }

  return secret;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromAccessCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: getAccessSecret(),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtAccessPayload) {
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
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

    return {
      id: usuario.id,
      sub: usuario.id,
      email: usuario.email,
      nickname: usuario.nickname,
      rolGlobal: usuario.rolGlobal,
      isAdmin: usuario.rolGlobal === RolGlobal.ADMIN,
    };
  }
}
