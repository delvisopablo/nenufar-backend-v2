/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSolicitudProducto, Prisma, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateProductoStockDto } from './dto/update-producto-stock.dto';
import {
  AprobarSolicitudProductoDto,
  CreateSolicitudProductoDto,
} from './dto/create-solicitud-producto.dto';
import { RechazarSolicitudProductoDto } from './dto/rechazar-solicitud-producto.dto';
import {
  buildCodigoProducto,
  mapProductoCatalogo,
  mapSolicitudProductoCatalogo,
  normalizeCatalogCode,
  productoCatalogSelect,
  solicitudProductoSelect,
} from './producto-catalogo.util';

const productoConNegocioSelect = {
  ...productoCatalogSelect,
  negocio: {
    select: {
      id: true,
      nombre: true,
      slug: true,
      duenoId: true,
      fotoPerfil: true,
      fotoPortada: true,
      nenufarActivo: true,
      nenufarAsset: true,
      activo: true,
    },
  },
} satisfies Prisma.ProductoSelect;

type ProductoConNegocioRecord = Prisma.ProductoGetPayload<{
  select: typeof productoConNegocioSelect;
}>;

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

function trimOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

function mapProductoConNegocio(
  producto: ProductoConNegocioRecord,
  favorito = false,
) {
  const { negocio, ...productoCatalogo } = producto;
  return {
    ...mapProductoCatalogo(productoCatalogo),
    negocio,
    favorito,
  };
}

@Injectable()
export class ProductoService {
  constructor(private prisma: PrismaService) {}

  private async assertCanManageNegocio(
    negocioId: number,
    currentUserId: number,
    isAdmin = false,
  ) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, duenoId: true, activo: true, eliminadoEn: true },
    });

    if (!negocio || !negocio.activo || negocio.eliminadoEn) {
      throw new NotFoundException('Negocio no encontrado');
    }

    if (isAdmin || negocio.duenoId === currentUserId) {
      return negocio;
    }

    const actor = await this.prisma.usuario.findUnique({
      where: { id: currentUserId },
      select: { rolGlobal: true },
    });

    if (
      actor?.rolGlobal === RolGlobal.ADMIN ||
      actor?.rolGlobal === RolGlobal.MODERADOR
    ) {
      return negocio;
    }

    throw new ForbiddenException('No eres el dueño');
  }

  private async assertResenaPerteneceAUsuario(
    tx: Prisma.TransactionClient,
    resenaId: number,
    negocioId: number,
    userId: number,
  ) {
    const resena = await tx.resena.findFirst({
      where: {
        id: resenaId,
        negocioId,
        usuarioId: userId,
      },
      select: { id: true },
    });

    if (!resena) {
      throw new BadRequestException(
        'La reseña indicada no existe o no pertenece al usuario',
      );
    }
  }

  private async getFavoritosProductoIds(
    usuarioId: number | undefined,
    productoIds: number[],
  ) {
    if (!usuarioId || productoIds.length === 0) {
      return new Set<number>();
    }

    const favoritos = await this.prisma.productoFavorito.findMany({
      where: {
        usuarioId,
        productoId: { in: [...new Set(productoIds)] },
      },
      select: { productoId: true },
    });

    return new Set(favoritos.map((favorito) => favorito.productoId));
  }

  private async assertProductoVisible(productoId: number) {
    const producto = await this.prisma.producto.findFirst({
      where: {
        id: productoId,
        activo: true,
        eliminadoEn: null,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: productoConNegocioSelect,
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  private async createCatalogProduct(
    tx: Prisma.TransactionClient,
    negocioId: number,
    dto: {
      nombre: string;
      descripcion?: string | null;
      precio?: number | Prisma.Decimal | null;
      foto?: string | null;
      codigoProducto?: string | null;
      codigoSKU?: string | null;
      stockDisponible?: number | null;
      stockReservado?: number | null;
    },
    options?: {
      allowNullPrice?: boolean;
    },
  ) {
    const nombre = dto.nombre.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }

    if (
      (dto.precio === undefined || dto.precio === null) &&
      !options?.allowNullPrice
    ) {
      throw new BadRequestException('El precio del producto es obligatorio');
    }

    if (dto.precio !== undefined && dto.precio !== null) {
      const precioNumerico = Number(dto.precio);
      if (Number.isNaN(precioNumerico) || precioNumerico < 0) {
        throw new BadRequestException('El precio no puede ser negativo');
      }
    }

    const stockDisponible = dto.stockDisponible ?? 0;
    const stockReservado = dto.stockReservado ?? 0;
    if (stockDisponible < 0 || stockReservado < 0) {
      throw new BadRequestException(
        'Los valores de stock no pueden ser negativos',
      );
    }
    if (stockReservado > stockDisponible) {
      throw new BadRequestException(
        'stockReservado no puede superar stockDisponible',
      );
    }

    const codigoProducto = normalizeCatalogCode(dto.codigoProducto);
    const codigoSKU = normalizeCatalogCode(dto.codigoSKU);

    try {
      let producto = await tx.producto.create({
        data: {
          negocioId,
          nombre,
          descripcion: trimOptionalString(dto.descripcion ?? undefined),
          precio: dto.precio ?? null,
          foto: trimOptionalString(dto.foto ?? undefined),
          codigoProducto,
          codigoSKU: codigoSKU ?? codigoProducto,
          stockDisponible,
          stockReservado,
        },
        select: productoCatalogSelect,
      });

      if (!producto.codigoProducto) {
        const generatedCode = buildCodigoProducto(producto.id);
        producto = await tx.producto.update({
          where: { id: producto.id },
          data: {
            codigoProducto: generatedCode,
            ...(producto.codigoSKU ? {} : { codigoSKU: generatedCode }),
          },
          select: productoCatalogSelect,
        });
      }

      return producto;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un producto con ese código en el catálogo',
        );
      }
      throw error;
    }
  }

  /** Lista productos activos de un negocio */
  async listByNegocio(
    negocioId: number,
    q?: string,
    page?: number | string,
    limit?: number | string,
    usuarioId?: number,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const term = q?.trim();
    const where: Prisma.ProductoWhereInput = {
      negocioId,
      activo: true,
      eliminadoEn: null,
      negocio: {
        activo: true,
        eliminadoEn: null,
      },
      ...(term
        ? {
            OR: [
              { nombre: { contains: term, mode: 'insensitive' } },
              { descripcion: { contains: term, mode: 'insensitive' } },
              { codigoProducto: { contains: term, mode: 'insensitive' } },
              { codigoSKU: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        select: productoCatalogSelect,
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.producto.count({ where }),
    ]);
    const favoritos = await this.getFavoritosProductoIds(
      usuarioId,
      items.map((item) => item.id),
    );

    return {
      items: items.map((item) => ({
        ...mapProductoCatalogo(item),
        favorito: favoritos.has(item.id),
      })),
      total,
      page: p,
      limit: l,
    };
  }

  async search(q: string, limit?: number | string, usuarioId?: number) {
    const term = q.trim();
    if (!term) {
      return { items: [], total: 0 };
    }

    const take = Math.max(1, Math.min(50, Number(limit ?? 20) | 0));
    const items = await this.prisma.producto.findMany({
      where: {
        activo: true,
        eliminadoEn: null,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
        OR: [
          { nombre: { contains: term, mode: 'insensitive' } },
          { descripcion: { contains: term, mode: 'insensitive' } },
          { codigoProducto: { contains: term, mode: 'insensitive' } },
          { codigoSKU: { contains: term, mode: 'insensitive' } },
          {
            negocio: {
              nombre: { contains: term, mode: 'insensitive' },
            },
          },
          {
            negocio: {
              slug: { contains: term, mode: 'insensitive' },
            },
          },
        ],
      },
      select: {
        ...productoCatalogSelect,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            nenufarActivo: true,
            nenufarAsset: true,
          },
        },
      },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      take,
    });
    const favoritos = await this.getFavoritosProductoIds(
      usuarioId,
      items.map((item) => item.id),
    );

    return {
      items: items.map((item) => {
        const producto = {
          ...mapProductoCatalogo(item),
          favorito: favoritos.has(item.id),
        };
        return {
          ...producto,
          producto,
          negocio: item.negocio,
          precio: producto.precio,
          slug: item.negocio.slug,
          nenufarActivo:
            item.negocio.nenufarActivo ?? item.negocio.nenufarAsset ?? null,
          nenufarAsset: item.negocio.nenufarAsset,
        };
      }),
      total: items.length,
    };
  }

  async getById(id: number, usuarioId?: number) {
    const prod = await this.prisma.producto.findUnique({
      where: { id },
      select: {
        ...productoCatalogSelect,
        negocio: {
          select: { id: true, nombre: true, slug: true, duenoId: true },
        },
      },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    const favoritos = await this.getFavoritosProductoIds(usuarioId, [prod.id]);
    return {
      ...mapProductoCatalogo(prod),
      negocio: prod.negocio,
      favorito: favoritos.has(prod.id),
    };
  }

  async listFavoritos(usuarioId: number) {
    const favoritos = await this.prisma.productoFavorito.findMany({
      where: {
        usuarioId,
        producto: {
          activo: true,
          eliminadoEn: null,
          negocio: {
            activo: true,
            eliminadoEn: null,
          },
        },
      },
      select: {
        creadoEn: true,
        producto: { select: productoConNegocioSelect },
      },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    });

    return {
      items: favoritos.map((favorito) => ({
        ...mapProductoConNegocio(favorito.producto, true),
        favoritoCreadoEn: favorito.creadoEn,
      })),
      total: favoritos.length,
    };
  }

  async addFavorito(productoId: number, usuarioId: number) {
    const producto = await this.assertProductoVisible(productoId);
    const favorito = await this.prisma.productoFavorito.upsert({
      where: {
        usuarioId_productoId: {
          usuarioId,
          productoId,
        },
      },
      update: {},
      create: {
        usuarioId,
        productoId,
      },
      select: { creadoEn: true },
    });

    return {
      favorito: true,
      favoritoCreadoEn: favorito.creadoEn,
      producto: mapProductoConNegocio(producto, true),
    };
  }

  async removeFavorito(productoId: number, usuarioId: number) {
    await this.prisma.productoFavorito.deleteMany({
      where: { usuarioId, productoId },
    });

    return { favorito: false };
  }

  /** Crea producto dentro de un negocio (solo dueño o admin) */
  async create(
    negocioId: number,
    dto: CreateProductoDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    await this.assertCanManageNegocio(negocioId, currentUserId, isAdmin);

    const producto = await this.prisma.$transaction((tx) =>
      this.createCatalogProduct(tx, negocioId, dto),
    );

    return mapProductoCatalogo(producto);
  }

  /** Actualiza producto (solo dueño del negocio o admin) */
  async update(
    id: number,
    dto: UpdateProductoDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const prod = await this.prisma.producto.findUnique({
      where: { id },
      select: {
        negocioId: true,
        stockDisponible: true,
        stockReservado: true,
      },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    await this.assertCanManageNegocio(prod.negocioId, currentUserId, isAdmin);

    const nextStockDisponible = dto.stockDisponible ?? prod.stockDisponible;
    const nextStockReservado = dto.stockReservado ?? prod.stockReservado;
    if (nextStockDisponible < 0 || nextStockReservado < 0) {
      throw new BadRequestException(
        'Los valores de stock no pueden ser negativos',
      );
    }
    if (nextStockReservado > nextStockDisponible) {
      throw new BadRequestException(
        'stockReservado no puede superar stockDisponible',
      );
    }

    try {
      if (dto.nombre !== undefined && !dto.nombre.trim()) {
        throw new BadRequestException(
          'El nombre del producto no puede estar vacío',
        );
      }

      const updated = await this.prisma.producto.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: trimOptionalString(dto.descripcion) }
            : {}),
          ...(dto.precio !== undefined ? { precio: dto.precio } : {}),
          ...(dto.foto !== undefined
            ? { foto: trimOptionalString(dto.foto) }
            : {}),
          ...(dto.codigoProducto !== undefined
            ? {
                codigoProducto: normalizeCatalogCode(dto.codigoProducto),
              }
            : {}),
          ...(dto.codigoSKU !== undefined
            ? { codigoSKU: normalizeCatalogCode(dto.codigoSKU) }
            : {}),
          ...(dto.stockDisponible !== undefined
            ? { stockDisponible: dto.stockDisponible }
            : {}),
          ...(dto.stockReservado !== undefined
            ? { stockReservado: dto.stockReservado }
            : {}),
        },
        select: productoCatalogSelect,
      });

      return mapProductoCatalogo(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un producto con ese código en el catálogo',
        );
      }
      throw error;
    }
  }

  /** Borrado lógico del producto (solo dueño o admin) */
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const prod = await this.prisma.producto.findUnique({
      where: { id },
      select: { id: true, negocioId: true },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    await this.assertCanManageNegocio(prod.negocioId, currentUserId, isAdmin);

    const deleted = await this.prisma.producto.update({
      where: { id },
      data: {
        activo: false,
        eliminadoEn: new Date(),
      },
      select: productoCatalogSelect,
    });

    return mapProductoCatalogo(deleted);
  }

  async adjustStock(
    id: number,
    dto: UpdateProductoStockDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    if (dto.deltaDisponible === undefined && dto.deltaReservado === undefined) {
      throw new BadRequestException(
        'Debes indicar al menos un ajuste de stock',
      );
    }

    const producto = await this.prisma.producto.findUnique({
      where: { id },
      select: {
        id: true,
        negocioId: true,
        stockDisponible: true,
        stockReservado: true,
      },
    });

    if (!producto) throw new NotFoundException('Producto no encontrado');
    await this.assertCanManageNegocio(
      producto.negocioId,
      currentUserId,
      isAdmin,
    );

    const nextStockDisponible =
      producto.stockDisponible + (dto.deltaDisponible ?? 0);
    const nextStockReservado =
      producto.stockReservado + (dto.deltaReservado ?? 0);

    if (nextStockDisponible < 0 || nextStockReservado < 0) {
      throw new BadRequestException('El ajuste dejaría el stock en negativo');
    }

    if (nextStockReservado > nextStockDisponible) {
      throw new BadRequestException(
        'stockReservado no puede superar stockDisponible',
      );
    }

    const updated = await this.prisma.producto.update({
      where: { id },
      data: {
        stockDisponible: nextStockDisponible,
        stockReservado: nextStockReservado,
      },
      select: productoCatalogSelect,
    });

    return {
      ...mapProductoCatalogo(updated),
      ajuste: {
        deltaDisponible: dto.deltaDisponible ?? 0,
        deltaReservado: dto.deltaReservado ?? 0,
        motivo: dto.motivo ?? null,
      },
    };
  }

  async crearSolicitud(
    negocioId: number,
    dto: CreateSolicitudProductoDto,
    userId: number,
  ) {
    const nombre = dto.nombre.trim();
    if (!nombre) {
      throw new BadRequestException(
        'El nombre de la sugerencia es obligatorio',
      );
    }

    const solicitud = await this.prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.findFirst({
        where: {
          id: negocioId,
          activo: true,
          eliminadoEn: null,
        },
        select: { id: true },
      });

      if (!negocio) {
        throw new NotFoundException('Negocio no encontrado');
      }

      if (dto.resenaId) {
        await this.assertResenaPerteneceAUsuario(
          tx,
          dto.resenaId,
          negocioId,
          userId,
        );
      }

      return tx.solicitudProductoCatalogo.create({
        data: {
          negocioId,
          usuarioId: userId,
          resenaId: dto.resenaId ?? null,
          nombre,
          descripcion: trimOptionalString(dto.descripcion),
          precioSugerido: dto.precioSugerido ?? null,
        },
        select: solicitudProductoSelect,
      });
    });

    return mapSolicitudProductoCatalogo(solicitud);
  }

  async listarSolicitudes(
    negocioId: number,
    actorUserId: number,
    isAdmin = false,
    estado?: EstadoSolicitudProducto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId, isAdmin);

    const items = await this.prisma.solicitudProductoCatalogo.findMany({
      where: {
        negocioId,
        ...(estado ? { estado } : {}),
      },
      select: {
        ...solicitudProductoSelect,
        usuario: {
          select: { id: true, nombre: true, nickname: true, foto: true },
        },
        producto: {
          select: productoCatalogSelect,
        },
      },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    });

    return items.map((item) => ({
      ...mapSolicitudProductoCatalogo(item),
      producto: item.producto ? mapProductoCatalogo(item.producto) : null,
      usuario: item.usuario,
    }));
  }

  async aprobarSolicitud(
    id: number,
    dto: AprobarSolicitudProductoDto | undefined,
    actorUserId: number,
    isAdmin = false,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudProductoCatalogo.findUnique({
        where: { id },
        select: solicitudProductoSelect,
      });

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada');
      }

      await this.assertCanManageNegocio(
        solicitud.negocioId,
        actorUserId,
        isAdmin,
      );

      if (solicitud.estado !== EstadoSolicitudProducto.PENDIENTE) {
        throw new BadRequestException(
          'Solo se pueden aprobar solicitudes pendientes',
        );
      }

      const producto = await this.createCatalogProduct(
        tx,
        solicitud.negocioId,
        {
          nombre: solicitud.nombre,
          descripcion: solicitud.descripcion,
          precio: dto?.precio ?? solicitud.precioSugerido ?? 0,
          foto: dto?.foto,
        },
      );

      if (solicitud.resenaId) {
        await tx.resenaProducto.upsert({
          where: {
            resenaId_productoId: {
              resenaId: solicitud.resenaId,
              productoId: producto.id,
            },
          },
          update: {},
          create: {
            resenaId: solicitud.resenaId,
            productoId: producto.id,
          },
        });
      }

      const updatedSolicitud = await tx.solicitudProductoCatalogo.update({
        where: { id: solicitud.id },
        data: {
          estado: EstadoSolicitudProducto.APROBADA,
          motivoRechazo: null,
          productoId: producto.id,
        },
        select: solicitudProductoSelect,
      });

      return {
        solicitud: updatedSolicitud,
        producto,
      };
    });

    return {
      solicitud: mapSolicitudProductoCatalogo(result.solicitud),
      producto: mapProductoCatalogo(result.producto),
    };
  }

  async rechazarSolicitud(
    id: number,
    dto: RechazarSolicitudProductoDto,
    actorUserId: number,
    isAdmin = false,
  ) {
    const solicitud = await this.prisma.solicitudProductoCatalogo.findUnique({
      where: { id },
      select: solicitudProductoSelect,
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.assertCanManageNegocio(
      solicitud.negocioId,
      actorUserId,
      isAdmin,
    );

    if (solicitud.estado !== EstadoSolicitudProducto.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }

    const updated = await this.prisma.solicitudProductoCatalogo.update({
      where: { id },
      data: {
        estado: EstadoSolicitudProducto.RECHAZADA,
        motivoRechazo: trimOptionalString(dto.motivoRechazo) ?? null,
      },
      select: solicitudProductoSelect,
    });

    return mapSolicitudProductoCatalogo(updated);
  }
}
