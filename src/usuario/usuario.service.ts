import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ContenidoEstado, Prisma, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { createFieldError } from '../common/errors/app-error';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import {
  mapResenaPublic,
  resenaPublicSelect,
} from '../reseña/resena-public.util';
import { LogroEngineService } from '../logro/logro-engine.service';

const publicUserSelect = {
  id: true,
  nombre: true,
  nickname: true,
  email: true,
  foto: true,
  biografia: true,
  creadoEn: true,
  actualizadoEn: true,
  emailVerificado: true,
  verificadoEn: true,
  ultimoLoginEn: true,
  estadoCuenta: true,
  rolGlobal: true,
  petalosSaldo: true,
} satisfies Prisma.UsuarioSelect;

type PublicUserRecord = Prisma.UsuarioGetPayload<{
  select: typeof publicUserSelect;
}>;

const logroDestacadoPerfilSelect = {
  id: true,
  posicion: true,
  logro: {
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      tipo: true,
      categoriaLogro: true,
      dificultad: true,
      recompensaPuntos: true,
      accion: true,
    },
  },
} satisfies Prisma.UsuarioLogroDestacadoSelect;

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

function emailAlreadyInUseError(details: Record<string, unknown> = {}) {
  return createFieldError(
    'EMAIL_ALREADY_IN_USE',
    'Este correo ya está en uso.',
    'email',
    'Este correo ya está en uso.',
    409,
    details,
  );
}

function nicknameAlreadyInUseError(details: Record<string, unknown> = {}) {
  return createFieldError(
    'NICKNAME_ALREADY_IN_USE',
    'Este nickname ya está en uso.',
    'nickname',
    'Este nickname ya está en uso.',
    409,
    details,
  );
}

function prismaTargetIncludes(
  error: Prisma.PrismaClientKnownRequestError,
  field: string,
) {
  const target = error.meta?.target;
  const targets = Array.isArray(target)
    ? target.map(String)
    : [String(target ?? '')];

  return targets.some((item) =>
    item.toLowerCase().includes(field.toLowerCase()),
  );
}

@Injectable()
export class UsuarioService {
  constructor(
    private prisma: PrismaService,
    @Optional()
    private readonly logroEngine?: LogroEngineService,
  ) {}

  private toPublicUserResponse(user: PublicUserRecord) {
    return {
      ...user,
      fotoPerfil: user.foto,
      foto_perfil: user.foto,
      petalosBalance: user.petalosSaldo,
    };
  }

  private mapLogrosDestacadosPerfil(
    destacados: Array<{
      id: number;
      posicion: number;
      logro: {
        id: number;
        titulo: string;
        descripcion: string | null;
        tipo: string;
        categoriaLogro: string;
        dificultad: string;
        recompensaPuntos: number;
        accion: string | null;
      };
    }>,
  ) {
    return destacados.map((item) => ({
      id: item.id,
      posicion: item.posicion,
      logro: {
        ...item.logro,
        recompensaPetalos: item.logro.recompensaPuntos,
      },
    }));
  }

  private async assertCanManageUser(targetUserId: number, actorUserId: number) {
    const [target, actor] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
    ]);

    if (!actor) throw new UnauthorizedException('Usuario no autenticado');
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (
      actor.id !== targetUserId &&
      actor.rolGlobal !== RolGlobal.ADMIN &&
      actor.rolGlobal !== RolGlobal.MODERADOR
    ) {
      throw new ForbiddenException('No puedes editar este perfil');
    }

    return actor;
  }

  async crearUsuario(dto: CreateUsuarioDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedNickname = dto.nickname.trim();

    const existe = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { nickname: normalizedNickname }],
      },
      select: { id: true, email: true, nickname: true },
    });

    if (existe) {
      if (existe.email === normalizedEmail) {
        throw emailAlreadyInUseError();
      }

      if (existe.nickname === normalizedNickname) {
        throw nicknameAlreadyInUseError();
      }

      throw emailAlreadyInUseError();
    }

    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre.trim(),
          nickname: normalizedNickname,
          email: normalizedEmail,
          password: hash,
          foto: dto.fotoPerfil?.trim() || undefined,
          biografia: dto.biografia?.trim() || undefined,
        },
        select: publicUserSelect,
      });

      void this.logroEngine
        ?.registrarAccion({
          usuarioId: usuario.id,
          accion: 'PERFIL_COMPLETADO',
        })
        .catch(() => undefined);

      return this.toPublicUserResponse(usuario);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (prismaTargetIncludes(error, 'nickname')) {
          throw nicknameAlreadyInUseError({ target: error.meta?.target });
        }

        throw emailAlreadyInUseError({ target: error.meta?.target });
      }
      throw error;
    }
  }

  async getPerfil(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        ...publicUserSelect,
        _count: {
          select: {
            seguidores: true,
            siguiendo: true,
            siguiendoNegocios: true,
            resenas: true,
            negocios: true,
          },
        },
        negocios: {
          where: { eliminadoEn: null },
          select: {
            id: true,
            nombre: true,
            slug: true,
            fotoPerfil: true,
            nenufarColor: true,
            ciudad: true,
            verificado: true,
          },
          orderBy: { creadoEn: 'asc' },
        },
        logrosDestacados: {
          orderBy: { posicion: 'asc' },
          select: logroDestacadoPerfilSelect,
        },
        resenas: {
          where: {
            eliminadoEn: null,
            estado: ContenidoEstado.PUBLICADO,
          },
          select: resenaPublicSelect,
          orderBy: { creadoEn: 'desc' },
          take: 10,
        },
      },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return {
      ...usuario,
      fotoPerfil: usuario.foto,
      foto_perfil: usuario.foto,
      petalosBalance: usuario.petalosSaldo,
      logrosDestacados: this.mapLogrosDestacadosPerfil(
        usuario.logrosDestacados,
      ),
      resenas: usuario.resenas.map((resena) => mapResenaPublic(resena)),
    };
  }

  async getPerfilByNickname(nickname: string) {
    const normalizedNickname = nickname.trim();
    if (!normalizedNickname) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { nickname: normalizedNickname },
      select: {
        ...publicUserSelect,
        _count: {
          select: {
            seguidores: true,
            siguiendo: true,
            siguiendoNegocios: true,
            resenas: true,
            negocios: true,
          },
        },
        negocios: {
          where: { eliminadoEn: null },
          select: {
            id: true,
            nombre: true,
            slug: true,
            fotoPerfil: true,
            nenufarColor: true,
            ciudad: true,
            verificado: true,
          },
          orderBy: { creadoEn: 'asc' },
        },
        logrosDestacados: {
          orderBy: { posicion: 'asc' },
          select: logroDestacadoPerfilSelect,
        },
        resenas: {
          where: {
            eliminadoEn: null,
            estado: ContenidoEstado.PUBLICADO,
          },
          select: resenaPublicSelect,
          orderBy: { creadoEn: 'desc' },
          take: 10,
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...usuario,
      fotoPerfil: usuario.foto,
      foto_perfil: usuario.foto,
      petalosBalance: usuario.petalosSaldo,
      logrosDestacados: this.mapLogrosDestacadosPerfil(
        usuario.logrosDestacados,
      ),
      resenas: usuario.resenas.map((resena) => mapResenaPublic(resena)),
    };
  }

  async actualizarPerfil(
    id: number,
    dto: UpdateUsuarioDto,
    actorUserId: number,
  ) {
    await this.assertCanManageUser(id, actorUserId);

    const email = dto.email?.trim().toLowerCase();
    const nickname = dto.nickname?.trim();
    const nombre = dto.nombre?.trim();
    const foto = dto.foto ?? dto.fotoPerfil;

    if (email || nickname) {
      const conflict = await this.prisma.usuario.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(email ? [{ email }] : []),
            ...(nickname ? [{ nickname }] : []),
          ],
        },
        select: { id: true, email: true, nickname: true },
      });

      if (conflict) {
        if (email && conflict.email === email) {
          throw emailAlreadyInUseError();
        }

        if (nickname && conflict.nickname === nickname) {
          throw nicknameAlreadyInUseError();
        }

        throw emailAlreadyInUseError();
      }
    }

    try {
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: {
          ...(nombre !== undefined ? { nombre } : {}),
          ...(nickname !== undefined ? { nickname } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(dto.biografia !== undefined
            ? { biografia: normalizeOptionalString(dto.biografia) }
            : {}),
          ...(foto !== undefined
            ? { foto: normalizeOptionalString(foto) }
            : {}),
        },
        select: publicUserSelect,
      });

      void this.logroEngine
        ?.registrarAccion({
          usuarioId: usuario.id,
          accion: 'PERFIL_COMPLETADO',
        })
        .catch(() => undefined);

      return this.toPublicUserResponse(usuario);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (prismaTargetIncludes(error, 'nickname')) {
          throw nicknameAlreadyInUseError({ target: error.meta?.target });
        }

        throw emailAlreadyInUseError({ target: error.meta?.target });
      }
      throw error;
    }
  }

  async actualizarFotoPerfil(id: number, fotoUrl: string) {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { foto: normalizeOptionalString(fotoUrl) },
      select: publicUserSelect,
    });

    void this.logroEngine
      ?.registrarAccion({
        usuarioId: usuario.id,
        accion: 'PERFIL_COMPLETADO',
      })
      .catch(() => undefined);

    return this.toPublicUserResponse(usuario);
  }

  async getSeguidores(id: number, actorUserId?: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, nickname: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const seguidores = await this.prisma.usuarioSeguimiento.findMany({
      where: { seguidoId: id },
      orderBy: { creadoEn: 'desc' },
      include: {
        seguidor: {
          select: {
            id: true,
            nombre: true,
            nickname: true,
            foto: true,
            biografia: true,
          },
        },
      },
    });

    const actorFollowing = actorUserId
      ? await this.prisma.usuarioSeguimiento.findMany({
          where: {
            seguidorId: actorUserId,
            seguidoId: {
              in: seguidores.map((item) => item.seguidorId),
            },
          },
          select: { seguidoId: true },
        })
      : [];

    const actorFollowingSet = new Set(
      actorFollowing.map((item) => item.seguidoId),
    );

    return {
      usuario,
      total: seguidores.length,
      items: seguidores.map((item) => ({
        ...item.seguidor,
        seguidoDesde: item.creadoEn,
        siguiendo: actorFollowingSet.has(item.seguidorId),
      })),
    };
  }

  async getSiguiendo(id: number, actorUserId?: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombre: true, nickname: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const siguiendo = await this.prisma.usuarioSeguimiento.findMany({
      where: { seguidorId: id },
      orderBy: { creadoEn: 'desc' },
      include: {
        seguido: {
          select: {
            id: true,
            nombre: true,
            nickname: true,
            foto: true,
            biografia: true,
          },
        },
      },
    });

    const actorFollowing = actorUserId
      ? await this.prisma.usuarioSeguimiento.findMany({
          where: {
            seguidorId: actorUserId,
            seguidoId: {
              in: siguiendo.map((item) => item.seguidoId),
            },
          },
          select: { seguidoId: true },
        })
      : [];

    const actorFollowingSet = new Set(
      actorFollowing.map((item) => item.seguidoId),
    );

    return {
      usuario,
      total: siguiendo.length,
      items: siguiendo.map((item) => ({
        ...item.seguido,
        siguiendoDesde: item.creadoEn,
        siguiendo: actorFollowingSet.has(item.seguidoId),
      })),
    };
  }

  async seguir(targetUserId: number, actorUserId: number) {
    if (targetUserId === actorUserId) {
      throw new ConflictException('No puedes seguirte a ti mismo');
    }

    const [actor, target] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      }),
    ]);

    if (!actor) throw new UnauthorizedException('Usuario no autenticado');
    if (!target) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.usuarioSeguimiento.upsert({
      where: {
        seguidorId_seguidoId: {
          seguidorId: actorUserId,
          seguidoId: targetUserId,
        },
      },
      update: {},
      create: {
        seguidorId: actorUserId,
        seguidoId: targetUserId,
      },
    });

    return { ok: true, siguiendo: true };
  }

  async dejarDeSeguir(targetUserId: number, actorUserId: number) {
    if (targetUserId === actorUserId) {
      return { ok: true, siguiendo: false };
    }

    await this.prisma.usuarioSeguimiento.deleteMany({
      where: {
        seguidorId: actorUserId,
        seguidoId: targetUserId,
      },
    });

    return { ok: true, siguiendo: false };
  }

  async buscarPorEmail(email: string): Promise<any> {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nickname: true,
        email: true,
        password: true,
        nombre: true,
      },
    });
  }

  async borrarUsuario(id: number) {
    return this.prisma.usuario.delete({
      where: { id: Number(id) },
    });
  }
}
