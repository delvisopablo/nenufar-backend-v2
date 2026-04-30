/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, RolGlobal, RolNegocio } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { QueryNegocioDto } from './dto/query-negocio.dto';
import { ConfigHorarioDto } from './dto/config-horario.dto';
import { CreateNegocioMiembroDto } from './dto/create-negocio-miembro.dto';
import { UpdateNegocioMiembroDto } from './dto/update-negocio-miembro.dto';
import { CreateVisitaNegocioDto } from './dto/create-visita-negocio.dto';
import { LogroEngineService } from '../logro/logro-engine.service';
import {
  generateUniqueNegocioSlug,
  slugifyNegocioNombre,
} from './negocio-slug.util';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

function isHHmm(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}

function validateHorarioShape(h: any) {
  if (!h) return;
  if (h.weekly && typeof h.weekly !== 'object') {
    throw new BadRequestException('horario.weekly debe ser objeto');
  }
  if (h.exceptions && typeof h.exceptions !== 'object') {
    throw new BadRequestException('horario.exceptions debe ser objeto');
  }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  for (const d of days) {
    const ranges = h.weekly?.[d];
    if (!ranges) continue;
    if (!Array.isArray(ranges))
      throw new BadRequestException(`horario.weekly.${d} debe ser array`);
    for (const r of ranges) {
      if (!Array.isArray(r) || r.length !== 2)
        throw new BadRequestException(`Rango inválido en weekly.${d}`);
      const [ini, fin] = r;
      if (!isHHmm(ini) || !isHHmm(fin))
        throw new BadRequestException(`Formato HH:mm inválido en weekly.${d}`);
      if (ini >= fin)
        throw new BadRequestException(`Inicio>=fin en weekly.${d}`);
    }
  }
  if (h.exceptions) {
    for (const [ymd, arr] of Object.entries(h.exceptions)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd))
        throw new BadRequestException(`Fecha inválida en exceptions: ${ymd}`);
      if (!Array.isArray(arr))
        throw new BadRequestException(`exceptions["${ymd}"] debe ser array`);
      for (const r of arr as any[]) {
        if (!Array.isArray(r) || r.length !== 2)
          throw new BadRequestException(
            `Rango inválido en exceptions["${ymd}"]`,
          );
        const [ini, fin] = r;
        if (!isHHmm(ini) || !isHHmm(fin))
          throw new BadRequestException(
            `Formato HH:mm inválido en exceptions["${ymd}"]`,
          );
        if (ini >= fin)
          throw new BadRequestException(`Inicio>=fin en exceptions["${ymd}"]`);
      }
    }
  }
}

const negocioProfileSelect = {
  id: true,
  nombre: true,
  slug: true,
  historia: true,
  descripcionCorta: true,
  fechaFundacion: true,
  direccion: true,
  ciudad: true,
  codigoPostal: true,
  provincia: true,
  latitud: true,
  longitud: true,
  fotoPerfil: true,
  fotoPortada: true,
  nenufarColor: true,
  nenufarKey: true,
  nenufarAsset: true,
  telefono: true,
  emailContacto: true,
  web: true,
  instagram: true,
  verificado: true,
  activo: true,
  horario: true,
  intervaloReserva: true,
  categoria: { select: { id: true, nombre: true } },
  subcategoria: { select: { id: true, nombre: true } },
  duenoId: true,
  dueno: {
    select: {
      id: true,
      nombre: true,
      nickname: true,
      foto: true,
    },
  },
  _count: {
    select: {
      seguidores: true,
      resenas: true,
      productos: true,
      reservas: true,
    },
  },
} satisfies Prisma.NegocioSelect;

@Injectable()
export class NegocioService {
  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private async resolveRequestedSlug(value: string, currentNegocioId?: number) {
    if (!value.trim()) {
      throw new BadRequestException('El slug del negocio no puede estar vacío');
    }

    const slug = slugifyNegocioNombre(value);
    const existing = await this.prisma.negocio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== currentNegocioId) {
      throw new ConflictException('El slug del negocio ya está en uso');
    }

    return slug;
  }

  private async enrichNegocioProfile(
    negocio: Prisma.NegocioGetPayload<{ select: typeof negocioProfileSelect }>,
  ) {
    const stats = await this.prisma.resena.aggregate({
      where: {
        negocioId: negocio.id,
        eliminadoEn: null,
      },
      _avg: { puntuacion: true },
      _count: { id: true },
    });

    return {
      ...negocio,
      followersCount: negocio._count.seguidores,
      resenasCount: negocio._count.resenas,
      productosCount: negocio._count.productos,
      reservasCount: negocio._count.reservas,
      mediaResenas:
        typeof stats._avg.puntuacion === 'number'
          ? Number(stats._avg.puntuacion.toFixed(1))
          : 0,
    };
  }

  private async assertCanManageMembers(negocioId: number, actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [negocio, actor] = await this.prisma.$transaction([
      this.prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, nombre: true, duenoId: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
    ]);

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (!actor) throw new UnauthorizedException('Usuario no autenticado');

    if (
      negocio.duenoId !== actorUserId &&
      actor.rolGlobal !== RolGlobal.ADMIN &&
      actor.rolGlobal !== RolGlobal.MODERADOR
    ) {
      throw new ForbiddenException('No puedes gestionar este negocio');
    }

    return negocio;
  }

  // LIST
  async list(qry: QueryNegocioDto) {
    const { q, search, categoriaId, subcategoriaId, page, limit } = qry;
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const searchTerm = q?.trim() || search?.trim();

    const where: any = {
      ...(categoriaId ? { categoriaId } : {}),
      ...(subcategoriaId ? { subcategoriaId } : {}),
      ...(searchTerm
        ? {
            OR: [
              {
                nombre: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                direccion: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                historia: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.negocio.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          slug: true,
          historia: true,
          direccion: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.negocio.count({ where }),
    ]);

    return { items, total, page: p, limit: l };
  }

  // DETAIL
  async getById(id: number) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: negocioProfileSelect,
    });

    if (!n) throw new NotFoundException('Negocio no encontrado');
    return this.enrichNegocioProfile(n);
  }

  async getBySlug(slug: string, actorUserId?: number) {
    const n = await this.prisma.negocio.findUnique({
      where: { slug },
      select: negocioProfileSelect,
    });

    if (!n) throw new NotFoundException('Negocio no encontrado');

    const isFollowedByMe = actorUserId
      ? Boolean(
          await this.prisma.negocioSeguimiento.findUnique({
            where: {
              usuarioId_negocioId: {
                usuarioId: actorUserId,
                negocioId: n.id,
              },
            },
            select: { id: true },
          }),
        )
      : false;

    const enriched = await this.enrichNegocioProfile(n);
    return {
      ...enriched,
      isFollowedByMe,
      isFollowing: isFollowedByMe,
    };
  }

  // CREATE
  async create(dto: CreateNegocioDto, currentUserId: number) {
    if (dto.horario) validateHorarioShape(dto.horario);

    const slug = dto.slug?.trim()
      ? await this.resolveRequestedSlug(dto.slug)
      : await generateUniqueNegocioSlug(this.prisma, dto.nombre.trim());

    const data: any = {
      nombre: dto.nombre.trim(),
      slug,
      historia: dto.historia?.trim(),
      nenufarColor: dto.nenufarColor?.trim(),
      fechaFundacion: new Date(dto.fechaFundacion),
      direccion: dto.direccion?.trim(),
      categoriaId: dto.categoriaId,
      subcategoriaId: dto.subcategoriaId,
      duenoId: currentUserId,
      intervaloReserva: dto.intervaloReserva,
      horario: dto.horario ?? undefined,
    };

    return this.prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.create({ data });
      await tx.negocioMiembro.create({
        data: {
          negocioId: negocio.id,
          usuarioId: currentUserId,
          rol: RolNegocio.DUENO,
        },
      });
      return negocio;
    });
  }

  // UPDATE
  async update(
    id: number,
    dto: UpdateNegocioDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    if (dto.horario) validateHorarioShape(dto.horario);

    const data: any = {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.historia !== undefined
        ? { historia: dto.historia?.trim() ?? null }
        : {}),
      ...(dto.descripcionCorta !== undefined
        ? { descripcionCorta: dto.descripcionCorta?.trim() ?? null }
        : {}),
      ...(dto.fechaFundacion !== undefined
        ? { fechaFundacion: new Date(dto.fechaFundacion) }
        : {}),
      ...(dto.direccion !== undefined
        ? { direccion: dto.direccion?.trim() ?? null }
        : {}),
      ...(dto.fotoPerfil !== undefined
        ? { fotoPerfil: dto.fotoPerfil?.trim() ?? null }
        : {}),
      ...(dto.fotoPortada !== undefined
        ? { fotoPortada: dto.fotoPortada?.trim() ?? null }
        : {}),
      ...(dto.nenufarColor !== undefined
        ? { nenufarColor: dto.nenufarColor?.trim() ?? null }
        : {}),
      ...(dto.nenufarKey !== undefined
        ? { nenufarKey: dto.nenufarKey?.trim() ?? null }
        : {}),
      ...(dto.nenufarAsset !== undefined
        ? { nenufarAsset: dto.nenufarAsset?.trim() ?? null }
        : {}),
      ...(dto.categoriaId !== undefined
        ? { categoriaId: dto.categoriaId }
        : {}),
      ...(dto.subcategoriaId !== undefined
        ? { subcategoriaId: dto.subcategoriaId }
        : {}),
      ...(dto.intervaloReserva !== undefined
        ? { intervaloReserva: dto.intervaloReserva }
        : {}),
      ...(dto.horario !== undefined ? { horario: dto.horario } : {}),
    };

    if (dto.slug !== undefined) {
      if (dto.slug === null) {
        throw new BadRequestException('El slug no puede ser null');
      }

      data.slug = await this.resolveRequestedSlug(dto.slug, id);
    } else if (dto.nombre !== undefined) {
      const negocioActual = await this.prisma.negocio.findUnique({
        where: { id },
        select: { slug: true },
      });

      if (!negocioActual) {
        throw new NotFoundException('Negocio no encontrado');
      }

      if (!negocioActual.slug) {
        data.slug = await generateUniqueNegocioSlug(
          this.prisma,
          dto.nombre.trim(),
        );
      }
    }

    return this.prisma.negocio.update({ where: { id }, data });
  }

  // DELETE
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    return this.prisma.negocio.delete({ where: { id } });
  }

  // CONFIG HORARIO
  async setConfigHorario(
    id: number,
    dto: ConfigHorarioDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    if (dto.horario) validateHorarioShape(dto.horario);

    if (dto.intervaloReserva === undefined && dto.horario === undefined) {
      throw new BadRequestException('Nada que actualizar');
    }

    return this.prisma.negocio.update({
      where: { id },
      data: {
        ...(dto.intervaloReserva !== undefined
          ? { intervaloReserva: dto.intervaloReserva }
          : {}),
        ...(dto.horario !== undefined ? { horario: dto.horario } : {}),
      },
      select: { id: true, nombre: true, intervaloReserva: true, horario: true },
    });
  }

  // GET HORARIO
  async getHorario(id: number) {
    const neg = await this.prisma.negocio.findUnique({
      where: { id },
      select: { id: true, nombre: true, intervaloReserva: true, horario: true },
    });
    if (!neg) throw new NotFoundException('Negocio no encontrado');
    return neg;
  }

  async seguir(
    negocioId: number,
    actorUserId: number,
    notificacionesActivas?: boolean,
  ) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, duenoId: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    if (negocio.duenoId === actorUserId) {
      throw new ConflictException('No puedes seguir tu propio negocio');
    }

    await this.prisma.negocioSeguimiento.upsert({
      where: {
        usuarioId_negocioId: {
          usuarioId: actorUserId,
          negocioId,
        },
      },
      update:
        notificacionesActivas === undefined
          ? {}
          : {
              notificacionesActivas,
            },
      create: {
        usuarioId: actorUserId,
        negocioId,
        notificacionesActivas: notificacionesActivas ?? true,
      },
    });

    const total = await this.prisma.negocioSeguimiento.count({
      where: { negocioId },
    });

    void this.logroEngine
      .registrarAccion({
        usuarioId: actorUserId,
        accion: 'NEGOCIO_SEGUIDO',
        refId: negocioId,
      })
      .catch(() => undefined);

    return { followed: true, siguiendo: true, total };
  }

  async updateSeguimientoNotificaciones(
    negocioId: number,
    actorUserId: number,
    activas: boolean,
  ) {
    const result = await this.prisma.negocioSeguimiento.updateMany({
      where: {
        negocioId,
        usuarioId: actorUserId,
      },
      data: {
        notificacionesActivas: activas,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Seguimiento no encontrado');
    }

    return { activas };
  }

  async dejarDeSeguir(negocioId: number, actorUserId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    await this.prisma.negocioSeguimiento.deleteMany({
      where: {
        negocioId,
        usuarioId: actorUserId,
      },
    });

    const total = await this.prisma.negocioSeguimiento.count({
      where: { negocioId },
    });

    return { followed: false, siguiendo: false, total };
  }

  async getSeguidores(negocioId: number, actorUserId?: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true, slug: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const seguidores = await this.prisma.negocioSeguimiento.findMany({
      where: { negocioId },
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: {
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

    const actorSiguiendo = actorUserId
      ? (await this.prisma.negocioSeguimiento.count({
          where: {
            negocioId,
            usuarioId: actorUserId,
          },
        })) > 0
      : false;

    return {
      negocio,
      count: seguidores.length,
      total: seguidores.length,
      actorSiguiendo,
      items: seguidores.map((item) => ({
        id: item.id,
        creadoEn: item.creadoEn,
        usuario: item.usuario,
      })),
    };
  }

  async getNegociosSeguidosPorUsuario(actorUserId: number) {
    const items = await this.prisma.negocioSeguimiento.findMany({
      where: { usuarioId: actorUserId },
      orderBy: { creadoEn: 'desc' },
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            fotoPerfil: true,
            ciudad: true,
            verificado: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        creadoEn: item.creadoEn,
        notificacionesActivas: item.notificacionesActivas,
        negocio: item.negocio,
      })),
    };
  }

  async listMiembros(negocioId: number, actorUserId: number) {
    await this.assertCanManageMembers(negocioId, actorUserId);

    const items = await this.prisma.negocioMiembro.findMany({
      where: { negocioId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            nickname: true,
            email: true,
            foto: true,
            estadoCuenta: true,
          },
        },
      },
      orderBy: [{ rol: 'asc' }, { creadoEn: 'asc' }],
    });

    return { total: items.length, items };
  }

  async addMiembro(
    negocioId: number,
    actorUserId: number,
    dto: CreateNegocioMiembroDto,
  ) {
    const negocio = await this.assertCanManageMembers(negocioId, actorUserId);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
      select: { id: true, nombre: true, email: true },
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rol =
      dto.usuarioId === negocio.duenoId
        ? RolNegocio.DUENO
        : (dto.rol ?? RolNegocio.EMPLEADO);

    if (dto.usuarioId !== negocio.duenoId && rol === RolNegocio.DUENO) {
      throw new BadRequestException(
        'No puedes asignar rol DUENO a un usuario que no sea el dueño del negocio',
      );
    }

    const miembro = await this.prisma.negocioMiembro.upsert({
      where: {
        negocioId_usuarioId: {
          negocioId,
          usuarioId: dto.usuarioId,
        },
      },
      update: { rol },
      create: {
        negocioId,
        usuarioId: dto.usuarioId,
        rol,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            nickname: true,
            email: true,
            foto: true,
          },
        },
      },
    });

    return miembro;
  }

  async updateMiembro(
    negocioId: number,
    usuarioId: number,
    actorUserId: number,
    dto: UpdateNegocioMiembroDto,
  ) {
    const negocio = await this.assertCanManageMembers(negocioId, actorUserId);
    const miembro = await this.prisma.negocioMiembro.findUnique({
      where: {
        negocioId_usuarioId: {
          negocioId,
          usuarioId,
        },
      },
      select: {
        negocioId: true,
        usuarioId: true,
      },
    });

    if (!miembro) throw new NotFoundException('Miembro no encontrado');

    if (usuarioId === negocio.duenoId && dto.rol !== RolNegocio.DUENO) {
      throw new BadRequestException(
        'El dueño del negocio debe conservar rol DUENO',
      );
    }

    if (usuarioId !== negocio.duenoId && dto.rol === RolNegocio.DUENO) {
      throw new BadRequestException(
        'No puedes promocionar a DUENO desde este endpoint',
      );
    }

    return this.prisma.negocioMiembro.update({
      where: {
        negocioId_usuarioId: {
          negocioId,
          usuarioId,
        },
      },
      data: { rol: dto.rol },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            nickname: true,
            email: true,
            foto: true,
          },
        },
      },
    });
  }

  async removeMiembro(
    negocioId: number,
    usuarioId: number,
    actorUserId: number,
  ) {
    const negocio = await this.assertCanManageMembers(negocioId, actorUserId);

    if (usuarioId === negocio.duenoId) {
      throw new BadRequestException('No puedes eliminar al dueño del negocio');
    }

    const miembro = await this.prisma.negocioMiembro.findUnique({
      where: { negocioId_usuarioId: { negocioId, usuarioId } },
      select: { usuarioId: true },
    });
    if (!miembro) throw new NotFoundException('Miembro no encontrado');

    await this.prisma.negocioMiembro.delete({
      where: { negocioId_usuarioId: { negocioId, usuarioId } },
    });

    return { ok: true };
  }

  async registrarVisita(
    negocioId: number,
    actorUserId: number | undefined,
    dto: CreateVisitaNegocioDto,
  ) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true },
    });

    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    const visita = await this.prisma.visitaNegocio.create({
      data: {
        negocioId,
        usuarioId:
          actorUserId && Number.isInteger(actorUserId) && actorUserId > 0
            ? actorUserId
            : null,
        origen: dto.origen?.trim() || null,
      },
    });

    if (
      actorUserId &&
      Number.isInteger(actorUserId) &&
      actorUserId > 0
    ) {
      void this.logroEngine
        .registrarAccion({
          usuarioId: actorUserId,
          accion: 'VISITA_NEGOCIO',
          refId: negocioId,
        })
        .catch(() => undefined);
    }

    return {
      ok: true,
      visita,
    };
  }

  //  // AVAILABILITY - descomentar
  //   async availability(negocioId: number, ymd: string) {
  //     const negocio = await this.prisma.negocio.findUnique({
  //       where: { id: negocioId },
  //       select: { id: true, nombre: true, intervaloReserva: true, horario: true },
  //     });
  //     if (!negocio) throw new NotFoundException('Negocio no encontrado');

  //     const date = new Date(ymd);
  //     if (Number.isNaN(date.getTime())) throw new BadRequestException('Fecha inválida');

  //     const slots: string[] = [];
  //     const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  //     const endOfDay = new Date(date.setHours(23, 59, 59, 999));
}
