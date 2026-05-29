//
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EstadoCuenta, Prisma, RolGlobal } from '@prisma/client';
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
import {
  generateUniqueNegocioSlug,
  slugifyNegocioNombre,
} from '../negocio/negocio-slug.util';
import {
  hasOpenDays,
  HorarioJson,
  normalizeHorarioForRead,
  normalizeHorarioInput,
  summarizeHorarioForLog,
} from '../negocio/horario.util';
import { NenufarizarService } from '../nenufarizar/nenufarizar.service';
import { AppError } from '../common/errors/app-error';

// Cambiar a true para hacer obligatorio el código de nenufarización en el registro de negocio
const CODIGO_NENUFARIZACION_REQUERIDO = false;

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    sub?: number;
    email?: string;
    nickname?: string;
    rolGlobal?: RolGlobal;
    rememberMe?: boolean;
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
  eliminadoEn: true,
  rolGlobal: true,
  petalosSaldo: true,
  negocios: {
    where: { activo: true, eliminadoEn: null },
    orderBy: { creadoEn: 'asc' },
    take: 1,
    select: {
      id: true,
      nombre: true,
      slug: true,
      duenoId: true,
      descripcionCorta: true,
      historia: true,
      direccion: true,
      horario: true,
      intervaloReserva: true,
      reservasActivas: true,
      nenufarColor: true,
      nenufarActivo: true,
      nenufarKey: true,
      nenufarAsset: true,
      categoria: { select: { id: true, nombre: true } },
      subcategoria: { select: { id: true, nombre: true } },
      _count: {
        select: {
          seguidores: true,
          resenas: true,
        },
      },
    },
  },
} satisfies Prisma.UsuarioSelect;

const registerUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
  rolGlobal: true,
} satisfies Prisma.UsuarioSelect;

const loginUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
  password: true,
  foto: true,
  biografia: true,
  creadoEn: true,
  actualizadoEn: true,
  emailVerificado: true,
  estadoCuenta: true,
  eliminadoEn: true,
  rolGlobal: true,
  petalosSaldo: true,
  negocios: {
    where: { activo: true, eliminadoEn: null },
    orderBy: { creadoEn: 'asc' },
    take: 1,
    select: {
      id: true,
      nombre: true,
      slug: true,
      duenoId: true,
      descripcionCorta: true,
      historia: true,
      direccion: true,
      horario: true,
      intervaloReserva: true,
      reservasActivas: true,
      categoria: { select: { id: true, nombre: true } },
      subcategoria: { select: { id: true, nombre: true } },
      nenufarActivo: true,
      nenufarKey: true,
      nenufarAsset: true,
      _count: {
        select: {
          seguidores: true,
          resenas: true,
        },
      },
    },
  },
} satisfies Prisma.UsuarioSelect;

const welcomeEmailUserSelect = {
  id: true,
  nombre: true,
  email: true,
  welcomeEmailSentAt: true,
} satisfies Prisma.UsuarioSelect;

type AuthUserRecord = Prisma.UsuarioGetPayload<{
  select: typeof authUserSelect;
}>;
type RegisterUserRecord = Prisma.UsuarioGetPayload<{
  select: typeof registerUserSelect;
}>;
type RegisterNegocioResult = {
  user: {
    id: number;
    nombre: string;
    nickname: string;
    email: string;
    rolGlobal: RolGlobal;
  };
  negocio: {
    id: number;
    nombre: string;
    slug: string | null;
    horario: Prisma.JsonValue | null;
    intervaloReserva: number | null;
    reservasActivas: boolean;
    nenufarColor: string | null;
    nenufarActivo: string | null;
    nenufarAsset: string | null;
  };
};
type OneTimeTokenType = 'verify-email' | 'reset-password';
type SessionTokenType = 'access' | 'refresh';
type SessionTokenPayload = {
  sub: number;
  email?: string;
  nickname?: string;
  rolGlobal?: RolGlobal;
  rememberMe?: boolean;
};
type ResolvedRequestUser = {
  id: number;
  email: string;
  nickname: string;
  rolGlobal: RolGlobal;
  rememberMe: boolean;
};
type LoginIdentifier = {
  raw: string;
  type: 'email' | 'nickname';
  value: string;
};

function parseTTL(s?: string, fallbackSeconds = 900) {
  if (!s) return fallbackSeconds;
  if (s.endsWith('s')) return parseInt(s, 10);
  if (s.endsWith('m')) return parseInt(s, 10) * 60;
  if (s.endsWith('h')) return parseInt(s, 10) * 3600;
  if (s.endsWith('d')) return parseInt(s, 10) * 86400;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallbackSeconds;
}

function parseRefreshTTL(rememberMe?: boolean) {
  if (rememberMe) {
    return parseTTL(
      process.env.JWT_REFRESH_REMEMBER_TTL ??
        process.env.JWT_REMEMBER_ME_REFRESH_TTL,
      60 * 60 * 24 * 30,
    );
  }

  return parseTTL(process.env.JWT_REFRESH_TTL, 60 * 60 * 24 * 30);
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

function isDeletedAccount(user: {
  eliminadoEn?: Date | null;
  estadoCuenta?: EstadoCuenta | null;
}) {
  return (
    Boolean(user.eliminadoEn) || user.estadoCuenta === EstadoCuenta.ELIMINADA
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
    private readonly nenufarizarService: NenufarizarService,
  ) {}

  private normalizeHorarioPayload(horario: unknown) {
    if (horario === undefined) {
      return undefined;
    }

    return normalizeHorarioInput(horario);
  }

  private toPrismaHorarioValue(horario: HorarioJson | null) {
    return horario === null
      ? Prisma.JsonNull
      : (horario as Prisma.InputJsonValue);
  }

  private cleanHorarioForResponse(horario: unknown) {
    return normalizeHorarioForRead(horario);
  }

  private assertReservasConfig(
    reservasActivas: boolean,
    intervaloReserva?: number | null,
    horario?: HorarioJson | null,
  ) {
    if (!reservasActivas) {
      return;
    }

    if (!intervaloReserva || intervaloReserva <= 0) {
      throw new BadRequestException(
        'Si las reservas estan activas, intervaloReserva debe ser positivo',
      );
    }

    if (!horario || !hasOpenDays(horario)) {
      throw new BadRequestException(
        'Si las reservas estan activas, debe haber al menos un dia abierto',
      );
    }
  }

  private logHorarioDebug(
    action: string,
    horario: unknown,
    options: {
      negocioId?: number;
      provided?: boolean;
      intervaloReserva?: number | null;
      reservasActivas?: boolean;
    } = {},
  ) {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }

    this.logger.debug(
      `[${action}] horario negocioId=${options.negocioId ?? 'pending'} provided=${String(options.provided ?? true)} ${summarizeHorarioForLog(horario)} intervaloReserva=${options.intervaloReserva ?? 'null'} reservasActivas=${String(options.reservasActivas ?? false)}`,
    );
  }

  private getCookieBaseOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    };

    if (cookieDomain) {
      options.domain = cookieDomain;
    }

    return options;
  }

  private async getCurrentAuthUser(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        estadoCuenta: true,
        eliminadoEn: true,
        rolGlobal: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (isDeletedAccount(user)) {
      throw new UnauthorizedException('Esta cuenta ha sido eliminada.');
    }

    return user;
  }

  private resolveLoginIdentifier(dto: LoginDto): LoginIdentifier {
    const rawIdentifier =
      normalizeOptionalString(dto.identifier) ??
      normalizeOptionalString(dto.email) ??
      normalizeOptionalString(dto.nickname);

    if (!rawIdentifier) {
      throw new BadRequestException('El email o nickname es obligatorio');
    }

    if (rawIdentifier.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier)) {
        throw new BadRequestException('El email no es válido');
      }

      return {
        raw: rawIdentifier,
        type: 'email',
        value: rawIdentifier.toLowerCase(),
      };
    }

    return {
      raw: rawIdentifier,
      type: 'nickname',
      value: rawIdentifier,
    };
  }

  private maskLoginIdentifier(identifier: string) {
    const normalized = identifier.trim();

    if (!normalized) {
      return 'empty';
    }

    if (normalized.includes('@')) {
      const [localPart = '', domainPart = ''] = normalized.split('@', 2);
      const maskedLocal =
        localPart.length <= 2
          ? `${localPart.slice(0, 1)}***`
          : `${localPart.slice(0, 2)}***`;
      const maskedDomain =
        domainPart.length <= 2
          ? `${domainPart.slice(0, 1)}***`
          : `${domainPart.slice(0, 2)}***`;

      return `${maskedLocal}@${maskedDomain}`;
    }

    return normalized.length <= 2
      ? `${normalized.slice(0, 1)}***`
      : `${normalized.slice(0, 2)}***`;
  }

  private logFailedLoginAttempt(
    identifier: LoginIdentifier,
    reason: 'password_mismatch' | 'user_not_found',
  ) {
    this.logger.warn(
      `[login] intento fallido reason=${reason} via=${identifier.type} identifier=${this.maskLoginIdentifier(identifier.raw)}`,
    );
  }

  private cookieOpts(ttlSeconds: number): CookieOptions {
    return {
      ...this.getCookieBaseOptions(),
      maxAge: ttlSeconds * 1000,
    };
  }

  private clearCookieOpts(): CookieOptions {
    return this.getCookieBaseOptions();
  }

  private clearSessionCookies(res?: Response) {
    if (!res) {
      return;
    }

    const cookieOptions = this.clearCookieOpts();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
  }

  // private getJwtSecrets() {
  //   const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
  //   const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();

  //   if (!accessSecret || !refreshSecret) {
  //     throw new InternalServerErrorException(
  //       'Configuración JWT incompleta en el servidor',
  //     );
  //   }

  //   return { accessSecret, refreshSecret };
  // }

  private getJwtSecrets() {
    const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
    const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();

    const missing: string[] = [];

    if (!accessSecret) missing.push('JWT_ACCESS_SECRET');
    if (!refreshSecret) missing.push('JWT_REFRESH_SECRET');

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración JWT incompleta en el servidor. Faltan: ${missing.join(', ')}`,
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
        ? (process.env.JWT_VERIFY_EMAIL_TTL ?? '7d')
        : (process.env.JWT_RESET_PASSWORD_TTL ?? '1h');

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

  private async verifyOneTimeToken(
    token: string,
    expectedType: OneTimeTokenType,
  ) {
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

  private async signTokens(
    user: {
      id: number;
      email: string;
      nickname: string;
      rolGlobal: RolGlobal;
    },
    options: { rememberMe?: boolean } = {},
  ) {
    const { accessSecret, refreshSecret } = this.getJwtSecrets();
    const accessTTL = parseTTL(process.env.JWT_ACCESS_TTL, 900);
    const rememberMe = options.rememberMe === true;
    const refreshTTL = parseRefreshTTL(rememberMe);
    const payload = {
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      rolGlobal: user.rolGlobal,
      rememberMe,
    };

    const access = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessTTL,
    });
    const refresh = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshTTL,
    });
    return { access, refresh, accessTTL, refreshTTL, rememberMe };
  }

  private extractBearerToken(req: Request) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return undefined;
    }

    return authHeader.slice(7);
  }

  private getRequestToken(req: Request, type: SessionTokenType) {
    const cookieName = type === 'access' ? 'access_token' : 'refresh_token';
    const legacyCookieName = type === 'access' ? 'accessToken' : 'refreshToken';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (
      req.cookies?.[cookieName] ??
      req.cookies?.[legacyCookieName] ??
      this.extractBearerToken(req)
    );
  }

  private maskToken(token: string) {
    if (token.length <= 12) {
      return `${token.slice(0, 4)}...`;
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  private logSessionCookies(
    action: 'login' | 'refresh' | 'registro' | 'registro-negocio',
    tokens: Awaited<ReturnType<AuthService['signTokens']>>,
  ) {
    const cookieOptions = this.getCookieBaseOptions();
    const domainLabel = cookieOptions.domain ?? 'host-only';

    this.logger.debug(
      `[${action}] cookies seteadas access=${this.maskToken(tokens.access)} refresh=${this.maskToken(tokens.refresh)} secure=${String(cookieOptions.secure)} sameSite=${String(cookieOptions.sameSite)} domain=${domainLabel}`,
    );
  }

  private async verifySessionToken(token: string, type: SessionTokenType) {
    const secret =
      type === 'access'
        ? this.getJwtSecrets().accessSecret
        : this.getJwtSecrets().refreshSecret;

    try {
      return await this.jwt.verifyAsync<SessionTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private async resolveRequestUser(
    req: AuthenticatedRequest,
    type: SessionTokenType,
  ): Promise<ResolvedRequestUser> {
    const requestUserId = Number(req.user?.id ?? req.user?.sub);
    if (
      type === 'access' &&
      Number.isFinite(requestUserId) &&
      requestUserId > 0
    ) {
      const currentUser = await this.getCurrentAuthUser(requestUserId);

      return {
        id: currentUser.id,
        email: currentUser.email,
        nickname: currentUser.nickname,
        rolGlobal: currentUser.rolGlobal,
        rememberMe: req.user?.rememberMe === true,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token = this.getRequestToken(req, type);
    if (!token) {
      throw new UnauthorizedException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const payload = await this.verifySessionToken(token, type);

    const currentUser = await this.getCurrentAuthUser(payload.sub);

    return {
      id: currentUser.id,
      email: currentUser.email,
      nickname: currentUser.nickname,
      rolGlobal: currentUser.rolGlobal,
      rememberMe: payload.rememberMe === true,
    };
  }

  private async refreshSessionFromRequest(
    req: AuthenticatedRequest,
    res?: Response,
  ) {
    const payload = await this.resolveRequestUser(req, 'refresh');
    if (!payload.email || !payload.nickname) {
      throw new UnauthorizedException();
    }

    const tokens = await this.signTokens(
      {
        id: payload.id,
        email: payload.email,
        nickname: payload.nickname,
        rolGlobal: payload.rolGlobal,
      },
      { rememberMe: payload.rememberMe },
    );

    if (res) {
      this.setSessionCookies(res, tokens, 'refresh');
    }

    return payload;
  }

  private shouldTryRefreshAfterAccessError(error: unknown) {
    return (
      error instanceof UnauthorizedException &&
      error.message !== 'Esta cuenta ha sido eliminada.'
    );
  }

  private setSessionCookies(
    res: Response,
    tokens: Awaited<ReturnType<AuthService['signTokens']>>,
    action?: 'login' | 'refresh' | 'registro' | 'registro-negocio',
  ) {
    res.cookie(
      'access_token',
      tokens.access,
      this.cookieOpts(tokens.accessTTL),
    );
    res.cookie(
      'refresh_token',
      tokens.refresh,
      this.cookieOpts(tokens.refreshTTL),
    );

    if (action) {
      this.logSessionCookies(action, tokens);
    }
  }

  private toBasicAuthUser(user: RegisterUserRecord) {
    return {
      id: user.id,
      nombre: user.nombre,
      nickname: user.nickname,
      email: user.email,
      rolGlobal: user.rolGlobal,
    };
  }

  private toPublicAuthUser(user: AuthUserRecord) {
    const negocioRecord = user.negocios[0] ?? null;
    const horario = this.cleanHorarioForResponse(negocioRecord?.horario);
    const negocio = negocioRecord
      ? {
          ...negocioRecord,
          nickname: negocioRecord.slug ?? null,
          horario,
          nenufarActivo:
            negocioRecord.nenufarActivo ?? negocioRecord.nenufarAsset ?? null,
          // TODO: cuando exista saldo propio de Negocio, reemplazar este fallback al saldo del dueño.
          petalosBalance: user.petalosSaldo,
          seguidoresCount: negocioRecord._count?.seguidores ?? 0,
          resenasCount: negocioRecord._count?.resenas ?? 0,
        }
      : null;

    if (negocioRecord) {
      this.logHorarioDebug('auth/me horario devuelto', horario, {
        negocioId: negocioRecord.id,
        intervaloReserva: negocioRecord.intervaloReserva,
        reservasActivas: negocioRecord.reservasActivas,
      });
    }

    return {
      id: user.id,
      nombre: user.nombre,
      nickname: user.nickname,
      email: user.email,
      foto: user.foto,
      fotoPerfil: user.foto,
      foto_perfil: user.foto,
      biografia: user.biografia,
      creadoEn: user.creadoEn,
      actualizadoEn: user.actualizadoEn,
      emailVerificado: user.emailVerificado,
      estadoCuenta: user.estadoCuenta,
      rolGlobal: user.rolGlobal,
      rol: negocio ? 'negocio' : user.rolGlobal.toLowerCase(),
      petalosSaldo: user.petalosSaldo,
      petalosBalance: user.petalosSaldo,
      negocio,
    };
  }

  private async getPublicAuthUserById(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });

    return user ? this.toPublicAuthUser(user) : null;
  }

  private async sendWelcomeEmailIfNeeded(userId: number) {
    if (!this.emailService.isEnabled()) {
      return;
    }

    try {
      const user = await this.prisma.usuario.findUnique({
        where: { id: userId },
        select: welcomeEmailUserSelect,
      });

      if (!user) {
        return;
      }

      if (user.welcomeEmailSentAt) {
        this.logger.debug(
          `Welcome email ya enviado previamente al usuario ${userId}`,
        );
        return;
      }

      await this.emailService.sendWelcomeEmail(user.email, user.nombre);

      const updateResult = await this.prisma.usuario.updateMany({
        where: {
          id: user.id,
          welcomeEmailSentAt: null,
        },
        data: { welcomeEmailSentAt: new Date() },
      });

      if (updateResult.count === 0) {
        this.logger.debug(
          `Welcome email ya enviado previamente al usuario ${userId}`,
        );
        return;
      }

      this.logger.log(
        `Welcome email enviado correctamente al usuario ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Fallo enviando welcome email al usuario ${userId}. El login continúa y welcomeEmailSentAt no se marca.`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async resolveRequestedBusinessSlug(
    tx: Prisma.TransactionClient,
    value: string,
  ) {
    if (!value.trim()) {
      throw new BadRequestException('El slug del negocio no puede estar vacío');
    }

    const slug = slugifyNegocioNombre(value);
    const existing = await tx.negocio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('El slug del negocio ya está en uso');
    }

    return slug;
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
    const normalizedCodigoReferido = normalizeOptionalString(
      dto.codigoReferido,
    )?.toUpperCase();

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

      if (normalizedCodigoReferido) {
        try {
          await this.nenufarizarService.procesarReferido(
            user.id,
            normalizedCodigoReferido,
          );
        } catch (error) {
          this.logger.error(
            `Fallo procesando referido ${normalizedCodigoReferido} para el usuario ${user.id}. El registro continúa.`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      const tokens = await this.signTokens({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        rolGlobal: user.rolGlobal,
      });

      this.setSessionCookies(res, tokens, 'registro');
      this.logger.log(`[registro] usuario creado id=${user.id}`);

      const verificationToken = await this.signOneTimeToken('verify-email', {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      });

      const publicUser =
        (await this.getPublicAuthUserById(user.id)) ??
        this.toBasicAuthUser(user);

      return {
        access_token: tokens.access,
        usuario: publicUser,
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
      dto.nombre ?? dto.nombreDueno ?? dto['nombreDueño'],
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
    const requestedBusinessSlug = dto.slug ?? dto.nicknameNegocio;
    const normalizedDireccion = normalizeOptionalString(dto.direccion);
    const normalizedHistoria = normalizeOptionalString(
      dto.historia ?? dto.descripcion ?? dto.biografia,
    );
    const normalizedDescripcionCorta = normalizeOptionalString(
      dto.descripcionCorta,
    );
    const normalizedNenufarActivo = normalizeOptionalString(
      dto.nenufarActivo ?? dto.nenufarAsset,
    );
    const normalizedCodigo = normalizeOptionalString(
      dto.codigoNenufarizacion,
    )?.toUpperCase();

    const fechaFundacion = dto.fechaFundacion
      ? new Date(dto.fechaFundacion)
      : new Date();

    if (dto.fechaFundacion && Number.isNaN(fechaFundacion.getTime())) {
      throw new BadRequestException('La fecha de fundación no es válida');
    }

    const horario = this.normalizeHorarioPayload(dto.horario);
    const horarioPersistible = horario && hasOpenDays(horario) ? horario : null;
    const reservasActivas = dto.reservasActivas ?? false;

    this.assertReservasConfig(
      reservasActivas,
      dto.intervaloReserva,
      horario ?? null,
    );
    this.logHorarioDebug('registro-negocio horario recibido', dto.horario, {
      provided: dto.horario !== undefined,
      intervaloReserva: dto.intervaloReserva,
      reservasActivas,
    });

    // Verificar email y nickname por separado para códigos de error específicos
    const emailExists = await this.prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (emailExists) {
      throw new AppError('EMAIL_YA_EXISTE', 'El email ya está en uso', 409);
    }

    const nicknameExists = await this.prisma.usuario.findFirst({
      where: { nickname: { equals: normalizedNickname, mode: 'insensitive' } },
      select: { id: true },
    });
    if (nicknameExists) {
      throw new AppError(
        'NICKNAME_YA_EXISTE',
        'El nickname ya está en uso',
        409,
      );
    }

    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const result = await this.prisma.$transaction<RegisterNegocioResult>(
        async (tx) => {
          // Validar categoría por ID
          const categoria = await tx.categoria.findUnique({
            where: { id: dto.categoriaId },
            select: { id: true },
          });
          if (!categoria) {
            throw new AppError(
              'CATEGORIA_INVALIDA',
              'La categoría indicada no existe',
              400,
            );
          }

          // Validar subcategoría si se informa
          if (dto.subcategoriaId) {
            const sub = await tx.subcategoria.findFirst({
              where: {
                id: dto.subcategoriaId,
                categoriaId: dto.categoriaId,
              },
              select: { id: true },
            });
            if (!sub) {
              throw new AppError(
                'SUBCATEGORIA_INVALIDA',
                'La subcategoría no pertenece a la categoría indicada',
                400,
              );
            }
          }

          // Validar código de nenufarización
          if (normalizedCodigo || CODIGO_NENUFARIZACION_REQUERIDO) {
            if (!normalizedCodigo) {
              throw new AppError(
                'CODIGO_NENUFARIZACION_INVALIDO',
                'El código de nenufarización es obligatorio',
                400,
              );
            }
            const codigoRecord = await tx.codigoNenufarizacion.findUnique({
              where: { codigo: normalizedCodigo },
              select: { activo: true, usado: true },
            });
            if (!codigoRecord || !codigoRecord.activo) {
              throw new AppError(
                'CODIGO_NENUFARIZACION_INVALIDO',
                'Código no válido o no activo',
                400,
              );
            }
            if (codigoRecord.usado) {
              throw new AppError(
                'CODIGO_NENUFARIZACION_USADO',
                'El código ya ha sido utilizado',
                400,
              );
            }
          }

          const negocioSlug = requestedBusinessSlug?.trim()
            ? await this.resolveRequestedBusinessSlug(tx, requestedBusinessSlug)
            : await generateUniqueNegocioSlug(tx, normalizedBusinessName);

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
              rolGlobal: true,
            },
          });

          const negocio = await tx.negocio.create({
            data: {
              nombre: normalizedBusinessName,
              slug: negocioSlug,
              historia: normalizedHistoria,
              ...(normalizedDescripcionCorta
                ? { descripcionCorta: normalizedDescripcionCorta }
                : {}),
              direccion: normalizedDireccion,
              fechaFundacion,
              categoriaId: dto.categoriaId,
              ...(dto.subcategoriaId
                ? { subcategoriaId: dto.subcategoriaId }
                : {}),
              ...(dto.horario !== undefined
                ? { horario: this.toPrismaHorarioValue(horarioPersistible) }
                : {}),
              ...(dto.intervaloReserva !== undefined
                ? { intervaloReserva: dto.intervaloReserva }
                : {}),
              reservasActivas,
              ...(normalizedNenufarActivo
                ? {
                    nenufarActivo: normalizedNenufarActivo,
                    nenufarAsset: normalizedNenufarActivo,
                  }
                : {}),
              duenoId: user.id,
            },
            select: {
              id: true,
              nombre: true,
              slug: true,
              horario: true,
              intervaloReserva: true,
              reservasActivas: true,
              nenufarColor: true,
              nenufarActivo: true,
              nenufarAsset: true,
            },
          });

          await tx.negocioMiembro.create({
            data: {
              negocioId: negocio.id,
              usuarioId: user.id,
              rol: 'DUENO',
            },
          });

          // Marcar código como usado tras registro exitoso
          if (normalizedCodigo) {
            await tx.codigoNenufarizacion.update({
              where: { codigo: normalizedCodigo },
              data: { usado: true, usadoEn: new Date() },
            });
          }

          return { user, negocio };
        },
      );

      this.logHorarioDebug(
        'registro-negocio horario guardado',
        result.negocio.horario,
        {
          negocioId: result.negocio.id,
          intervaloReserva: result.negocio.intervaloReserva,
          reservasActivas: result.negocio.reservasActivas,
        },
      );

      const tokens = await this.signTokens({
        id: result.user.id,
        email: result.user.email,
        nickname: result.user.nickname,
        rolGlobal: result.user.rolGlobal,
      });

      this.setSessionCookies(res, tokens, 'registro-negocio');
      this.logger.log(
        `[registro-negocio] usuario id=${result.user.id} negocio id=${result.negocio.id}`,
      );

      return {
        access_token: tokens.access,
        usuario: (await this.getPublicAuthUserById(result.user.id)) ?? {
          id: result.user.id,
          nombre: result.user.nombre,
          nickname: result.user.nickname,
          email: result.user.email,
          rolGlobal: result.user.rolGlobal,
          rol: 'negocio',
          negocio: {
            ...result.negocio,
            horario: this.cleanHorarioForResponse(result.negocio.horario),
            nenufarActivo:
              result.negocio.nenufarActivo ?? result.negocio.nenufarAsset,
          },
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const targets = (error.meta?.target as string[]) ?? [];
        if (targets.includes('email')) {
          throw new AppError('EMAIL_YA_EXISTE', 'El email ya está en uso', 409);
        }
        if (targets.includes('nickname')) {
          throw new AppError(
            'NICKNAME_YA_EXISTE',
            'El nickname ya está en uso',
            409,
          );
        }
        throw new ConflictException('Email o nickname ya en uso');
      }

      throw error;
    }
  }

  async login(dto: LoginDto, res: Response) {
    const identifier = this.resolveLoginIdentifier(dto);
    const user =
      identifier.type === 'email'
        ? await this.prisma.usuario.findUnique({
            where: { email: identifier.value },
            select: loginUserSelect,
          })
        : await this.prisma.usuario.findFirst({
            where: {
              nickname: {
                equals: identifier.value,
                mode: 'insensitive',
              },
            },
            select: loginUserSelect,
          });

    if (!user) {
      this.logFailedLoginAttempt(identifier, 'user_not_found');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (isDeletedAccount(user)) {
      throw new UnauthorizedException('Esta cuenta ha sido eliminada.');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      this.logFailedLoginAttempt(identifier, 'password_mismatch');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.signTokens(
      {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        rolGlobal: user.rolGlobal,
      },
      { rememberMe: dto.rememberMe === true },
    );

    this.setSessionCookies(res, tokens, 'login');

    await this.prisma.usuario
      .update({
        where: { id: user.id },
        data: { ultimoLoginEn: new Date() },
      })
      .catch(() => undefined);

    await this.sendWelcomeEmailIfNeeded(user.id);

    const publicUser = (await this.getPublicAuthUserById(user.id)) ?? {
      id: user.id,
      nombre: user.nombre,
      nickname: user.nickname,
      email: user.email,
    };

    return {
      access_token: tokens.access,
      ...publicUser,
    };
  }

  async refresh(req: AuthenticatedRequest, res: Response) {
    try {
      await this.refreshSessionFromRequest(req, res);
      return { ok: true };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.clearSessionCookies(res);
      }
      throw error;
    }
  }

  logout(res: Response) {
    this.clearSessionCookies(res);
    return { ok: true };
  }

  async me(req: AuthenticatedRequest, res?: Response) {
    try {
      let payload: ResolvedRequestUser;

      try {
        payload = await this.resolveRequestUser(req, 'access');
      } catch (accessError) {
        if (!this.shouldTryRefreshAfterAccessError(accessError)) {
          throw accessError;
        }

        payload = await this.refreshSessionFromRequest(req, res);
      }

      const user = await this.getPublicAuthUserById(payload.id);

      if (!user) {
        throw new UnauthorizedException();
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.clearSessionCookies(res);
      }
      throw error;
    }
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
