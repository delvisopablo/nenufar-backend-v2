/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */

//
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    sub?: number;
    email?: string;
    nickname?: string;
  };
};

const authUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
  foto: true,
  biografia: true,
  creadoEn: true,
  actualizadoEn: true,
  emailVerificado: true,
  estadoCuenta: true,
  rolGlobal: true,
  petalosSaldo: true,
  negocios: {
    where: { eliminadoEn: null },
    orderBy: { creadoEn: 'asc' },
    take: 1,
    select: {
      id: true,
      nombre: true,
      horario: true,
    },
  },
} satisfies Prisma.UsuarioSelect;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const registerUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
} satisfies Prisma.UsuarioSelect;

const loginUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
  password: true,
} satisfies Prisma.UsuarioSelect;

type AuthUserRecord = Prisma.UsuarioGetPayload<{ select: typeof authUserSelect }>;
type RegisterUserRecord = Prisma.UsuarioGetPayload<{ select: typeof registerUserSelect }>;

function parseTTL(s?: string, fallbackSeconds = 900) {
  if (!s) return fallbackSeconds;
  if (s.endsWith('s')) return parseInt(s, 10);
  if (s.endsWith('m')) return parseInt(s, 10) * 60;
  if (s.endsWith('h')) return parseInt(s, 10) * 3600;
  if (s.endsWith('d')) return parseInt(s, 10) * 86400;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallbackSeconds;
}

function normalizeRequiredString(value: unknown, fieldLabel: string) {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldLabel} es obligatorio`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException(`${fieldLabel} es obligatorio`);
  }

  return normalized;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private cookieOpts(ttlSeconds: number): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: ttlSeconds * 1000,
      path: '/',
    };

    if (cookieDomain) {
      options.domain = cookieDomain;
    }

    return options;
  }

  private clearCookieOpts(): CookieOptions {
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
    const options: CookieOptions = { path: '/' };

    if (cookieDomain) {
      options.domain = cookieDomain;
    }

    return options;
  }

  private getJwtSecrets() {
    const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
    const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException(
        'Configuración JWT incompleta en el servidor',
      );
    }

    return { accessSecret, refreshSecret };
  }

  private async signTokens(user: {
    id: number;
    email: string;
    nickname: string;
  }) {
    const { accessSecret, refreshSecret } = this.getJwtSecrets();
    const accessTTL = parseTTL(process.env.JWT_ACCESS_TTL, 900);
    const refreshTTL = parseTTL(process.env.JWT_REFRESH_TTL, 60 * 60 * 24 * 30);

    const access = await this.jwt.signAsync(
      { sub: user.id, email: user.email, nickname: user.nickname },
      { secret: accessSecret, expiresIn: accessTTL },
    );
    const refresh = await this.jwt.signAsync(
      { sub: user.id, email: user.email, nickname: user.nickname },
      { secret: refreshSecret, expiresIn: refreshTTL },
    );
    return { access, refresh, accessTTL, refreshTTL };
  }

  private setSessionCookies(
    res: Response,
    tokens: Awaited<ReturnType<AuthService['signTokens']>>,
  ) {
    res.cookie('access_token', tokens.access, this.cookieOpts(tokens.accessTTL));
    res.cookie('refresh_token', tokens.refresh, this.cookieOpts(tokens.refreshTTL));
  }

  private toBasicAuthUser(user: RegisterUserRecord) {
    return {
      id: user.id,
      nombre: user.nombre,
      nickname: user.nickname,
      email: user.email,
    };
  }

  private toPublicAuthUser(user: AuthUserRecord) {
    const negocio = user.negocios[0] ?? null;

    return {
      id: user.id,
      nombre: user.nombre,
      nickname: user.nickname,
      email: user.email,
      foto: user.foto,
      foto_perfil: user.foto,
      biografia: user.biografia,
      creadoEn: user.creadoEn,
      actualizadoEn: user.actualizadoEn,
      emailVerificado: user.emailVerificado,
      estadoCuenta: user.estadoCuenta,
      rolGlobal: user.rolGlobal,
      rol: negocio ? 'negocio' : user.rolGlobal.toLowerCase(),
      petalosSaldo: user.petalosSaldo,
      negocio,
    };
  }

  private getRequestUser(req: AuthenticatedRequest) {
    const userId = Number(req.user?.id ?? req.user?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException();
    }

    return {
      id: userId,
      email: req.user?.email,
      nickname: req.user?.nickname,
    };
  }

  async register(dto: RegisterDto, res: Response) {
    const normalizedName = normalizeRequiredString(dto.nombre, 'El nombre');
    const normalizedEmail = normalizeRequiredString(
      dto.email,
      'El email',
    ).toLowerCase();
    const normalizedNickname = normalizeRequiredString(
      dto.nickname,
      'El nickname',
    );
    const normalizedBiografia = normalizeOptionalString(dto.biografia);
    const normalizedFoto = normalizeOptionalString(dto.fotoPerfil);

    const exists = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { nickname: normalizedNickname }],
      },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });

    if (exists) {
      throw new ConflictException('Email o nickname ya en uso');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.usuario.create({
        data: {
          nombre: normalizedName,
          nickname: normalizedNickname,
          email: normalizedEmail,
          password: hash,
          ...(normalizedBiografia !== undefined
            ? { biografia: normalizedBiografia }
            : {}),
          ...(normalizedFoto !== undefined ? { foto: normalizedFoto } : {}),
        },
        select: registerUserSelect,
      });

      const tokens = await this.signTokens({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      });

      this.setSessionCookies(res, tokens);

      return {
        usuario: this.toBasicAuthUser(user),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email o nickname ya en uso');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, res: Response) {
    const email = normalizeRequiredString(dto.email, 'El email').toLowerCase();
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      select: loginUserSelect,
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...publicUser } = user;
    const tokens = await this.signTokens({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    this.setSessionCookies(res, tokens);

    await this.prisma.usuario
      .update({
        where: { id: user.id },
        data: { ultimoLoginEn: new Date() },
      })
      .catch(() => undefined);

    return {
      id: publicUser.id,
      nombre: publicUser.nombre,
      nickname: publicUser.nickname,
      email: publicUser.email,
    };
  }

  async refresh(req: AuthenticatedRequest, res: Response) {
    const payload = this.getRequestUser(req);
    if (!payload.email || !payload.nickname) {
      throw new UnauthorizedException();
    }

    const { access, refresh, accessTTL, refreshTTL } = await this.signTokens({
      id: payload.id,
      email: payload.email,
      nickname: payload.nickname,
    });

    res.cookie('access_token', access, this.cookieOpts(accessTTL));
    res.cookie('refresh_token', refresh, this.cookieOpts(refreshTTL));

    return { ok: true };
  }

  logout(res: Response) {
    const cookieOptions = this.clearCookieOpts();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return { ok: true };
  }

  async me(req: AuthenticatedRequest) {
    const payload = this.getRequestUser(req);
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.id },
      select: authUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toPublicAuthUser(user);
  }
}
