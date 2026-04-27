/* eslint-disable prettier/prettier */

//
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions, Request, Response } from 'express';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { RegisterNegocioDto } from './dto/register-negocio.dto';

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

const welcomeEmailUserSelect = {
  id: true,
  nombre: true,
  email: true,
  welcomeEmailSentAt: true,
} satisfies Prisma.UsuarioSelect;

type AuthUserRecord = Prisma.UsuarioGetPayload<{ select: typeof authUserSelect }>;
type RegisterUserRecord = Prisma.UsuarioGetPayload<{ select: typeof registerUserSelect }>;
type WelcomeEmailUserRecord = Prisma.UsuarioGetPayload<{
  select: typeof welcomeEmailUserSelect;
}>;
type RegisterNegocioResult = {
  user: {
    id: number;
    nombre: string;
    nickname: string;
    email: string;
  };
  negocio: {
    id: number;
    nombre: string;
    horario: Prisma.JsonValue | null;
  };
};
type OneTimeTokenType = 'verify-email' | 'reset-password';
const welcomeEmailLockNamespace = 4042;

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

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
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

  private getOneTimeTokenSecret(type: OneTimeTokenType) {
    const specificSecret =
      type === 'verify-email'
        ? process.env.JWT_VERIFY_EMAIL_SECRET?.trim()
        : process.env.JWT_RESET_PASSWORD_SECRET?.trim();

    return (
      specificSecret ||
      process.env.JWT_ACCESS_SECRET?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      (() => {
        throw new InternalServerErrorException(
          'Configuración JWT incompleta en el servidor',
        );
      })()
    );
  }

  private async signOneTimeToken(
    type: OneTimeTokenType,
    user: { id: number; email: string; nickname?: string },
  ) {
    const secret = this.getOneTimeTokenSecret(type);
    const expiresIn =
      type === 'verify-email'
        ? process.env.JWT_VERIFY_EMAIL_TTL ?? '7d'
        : process.env.JWT_RESET_PASSWORD_TTL ?? '1h';

    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        type,
      },
      {
        secret,
        expiresIn,
      },
    );
  }

  private async verifyOneTimeToken(token: string, expectedType: OneTimeTokenType) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: number;
        email?: string;
        type?: OneTimeTokenType;
      }>(token, {
        secret: this.getOneTimeTokenSecret(expectedType),
      });

      if (!payload.sub || payload.type !== expectedType) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
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

  private async sendWelcomeEmailIfNeeded(userId: number) {
    if (!this.emailService.isEnabled()) {
      return;
    }

    try {
      let wasAlreadySent = false;
      let wasSent = false;

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(${welcomeEmailLockNamespace}, ${userId})
        `;

        const user: WelcomeEmailUserRecord | null = await tx.usuario.findUnique({
          where: { id: userId },
          select: welcomeEmailUserSelect,
        });

        if (!user) {
          return;
        }

        if (user.welcomeEmailSentAt) {
          wasAlreadySent = true;
          return;
        }

        await this.emailService.sendWelcomeEmail(user.email, user.nombre);

        await tx.usuario.update({
          where: { id: user.id },
          data: { welcomeEmailSentAt: new Date() },
        });

        wasSent = true;
      });

      if (wasAlreadySent) {
        this.logger.log(
          `Welcome email ya enviado previamente al usuario ${userId}`,
        );
      }

      if (wasSent) {
        this.logger.log(
          `Welcome email enviado correctamente al usuario ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Fallo enviando welcome email al usuario ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async findOrCreateCategoriaByName(
    tx: Prisma.TransactionClient,
    categoriaNombre: string,
  ) {
    const existingCategoria = await tx.categoria.findFirst({
      where: {
        nombre: {
          equals: categoriaNombre,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    if (existingCategoria) {
      return existingCategoria;
    }

    try {
      return await tx.categoria.create({
        data: {
          nombre: categoriaNombre,
        },
        select: {
          id: true,
          nombre: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const categoria = await tx.categoria.findFirst({
          where: {
            nombre: {
              equals: categoriaNombre,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            nombre: true,
          },
        });

        if (categoria) {
          return categoria;
        }
      }

      throw error;
    }
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

      const verificationToken = await this.signOneTimeToken('verify-email', {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      });

      return {
        usuario: this.toBasicAuthUser(user),
        verificationToken,
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

  async registerNegocio(dto: RegisterNegocioDto, res: Response) {
    const normalizedOwnerName = normalizeRequiredString(
      dto.nombreDueno,
      'El nombre del dueño',
    );
    const normalizedNickname = normalizeRequiredString(
      dto.nickname,
      'El nickname',
    );
    const normalizedEmail = normalizeRequiredString(
      dto.email,
      'El email',
    ).toLowerCase();
    const normalizedBusinessName = normalizeRequiredString(
      dto.nombreNegocio,
      'El nombre del negocio',
    );
    const normalizedCategoriaNombre = normalizeRequiredString(
      dto.categoriaNombre,
      'La categoría',
    );
    const normalizedDireccion = normalizeOptionalString(dto.direccion);
    const normalizedHistoria = normalizeOptionalString(dto.historia);
    const fechaFundacion = new Date(dto.fechaFundacion);

    if (Number.isNaN(fechaFundacion.getTime())) {
      throw new BadRequestException('La fecha de fundación no es válida');
    }

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
      const result = await this.prisma.$transaction<RegisterNegocioResult>(
        async (tx) => {
          const categoria = await this.findOrCreateCategoriaByName(
            tx,
            normalizedCategoriaNombre,
          );

          const user = await tx.usuario.create({
            data: {
              nombre: normalizedOwnerName,
              nickname: normalizedNickname,
              email: normalizedEmail,
              password: hash,
              ultimoLoginEn: new Date(),
            },
            select: {
              id: true,
              nombre: true,
              nickname: true,
              email: true,
            },
          });

          const negocio = await tx.negocio.create({
            data: {
              nombre: normalizedBusinessName,
              historia: normalizedHistoria,
              direccion: normalizedDireccion,
              fechaFundacion,
              categoriaId: categoria.id,
              duenoId: user.id,
            },
            select: {
              id: true,
              nombre: true,
              horario: true,
            },
          });

          await tx.negocioMiembro.create({
            data: {
              negocioId: negocio.id,
              usuarioId: user.id,
              rol: 'DUENO',
            },
          });

          return { user, negocio };
        },
      );

      const tokens = await this.signTokens({
        id: result.user.id,
        email: result.user.email,
        nickname: result.user.nickname,
      });

      this.setSessionCookies(res, tokens);

      return {
        access_token: tokens.access,
        usuario: {
          id: result.user.id,
          nombre: result.user.nombre,
          nickname: result.user.nickname,
          email: result.user.email,
          rol: 'negocio',
          negocio: result.negocio,
        },
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

    await this.sendWelcomeEmailIfNeeded(user.id);

    

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

  async verifyEmail(dto: VerifyEmailDto) {
    const payload = await this.verifyOneTimeToken(dto.token, 'verify-email');

    const user = await this.prisma.usuario.update({
      where: { id: payload.sub },
      data: {
        emailVerificado: true,
        verificadoEn: new Date(),
      },
      select: {
        id: true,
        email: true,
        emailVerificado: true,
        verificadoEn: true,
      },
    });

    return { ok: true, usuario: user };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, nickname: true },
    });

    if (!user) {
      return { ok: true };
    }

    const resetToken = await this.signOneTimeToken('reset-password', {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    return {
      ok: true,
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const payload = await this.verifyOneTimeToken(dto.token, 'reset-password');
    const hash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.usuario.update({
      where: { id: payload.sub },
      data: { password: hash },
    });

    return { ok: true };
  }
}
