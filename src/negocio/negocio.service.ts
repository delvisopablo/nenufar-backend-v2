/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ContenidoEstado,
  EstadoCuenta,
  Prisma,
  ReservaEstado,
  RolGlobal,
  RolNegocio,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { QueryNegocioDto } from './dto/query-negocio.dto';
import { ConfigHorarioDto } from './dto/config-horario.dto';
import { UpdateNegocioImagenesDto } from './dto/update-negocio-imagenes.dto';
import { CreateNegocioMiembroDto } from './dto/create-negocio-miembro.dto';
import { UpdateNegocioMiembroDto } from './dto/update-negocio-miembro.dto';
import { CreateVisitaNegocioDto } from './dto/create-visita-negocio.dto';
import { LogroEngineService } from '../logro/logro-engine.service';
import { AccionLogro, AccionLogroNegocio } from '../logro/logro-accion';
import {
  generateUniqueNegocioSlug,
  slugifyNegocioNombre,
} from './negocio-slug.util';
import {
  HorarioJson,
  hasOpenDays,
  normalizeHorarioForRead,
  normalizeHorarioInput,
  summarizeHorarioForLog,
} from './horario.util';
import { createFieldError } from '../common/errors/app-error';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(50, Number(limit ?? 12) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

function toInicioLimit(limit?: number | string) {
  const n = Number(limit ?? 12);
  return Math.max(1, Math.min(30, Number.isFinite(n) ? Math.trunc(n) : 12));
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function stableShuffle<T extends { id: number }>(items: T[], seed: string) {
  return [...items].sort(
    (a, b) =>
      stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`) ||
      a.id - b.id,
  );
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
  nenufarActivo: true,
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
  reservasActivas: true,
  categoriaId: true,
  categoria: { select: { id: true, nombre: true } },
  subcategoriaId: true,
  subcategoria: { select: { id: true, nombre: true } },
  duenoId: true,
  dueno: {
    select: {
      id: true,
      nombre: true,
      nickname: true,
      foto: true,
      petalosSaldo: true,
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
  private readonly logger = new Logger(NegocioService.name);

  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private registrarLogroEnSegundoPlano(
    usuarioId: number,
    accion: AccionLogro,
    refId?: number,
  ) {
    void Promise.resolve()
      .then(() =>
        this.logroEngine.registrarAccion({
          usuarioId,
          accion,
          refId,
        }),
      )
      .catch(() => undefined);
  }

  private registrarLogroNegocioEnSegundoPlano(
    negocioId: number,
    accion: AccionLogroNegocio,
    refId?: number,
  ) {
    void Promise.resolve()
      .then(() =>
        this.logroEngine.registrarAccionNegocio({
          negocioId,
          accion,
          refId,
        }),
      )
      .catch(() => undefined);
  }

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

  private cleanHorarioForResponse(
    horario?: Prisma.JsonValue | HorarioJson | null,
  ) {
    return normalizeHorarioForRead(horario);
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

  private assertReservasConfig(
    reservasActivas: boolean,
    intervaloReserva?: number | null,
    horario?: HorarioJson | null,
  ) {
    if (!reservasActivas) {
      return;
    }

    if (!intervaloReserva || intervaloReserva <= 0) {
      throw createFieldError(
        'INVALID_RESERVATION_INTERVAL',
        'Si las reservas estan activas, intervaloReserva debe ser positivo',
        'intervaloReserva',
        'Si las reservas estan activas, intervaloReserva debe ser positivo',
      );
    }

    if (!horario || !hasOpenDays(horario)) {
      throw createFieldError(
        'INVALID_SCHEDULE',
        'Si las reservas estan activas, debe haber al menos un dia abierto',
        'horario',
        'Si las reservas estan activas, debe haber al menos un dia abierto',
      );
    }
  }

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

    const mediaResenas =
      typeof stats._avg.puntuacion === 'number'
        ? Number(stats._avg.puntuacion.toFixed(1))
        : 0;
    const dueno = {
      id: negocio.dueno.id,
      nombre: negocio.dueno.nombre,
      nickname: negocio.dueno.nickname,
      foto: negocio.dueno.foto,
    };
    const horario = this.cleanHorarioForResponse(negocio.horario);

    this.logHorarioDebug('perfil-negocio horario devuelto', horario, {
      negocioId: negocio.id,
      intervaloReserva: negocio.intervaloReserva,
      reservasActivas: negocio.reservasActivas,
    });

    return {
      ...negocio,
      dueno,
      nickname: negocio.slug ?? null,
      horario,
      // TODO: cuando exista saldo propio de Negocio, reemplazar este fallback al saldo del dueño.
      petalosBalance: negocio.dueno.petalosSaldo,
      petalos: negocio.dueno.petalosSaldo,
      seguidoresCount: negocio._count.seguidores,
      seguidores: negocio._count.seguidores,
      followersCount: negocio._count.seguidores,
      resenasCount: stats._count.id,
      numeroResenas: stats._count.id,
      productosCount: negocio._count.productos,
      reservasCount: negocio._count.reservas,
      mediaResenas,
      ratingMedio: mediaResenas,
      ratingPromedio: mediaResenas,
    };
  }

  private async softDeleteNegocioGraph(
    tx: Prisma.TransactionClient,
    negocioId: number,
    deletedAt: Date,
  ) {
    const promociones = await tx.promocion.findMany({
      where: { negocioId },
      select: { id: true },
    });
    const posts = await tx.post.findMany({
      where: { negocioId },
      select: { id: true },
    });

    const promocionIds = promociones.map((item) => item.id);
    const postIds = posts.map((item) => item.id);

    await tx.promocion.updateMany({
      where: {
        negocioId,
        OR: [
          { activa: true },
          { estado: { not: ContenidoEstado.ELIMINADO } },
          { eliminadoEn: null },
        ],
      },
      data: {
        activa: false,
        estado: ContenidoEstado.ELIMINADO,
        eliminadoEn: deletedAt,
      },
    });
    await tx.reserva.updateMany({
      where: {
        negocioId,
        fecha: { gte: deletedAt },
        estado: {
          in: [ReservaEstado.PENDIENTE, ReservaEstado.CONFIRMADA],
        },
      },
      data: {
        estado: ReservaEstado.CANCELADA,
        canceladaEn: deletedAt,
        motivoCancelacion: 'Negocio eliminado',
      },
    });
    await tx.post.updateMany({
      where: {
        negocioId,
        OR: [
          { estado: { not: ContenidoEstado.ELIMINADO } },
          { eliminadoEn: null },
        ],
      },
      data: {
        estado: ContenidoEstado.ELIMINADO,
        eliminadoEn: deletedAt,
      },
    });
    await tx.resena.updateMany({
      where: {
        negocioId,
        eliminadoEn: null,
        estado: { not: ContenidoEstado.OCULTO },
      },
      data: {
        estado: ContenidoEstado.OCULTO,
        moderadoEn: deletedAt,
        motivoModeracion: 'Negocio eliminado',
      },
    });
    await tx.negocioMiembro.deleteMany({
      where: { negocioId },
    });
    await tx.negocioSeguimiento.deleteMany({
      where: { negocioId },
    });
    await tx.notificacion.deleteMany({
      where: {
        OR: [
          { negocioId },
          ...(promocionIds.length > 0
            ? [{ promocionId: { in: promocionIds } }]
            : []),
          ...(postIds.length > 0 ? [{ postId: { in: postIds } }] : []),
        ],
      },
    });

    return tx.negocio.update({
      where: { id: negocioId },
      data: {
        activo: false,
        eliminadoEn: deletedAt,
      },
    });
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

  private buildNegociosPublicWhere(
    qry: Pick<
      QueryNegocioDto,
      'q' | 'search' | 'categoriaId' | 'subcategoriaId'
    >,
  ): Prisma.NegocioWhereInput {
    const searchTerm = qry.q?.trim() || qry.search?.trim();

    return {
      activo: true,
      eliminadoEn: null,
      ...(qry.categoriaId ? { categoriaId: qry.categoriaId } : {}),
      ...(qry.subcategoriaId ? { subcategoriaId: qry.subcategoriaId } : {}),
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
                descripcionCorta: {
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
              {
                ciudad: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                categoria: {
                  nombre: {
                    contains: searchTerm,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                subcategoria: {
                  nombre: {
                    contains: searchTerm,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  // LIST
  async list(qry: QueryNegocioDto) {
    const { q, search, categoriaId, subcategoriaId, page, limit } = qry;
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const where = this.buildNegociosPublicWhere({
      q,
      search,
      categoriaId,
      subcategoriaId,
    });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.negocio.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          slug: true,
          descripcionCorta: true,
          historia: true,
          direccion: true,
          fotoPerfil: true,
          fotoPortada: true,
          nenufarActivo: true,
          nenufarAsset: true,
          horario: true,
          intervaloReserva: true,
          reservasActivas: true,
          categoriaId: true,
          categoria: { select: { id: true, nombre: true } },
          subcategoriaId: true,
          subcategoria: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.negocio.count({ where }),
    ]);

    const negocioIds = items.map((item) => item.id);
    const [resenasAgg, promociones] = negocioIds.length
      ? await this.prisma.$transaction([
          this.prisma.resena.groupBy({
            by: ['negocioId'],
            orderBy: { negocioId: 'asc' },
            where: {
              negocioId: { in: negocioIds },
              eliminadoEn: null,
              estado: ContenidoEstado.PUBLICADO,
            },
            _avg: { puntuacion: true },
            _count: { _all: true },
          }),
          this.prisma.promocion.findMany({
            where: {
              negocioId: { in: negocioIds },
              activa: true,
              eliminadoEn: null,
              estado: ContenidoEstado.PUBLICADO,
              fechaCaducidad: { gte: new Date() },
            },
            select: {
              id: true,
              titulo: true,
              descuento: true,
              tipoDescuento: true,
              fechaCaducidad: true,
              negocioId: true,
            },
            orderBy: [{ fechaCaducidad: 'asc' }, { id: 'asc' }],
            take: negocioIds.length * 2,
          }),
        ])
      : [[], []];

    const statsByNegocio = new Map(
      resenasAgg.map((item) => {
        const count =
          typeof item._count === 'object' ? (item._count._all ?? 0) : 0;
        return [
          item.negocioId,
          {
            mediaResenas:
              typeof item._avg?.puntuacion === 'number'
                ? Number(item._avg.puntuacion.toFixed(1))
                : 0,
            resenasCount: count,
          },
        ];
      }),
    );
    const promoByNegocio = new Map<number, (typeof promociones)[number]>();
    for (const promocion of promociones) {
      if (!promoByNegocio.has(promocion.negocioId)) {
        promoByNegocio.set(promocion.negocioId, promocion);
      }
    }

    return {
      items: items.map((item) => {
        const stats = statsByNegocio.get(item.id) ?? {
          mediaResenas: 0,
          resenasCount: 0,
        };
        const promocion = promoByNegocio.get(item.id);
        return {
          ...item,
          horario: this.cleanHorarioForResponse(item.horario),
          rating: stats.mediaResenas,
          ratingMedio: stats.mediaResenas,
          mediaResenas: stats.mediaResenas,
          resenasCount: stats.resenasCount,
          numeroResenas: stats.resenasCount,
          promo: promocion
            ? {
                id: promocion.id,
                titulo: promocion.titulo,
                descuento: promocion.descuento,
                tipoDescuento: promocion.tipoDescuento,
                fechaCaducidad: promocion.fechaCaducidad,
              }
            : null,
          promocionActiva: promocion
            ? {
                id: promocion.id,
                titulo: promocion.titulo,
                descuento: promocion.descuento,
                tipoDescuento: promocion.tipoDescuento,
                fechaCaducidad: promocion.fechaCaducidad,
              }
            : null,
        };
      }),
      total,
      page: p,
      limit: l,
    };
  }

  async listInicio(qry: QueryNegocioDto, actorUserId?: number) {
    const { q, search, categoriaId, subcategoriaId } = qry;
    const limit = toInicioLimit(qry.limit);
    const where = this.buildNegociosPublicWhere({
      q,
      search,
      categoriaId,
      subcategoriaId,
    });
    const seed = [
      new Date().toISOString().slice(0, 10),
      actorUserId ?? 'anon',
      q?.trim() ?? search?.trim() ?? '',
      categoriaId ?? '',
      subcategoriaId ?? '',
    ].join(':');

    const select = {
      id: true,
      nombre: true,
      slug: true,
      descripcionCorta: true,
      fotoPerfil: true,
      nenufarColor: true,
      nenufarKey: true,
      nenufarAsset: true,
      categoriaId: true,
      categoria: { select: { id: true, nombre: true } },
      subcategoriaId: true,
      subcategoria: { select: { id: true, nombre: true } },
      creadoEn: true,
    } satisfies Prisma.NegocioSelect;

    let seguidos: Array<Prisma.NegocioGetPayload<{ select: typeof select }>> =
      [];
    let seguidosIds: number[] = [];
    const mapInicioNegocio = (
      negocio: Prisma.NegocioGetPayload<{ select: typeof select }>,
      seguidoPorMi: boolean,
    ) => {
      const { creadoEn, ...publico } = negocio;
      void creadoEn;
      return {
        ...publico,
        seguidoPorMi,
      };
    };

    if (actorUserId && Number.isInteger(actorUserId) && actorUserId > 0) {
      const seguimientos = await this.prisma.negocioSeguimiento.findMany({
        where: {
          usuarioId: actorUserId,
          negocio: where,
        },
        select: {
          negocioId: true,
          negocio: { select },
        },
        orderBy: { creadoEn: 'desc' },
        take: Math.max(limit * 2, 20),
      });

      seguidos = stableShuffle(
        seguimientos.map((item) => item.negocio),
        `${seed}:seguidos`,
      );
      seguidosIds = seguimientos.map((item) => item.negocioId);
    }

    if (seguidos.length === 0) {
      const candidatos = await this.prisma.negocio.findMany({
        where,
        select,
        orderBy: [{ actualizadoEn: 'desc' }, { id: 'desc' }],
        take: Math.max(limit * 3, 30),
      });

      return stableShuffle(candidatos, `${seed}:anon`)
        .slice(0, limit)
        .map((negocio) => mapInicioNegocio(negocio, false));
    }

    const discoveryDeseado =
      seguidos.length >= 5 ? Math.min(3, Math.max(0, limit - 1)) : 0;
    const seguidosDeseados =
      seguidos.length >= 5 ? Math.max(0, limit - discoveryDeseado) : limit;

    const descubrimiento = await this.prisma.negocio.findMany({
      where: {
        ...where,
        id: {
          notIn: seguidosIds,
        },
      },
      select,
      orderBy: [{ actualizadoEn: 'desc' }, { id: 'desc' }],
      take:
        seguidos.length >= 5
          ? Math.max(discoveryDeseado * 3, 12)
          : Math.max((limit - Math.min(seguidos.length, limit)) * 3, 12),
    });

    let seguidosSeleccionados = seguidos.slice(0, seguidosDeseados);
    const descubrimientoSeleccionado = stableShuffle(
      descubrimiento,
      `${seed}:descubrimiento`,
    ).slice(
      0,
      seguidos.length >= 5
        ? limit - seguidosSeleccionados.length
        : limit - seguidosSeleccionados.length,
    );

    if (
      seguidos.length >= 5 &&
      descubrimientoSeleccionado.length < discoveryDeseado
    ) {
      seguidosSeleccionados = seguidos.slice(
        0,
        limit - descubrimientoSeleccionado.length,
      );
    }

    const vistos = new Set<number>();
    return [
      ...seguidosSeleccionados.map((negocio) =>
        mapInicioNegocio(negocio, true),
      ),
      ...descubrimientoSeleccionado.map((negocio) =>
        mapInicioNegocio(negocio, false),
      ),
    ]
      .filter((negocio) => {
        if (vistos.has(negocio.id)) {
          return false;
        }
        vistos.add(negocio.id);
        return true;
      })
      .slice(0, limit);
  }

  // DETAIL
  async getById(id: number, actorUserId?: number) {
    const n = await this.prisma.negocio.findFirst({
      where: {
        id,
        activo: true,
        eliminadoEn: null,
      },
      select: negocioProfileSelect,
    });

    if (!n) throw new NotFoundException('Negocio no encontrado');
    return this.enrichNegocioProfile(n);
  }

  async getBySlug(slugOrName: string, actorUserId?: number) {
    const rawLookup = slugOrName.trim();
    if (!rawLookup) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const normalizedSlug = slugifyNegocioNombre(rawLookup);
    const slugCandidates = [...new Set([rawLookup, normalizedSlug])].filter(
      Boolean,
    );

    const n = await this.prisma.negocio.findFirst({
      where: {
        OR: [
          ...slugCandidates.map((candidate) => ({ slug: candidate })),
          { nombre: rawLookup },
        ],
        activo: true,
        eliminadoEn: null,
      },
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
    const horario = this.normalizeHorarioPayload(dto.horario);
    const reservasActivas = dto.reservasActivas ?? false;
    this.assertReservasConfig(
      reservasActivas,
      dto.intervaloReserva,
      horario ?? null,
    );
    this.logHorarioDebug('crear-negocio horario recibido', dto.horario, {
      provided: dto.horario !== undefined,
      intervaloReserva: dto.intervaloReserva,
      reservasActivas,
    });

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
      web: dto.web?.trim(),
      emailContacto: dto.emailContacto?.trim().toLowerCase(),
      telefono: dto.telefono?.trim(),
      categoriaId: dto.categoriaId,
      subcategoriaId: dto.subcategoriaId,
      duenoId: currentUserId,
      intervaloReserva: dto.intervaloReserva,
      reservasActivas,
      horario:
        horario && hasOpenDays(horario)
          ? (horario as Prisma.InputJsonValue)
          : undefined,
    };

    const negocio = await this.prisma.$transaction(async (tx) => {
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

    if (horario && hasOpenDays(horario)) {
      this.registrarLogroEnSegundoPlano(
        currentUserId,
        'HORARIO_NEGOCIO_CONFIGURADO',
        negocio.id,
      );
    }

    this.logHorarioDebug('crear-negocio horario guardado', negocio.horario, {
      negocioId: negocio.id,
      intervaloReserva: negocio.intervaloReserva,
      reservasActivas: negocio.reservasActivas,
    });

    return negocio;
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
      select: {
        duenoId: true,
        slug: true,
        horario: true,
        intervaloReserva: true,
        reservasActivas: true,
      },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    const horario =
      dto.horario !== undefined
        ? this.normalizeHorarioPayload(dto.horario)
        : this.cleanHorarioForResponse(n.horario);
    const intervaloReserva = dto.intervaloReserva ?? n.intervaloReserva;
    const reservasActivas = dto.reservasActivas ?? n.reservasActivas;
    this.assertReservasConfig(reservasActivas, intervaloReserva, horario);
    if (dto.horario !== undefined) {
      this.logHorarioDebug('actualizar-negocio horario recibido', dto.horario, {
        negocioId: id,
        provided: true,
        intervaloReserva,
        reservasActivas,
      });
    }

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
      ...(dto.web !== undefined ? { web: dto.web?.trim() ?? null } : {}),
      ...(dto.emailContacto !== undefined
        ? { emailContacto: dto.emailContacto?.trim().toLowerCase() ?? null }
        : {}),
      ...(dto.telefono !== undefined
        ? { telefono: dto.telefono?.trim() ?? null }
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
      ...(dto.reservasActivas !== undefined
        ? { reservasActivas: dto.reservasActivas }
        : {}),
      ...(dto.horario !== undefined
        ? {
            horario: this.toPrismaHorarioValue(
              horario && hasOpenDays(horario) ? horario : null,
            ),
          }
        : {}),
    };

    if (dto.slug !== undefined) {
      if (dto.slug === null) {
        throw new BadRequestException('El slug no puede ser null');
      }

      data.slug = await this.resolveRequestedSlug(dto.slug, id);
    } else if (dto.nombre !== undefined) {
      if (!n.slug) {
        data.slug = await generateUniqueNegocioSlug(
          this.prisma,
          dto.nombre.trim(),
        );
      }
    }

    const negocio = await this.prisma.negocio.update({ where: { id }, data });

    if (dto.horario !== undefined && horario && hasOpenDays(horario)) {
      this.registrarLogroEnSegundoPlano(
        n.duenoId,
        'HORARIO_NEGOCIO_CONFIGURADO',
        id,
      );
    }

    if (dto.horario !== undefined) {
      this.logHorarioDebug(
        'actualizar-negocio horario guardado',
        negocio.horario,
        {
          negocioId: negocio.id,
          intervaloReserva: negocio.intervaloReserva,
          reservasActivas: negocio.reservasActivas,
        },
      );
    }

    return negocio;
  }

  // DELETE
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        duenoId: true,
        activo: true,
        eliminadoEn: true,
      },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    const actorIsOwner = n.duenoId === currentUserId;
    const deletedAt = n.eliminadoEn ?? new Date();
    const wasAlreadyDeleted = !n.activo || Boolean(n.eliminadoEn);

    if (isAdmin && !actorIsOwner) {
      await this.prisma.$transaction(async (tx) => {
        await this.softDeleteNegocioGraph(tx, id, deletedAt);
      });

      return {
        ok: true,
        message: wasAlreadyDeleted
          ? 'El negocio ya estaba eliminado.'
          : 'Negocio eliminado correctamente',
        userDeleted: false,
        sessionClosed: false,
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await this.softDeleteNegocioGraph(tx, id, deletedAt);

      const otrosNegociosActivos = await tx.negocio.count({
        where: {
          duenoId: n.duenoId,
          id: { not: id },
          activo: true,
          eliminadoEn: null,
        },
      });

      const userDeleted = otrosNegociosActivos === 0;

      if (userDeleted) {
        await tx.usuario.update({
          where: { id: n.duenoId },
          data: {
            estadoCuenta: EstadoCuenta.ELIMINADA,
            eliminadoEn: deletedAt,
            emailVerificado: false,
          },
        });
      }

      return {
        userDeleted,
        otrosNegociosActivos,
      };
    });

    const message = wasAlreadyDeleted
      ? result.userDeleted
        ? 'La cuenta de negocio ya estaba eliminada.'
        : 'El negocio ya estaba eliminado.'
      : result.userDeleted
        ? 'Cuenta de negocio eliminada correctamente'
        : 'Negocio eliminado, pero el usuario mantiene otros negocios activos.';

    return {
      ok: true,
      message,
      userDeleted: result.userDeleted,
      sessionClosed: actorIsOwner && result.userDeleted,
      remainingActiveBusinesses: result.otrosNegociosActivos,
    };
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
      select: {
        duenoId: true,
        horario: true,
        intervaloReserva: true,
        reservasActivas: true,
      },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    if (
      dto.intervaloReserva === undefined &&
      dto.horario === undefined &&
      dto.reservasActivas === undefined
    ) {
      throw new BadRequestException('Nada que actualizar');
    }

    const horario =
      dto.horario !== undefined
        ? this.normalizeHorarioPayload(dto.horario)
        : this.cleanHorarioForResponse(n.horario);
    const intervaloReserva = dto.intervaloReserva ?? n.intervaloReserva;
    const reservasActivas = dto.reservasActivas ?? n.reservasActivas;
    this.assertReservasConfig(reservasActivas, intervaloReserva, horario);
    this.logHorarioDebug('horario-negocio horario recibido', dto.horario, {
      negocioId: id,
      provided: dto.horario !== undefined,
      intervaloReserva,
      reservasActivas,
    });

    const negocio = await this.prisma.negocio.update({
      where: { id },
      data: {
        ...(dto.intervaloReserva !== undefined
          ? { intervaloReserva: dto.intervaloReserva }
          : {}),
        ...(dto.reservasActivas !== undefined
          ? { reservasActivas: dto.reservasActivas }
          : {}),
        ...(dto.horario !== undefined
          ? {
              horario: this.toPrismaHorarioValue(
                horario && hasOpenDays(horario) ? horario : null,
              ),
            }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        intervaloReserva: true,
        reservasActivas: true,
        horario: true,
      },
    });

    if (dto.horario !== undefined && horario && hasOpenDays(horario)) {
      this.registrarLogroEnSegundoPlano(
        n.duenoId,
        'HORARIO_NEGOCIO_CONFIGURADO',
        id,
      );
    }

    const horarioResponse = this.cleanHorarioForResponse(negocio.horario);

    this.logHorarioDebug('horario-negocio horario guardado', horarioResponse, {
      negocioId: negocio.id,
      intervaloReserva: negocio.intervaloReserva,
      reservasActivas: negocio.reservasActivas,
    });

    return {
      ...negocio,
      horario: horarioResponse,
    };
  }

  // GET HORARIO
  async getHorario(id: number) {
    const neg = await this.prisma.negocio.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        intervaloReserva: true,
        reservasActivas: true,
        horario: true,
      },
    });
    if (!neg) throw new NotFoundException('Negocio no encontrado');
    const horario = this.cleanHorarioForResponse(neg.horario);

    this.logHorarioDebug('get-horario horario devuelto', horario, {
      negocioId: neg.id,
      intervaloReserva: neg.intervaloReserva,
      reservasActivas: neg.reservasActivas,
    });

    return {
      ...neg,
      horario,
    };
  }

  async updateImagenes(
    id: number,
    dto: UpdateNegocioImagenesDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId) {
      throw new ForbiddenException('No eres el dueño');
    }

    if (dto.fotoPerfil === undefined && dto.fotoPortada === undefined) {
      throw new BadRequestException('No hay imagenes para actualizar');
    }

    return this.prisma.negocio.update({
      where: { id },
      data: {
        ...(dto.fotoPerfil !== undefined
          ? { fotoPerfil: dto.fotoPerfil?.trim() ?? null }
          : {}),
        ...(dto.fotoPortada !== undefined
          ? { fotoPortada: dto.fotoPortada?.trim() ?? null }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        fotoPerfil: true,
        fotoPortada: true,
      },
    });
  }

  async seguir(
    negocioId: number,
    actorUserId: number,
    notificacionesActivas?: boolean,
  ) {
    const negocio = await this.prisma.negocio.findFirst({
      where: { id: negocioId, activo: true, eliminadoEn: null },
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

    this.registrarLogroEnSegundoPlano(
      actorUserId,
      'NEGOCIO_SEGUIDO',
      negocioId,
    );
    this.registrarLogroEnSegundoPlano(
      negocio.duenoId,
      'HITO_NEGOCIO',
      negocioId,
    );
    this.registrarLogroNegocioEnSegundoPlano(
      negocioId,
      'NEGOCIO_CONSEGUIR_SEGUIDORES',
      actorUserId,
    );

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
    const negocio = await this.prisma.negocio.findFirst({
      where: { id: negocioId, activo: true, eliminadoEn: null },
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
    const negocio = await this.prisma.negocio.findFirst({
      where: { id: negocioId, activo: true, eliminadoEn: null },
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
      where: {
        usuarioId: actorUserId,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
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

    if (actorUserId && Number.isInteger(actorUserId) && actorUserId > 0) {
      this.registrarLogroEnSegundoPlano(
        actorUserId,
        'VISITA_NEGOCIO',
        negocioId,
      );
      this.registrarLogroEnSegundoPlano(
        actorUserId,
        'VISITA_TODAS_CATEGORIAS',
        negocioId,
      );
      this.registrarLogroEnSegundoPlano(
        actorUserId,
        'VISITA_TODAS_SUBCATEGORIAS',
        negocioId,
      );
    }
    this.registrarLogroNegocioEnSegundoPlano(
      negocioId,
      'NEGOCIO_RECIBIR_VISITAS',
      visita.id,
    );

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
