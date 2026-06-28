import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ContenidoEstado, Prisma, TipoDescuento } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { ValidarPromocionDto } from './dto/validar-promocion.dto';
import { LogroEngineService } from '../logro/logro-engine.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import {
  mapNegocioPublic,
  negocioPublicSelect,
} from '../negocio/negocio-public.util';
import { createFieldError } from '../common/errors/app-error';

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

function toLimit(limit?: number | string, fallback = 12) {
  return Math.max(1, Math.min(50, Number(limit ?? fallback) | 0));
}

function promotionTitleRequiredError(
  message = 'El título de la promoción es obligatorio.',
) {
  return createFieldError(
    'PROMOTION_TITLE_REQUIRED',
    message,
    'titulo',
    message,
  );
}

function invalidDiscountError(message = 'El descuento no es válido.') {
  return createFieldError('INVALID_DISCOUNT', message, 'descuento', message);
}

function invalidPromotionDateError(
  message = 'La fecha de promoción no es válida.',
  field = 'fechaCaducidad',
) {
  return createFieldError('INVALID_PROMOTION_DATE', message, field, message);
}

const promocionPublicSelect = {
  id: true,
  titulo: true,
  descripcion: true,
  descuento: true,
  tipoDescuento: true,
  fechaInicio: true,
  fechaCaducidad: true,
  codigo: true,
  stockMaximo: true,
  usosMaximos: true,
  usosActuales: true,
  negocioId: true,
  productoId: true,
  negocio: {
    select: negocioPublicSelect,
  },
  producto: {
    select: {
      id: true,
      nombre: true,
      precio: true,
      foto: true,
      codigoProducto: true,
    },
  },
  pack: {
    select: {
      id: true,
      nombre: true,
      precio: true,
      foto: true,
      codigoProducto: true,
    },
  },
} satisfies Prisma.PromocionSelect;

@Injectable()
export class PromocionService {
  constructor(
    private prisma: PrismaService,
    private readonly notificaciones: NotificacionService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private mapPromocion<T extends Record<string, any>>(promocion: T) {
    return {
      ...promocion,
      negocio: mapNegocioPublic(promocion.negocio),
    };
  }

  private parsePromotionDate(value: string, field: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw invalidPromotionDateError(
        'La fecha de promoción no es válida.',
        field,
      );
    }

    return date;
  }

  private validateDiscount(descuento: number, tipo?: TipoDescuento | null) {
    const value = Number(descuento);
    if (!Number.isFinite(value) || value < 0) {
      throw invalidDiscountError();
    }

    if (
      (tipo ?? TipoDescuento.PORCENTAJE) === TipoDescuento.PORCENTAJE &&
      value > 100
    ) {
      throw invalidDiscountError(
        'El descuento porcentual no puede superar 100.',
      );
    }
  }

  private validatePromotionDates(
    fechaInicio: Date | null,
    fechaCaducidad: Date,
  ) {
    if (Number.isNaN(fechaCaducidad.getTime())) {
      throw invalidPromotionDateError();
    }

    if (fechaCaducidad.getTime() <= Date.now()) {
      throw invalidPromotionDateError('La fecha de caducidad debe ser futura.');
    }

    if (fechaInicio && fechaInicio.getTime() >= fechaCaducidad.getTime()) {
      throw invalidPromotionDateError(
        'La fecha de inicio debe ser anterior a la fecha de caducidad.',
        'fechaInicio',
      );
    }
  }

  private async assertProductosDeNegocio(
    negocioId: number,
    productoIds: number[],
  ) {
    const uniqueProductoIds = [...new Set(productoIds.filter(Boolean))];
    if (uniqueProductoIds.length === 0) {
      return;
    }

    const productos = await this.prisma.producto.findMany({
      where: {
        id: { in: uniqueProductoIds },
        negocioId,
        activo: true,
        eliminadoEn: null,
      },
      select: { id: true },
    });

    if (productos.length !== uniqueProductoIds.length) {
      throw createFieldError(
        'RELATED_RECORD_NOT_FOUND',
        'El producto asociado no existe o no pertenece al negocio.',
        'productoId',
        'El producto asociado no existe o no pertenece al negocio.',
      );
    }
  }

  async crearPromocion(dto: CreatePromocionDto, usuarioId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: dto.negocioId },
    });

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (negocio.duenoId !== usuarioId)
      throw new ForbiddenException(
        'No puedes crear promociones para este negocio',
      );

    const titulo = dto.titulo.trim();
    if (!titulo) {
      throw promotionTitleRequiredError();
    }

    const fechaInicio = dto.fechaInicio
      ? this.parsePromotionDate(dto.fechaInicio, 'fechaInicio')
      : null;
    const fechaCaducidad = this.parsePromotionDate(
      dto.fechaCaducidad,
      'fechaCaducidad',
    );
    this.validateDiscount(dto.descuento, dto.tipoDescuento);
    this.validatePromotionDates(fechaInicio, fechaCaducidad);
    await this.assertProductosDeNegocio(dto.negocioId, [
      ...(dto.productoId ? [dto.productoId] : []),
      ...(dto.packIds ?? []),
    ]);

    const promocion = await this.prisma.promocion.create({
      data: {
        titulo,
        descripcion: normalizeOptionalString(dto.descripcion),
        fechaInicio,
        fechaCaducidad,
        descuento: dto.descuento,
        tipoDescuento: dto.tipoDescuento,
        producto: dto.productoId
          ? { connect: { id: dto.productoId } }
          : undefined,
        negocio: { connect: { id: dto.negocioId } },
        activa: dto.activa ?? true,
        estado: dto.estado ?? ContenidoEstado.PUBLICADO,
        codigo: normalizeOptionalString(dto.codigo),
        stockMaximo: dto.stockMaximo ?? null,
        usosMaximos: dto.usosMaximos ?? null,
        pack: {
          connect: dto.packIds?.map((id) => ({ id })) || [],
        },
      },
    });

    if (promocion.activa && promocion.estado === ContenidoEstado.PUBLICADO) {
      void this.notificaciones
        .fanoutNegocio({
          negocioId: dto.negocioId,
          tipo: 'PROMOCION',
          titulo: `Nueva promoción: ${promocion.titulo}`,
          contenido: promocion.descripcion ?? undefined,
          link: `/promociones/${promocion.id}`,
          promocionId: promocion.id,
        })
        .catch(() => undefined);
    }

    void this.logroEngine
      .registrarAccionNegocio({
        negocioId: dto.negocioId,
        accion: 'NEGOCIO_CREAR_PROMOCIONES',
        refId: promocion.id,
      })
      .catch(() => undefined);

    return promocion;
  }

  async actualizarPromocion(
    id: number,
    dto: UpdatePromocionDto,
    usuarioId: number,
  ) {
    const promo = await this.prisma.promocion.findUnique({
      where: { id },
      include: { negocio: true },
    });

    if (!promo) throw new NotFoundException('Promoción no encontrada');
    if (promo.negocio.duenoId !== usuarioId)
      throw new ForbiddenException('No puedes editar esta promoción');

    let titulo: string | undefined;
    if (dto.titulo !== undefined) {
      titulo = dto.titulo.trim();
      if (!titulo) {
        throw promotionTitleRequiredError(
          'El título de la promoción no puede estar vacío.',
        );
      }
    }

    const fechaInicio =
      dto.fechaInicio !== undefined
        ? dto.fechaInicio
          ? this.parsePromotionDate(dto.fechaInicio, 'fechaInicio')
          : null
        : undefined;
    const fechaCaducidad =
      dto.fechaCaducidad !== undefined
        ? this.parsePromotionDate(dto.fechaCaducidad, 'fechaCaducidad')
        : undefined;

    if (dto.fechaInicio !== undefined || dto.fechaCaducidad !== undefined) {
      this.validatePromotionDates(
        fechaInicio !== undefined ? fechaInicio : promo.fechaInicio,
        fechaCaducidad ?? promo.fechaCaducidad,
      );
    }

    if (dto.descuento !== undefined || dto.tipoDescuento !== undefined) {
      this.validateDiscount(
        dto.descuento ?? Number(promo.descuento),
        dto.tipoDescuento ?? promo.tipoDescuento,
      );
    }

    await this.assertProductosDeNegocio(promo.negocioId, [
      ...(dto.productoId ? [dto.productoId] : []),
      ...(dto.packIds ?? []),
    ]);

    return this.prisma.promocion.update({
      where: { id },
      data: {
        ...(titulo !== undefined ? { titulo } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: normalizeOptionalString(dto.descripcion) }
          : {}),
        fechaCaducidad,
        ...(dto.fechaInicio !== undefined
          ? {
              fechaInicio,
            }
          : {}),
        ...(dto.descuento !== undefined ? { descuento: dto.descuento } : {}),
        ...(dto.tipoDescuento !== undefined
          ? { tipoDescuento: dto.tipoDescuento }
          : {}),
        ...(dto.codigo !== undefined
          ? { codigo: normalizeOptionalString(dto.codigo) }
          : {}),
        ...(dto.stockMaximo !== undefined
          ? { stockMaximo: dto.stockMaximo }
          : {}),
        ...(dto.usosMaximos !== undefined
          ? { usosMaximos: dto.usosMaximos }
          : {}),
        ...(dto.activa !== undefined ? { activa: dto.activa } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.productoId !== undefined
          ? { producto: { connect: { id: dto.productoId } } }
          : {}),
        pack: dto.packIds
          ? {
              set: dto.packIds.map((id) => ({ id })),
            }
          : undefined,
      },
    });
  }

  async listarActivas(limit?: number | string) {
    const promociones = await this.prisma.promocion.findMany({
      where: {
        activa: true,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        fechaCaducidad: { gte: new Date() },
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: promocionPublicSelect,
      orderBy: { fechaCaducidad: 'asc' },
      take: toLimit(limit, 10),
    });

    return promociones.map((promocion) => this.mapPromocion(promocion));
  }

  async listarDisponibles(limit?: number | string) {
    const promociones = await this.prisma.promocion.findMany({
      where: {
        activa: true,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        fechaCaducidad: {
          gte: new Date(),
        },
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: promocionPublicSelect,
      orderBy: { fechaCaducidad: 'asc' },
      take: toLimit(limit, 12),
    });

    return promociones.map((promocion) => this.mapPromocion(promocion));
  }

  async search(q = '', limit?: number | string) {
    const term = q.trim();
    const promociones = await this.prisma.promocion.findMany({
      where: {
        activa: true,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        fechaCaducidad: { gte: new Date() },
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
        ...(term
          ? {
              OR: [
                { titulo: { contains: term, mode: 'insensitive' as const } },
                {
                  descripcion: {
                    contains: term,
                    mode: 'insensitive' as const,
                  },
                },
                { codigo: { contains: term, mode: 'insensitive' as const } },
                {
                  negocio: {
                    nombre: { contains: term, mode: 'insensitive' as const },
                  },
                },
              ],
            }
          : {}),
      },
      select: promocionPublicSelect,
      orderBy: [{ fechaCaducidad: 'asc' }, { id: 'asc' }],
      take: toLimit(limit, 10),
    });

    return promociones.map((promocion) => this.mapPromocion(promocion));
  }

  async listarPorNegocio(negocioId: number, limit?: number | string) {
    const promociones = await this.prisma.promocion.findMany({
      where: { negocioId },
      select: promocionPublicSelect,
      orderBy: [{ fechaCaducidad: 'asc' }, { id: 'asc' }],
      take: toLimit(limit, 50),
    });

    return promociones.map((promocion) => this.mapPromocion(promocion));
  }

  async listarPublicasPorNegocio(negocioId: number, limit?: number | string) {
    const promociones = await this.prisma.promocion.findMany({
      where: {
        negocioId,
        activa: true,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: promocionPublicSelect,
      orderBy: { fechaCaducidad: 'asc' },
      take: toLimit(limit, 12),
    });

    return promociones.map((promocion) => this.mapPromocion(promocion));
  }

  async validarPromocion(
    id: number,
    dto: ValidarPromocionDto,
    usuarioId?: number,
  ) {
    const promo = await this.prisma.promocion.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        codigo: true,
        activa: true,
        estado: true,
        fechaInicio: true,
        fechaCaducidad: true,
        usosActuales: true,
        usosMaximos: true,
        tipoDescuento: true,
        descuento: true,
      },
    });

    if (!promo) {
      return { valida: false, motivos: ['Promoción no encontrada'] };
    }

    const motivos: string[] = [];
    const ahora = new Date();

    if (!promo.activa) {
      motivos.push('La promoción no está activa');
    }

    if (promo.estado !== ContenidoEstado.PUBLICADO) {
      motivos.push('La promoción no está publicada');
    }

    if (promo.fechaInicio && ahora < promo.fechaInicio) {
      motivos.push('La promoción todavía no ha comenzado');
    }

    if (ahora > promo.fechaCaducidad) {
      motivos.push('La promoción ha caducado');
    }

    if (promo.usosMaximos !== null && promo.usosActuales >= promo.usosMaximos) {
      motivos.push('La promoción ha agotado sus usos disponibles');
    }

    if (promo.codigo) {
      if (!dto.codigo) {
        motivos.push('La promoción requiere código');
      } else if (promo.codigo.toLowerCase() !== dto.codigo.toLowerCase()) {
        motivos.push('El código de promoción no es válido');
      }
    }

    const result = {
      valida: motivos.length === 0,
      motivos,
      promocion: {
        id: promo.id,
        titulo: promo.titulo,
        tipoDescuento: promo.tipoDescuento,
        descuento: promo.descuento,
        fechaCaducidad: promo.fechaCaducidad,
      },
    };

    if (result.valida && Number.isInteger(usuarioId) && usuarioId! > 0) {
      void this.logroEngine
        .registrarAccion({
          usuarioId: usuarioId!,
          accion: 'PROMOCION_CANJEADA',
          refId: promo.id,
        })
        .catch(() => undefined);
    }

    return result;
  }

  async borrarPromocion(id: number, usuarioId: number) {
    const promo = await this.prisma.promocion.findUnique({
      where: { id },
      include: { negocio: true },
    });

    if (!promo) throw new NotFoundException('Promoción no encontrada');
    if (promo.negocio.duenoId !== usuarioId)
      throw new ForbiddenException('No puedes borrar esta promoción');

    return this.prisma.promocion.delete({ where: { id } });
  }
}
