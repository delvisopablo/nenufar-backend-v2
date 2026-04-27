import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CompraEstado, PagoEstado, Prisma, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardRangeDto } from './dto/dashboard-range.dto';

function decimalToNumber(value?: Prisma.Decimal | null) {
  if (!value) return 0;
  return Number(value.toString());
}

function groupCount(
  value?: true | { id?: number; _all?: number } | null,
) {
  if (value && typeof value === 'object') {
    return value.id ?? value._all ?? 0;
  }
  return 0;
}

function startOfDay(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

type DashboardPeriod = {
  from: Date;
  to: Date;
  days: number;
};

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async assertCanManageNegocio(negocioId: number, actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [negocio, actor, miembro] = await this.prisma.$transaction([
      this.prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, duenoId: true, nombre: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
      this.prisma.negocioMiembro.findUnique({
        where: {
          negocioId_usuarioId: {
            negocioId,
            usuarioId: actorUserId,
          },
        },
        select: { usuarioId: true },
      }),
    ]);

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (!actor) throw new UnauthorizedException('Usuario no autenticado');

    if (
      negocio.duenoId !== actorUserId &&
      !miembro &&
      actor.rolGlobal !== RolGlobal.ADMIN &&
      actor.rolGlobal !== RolGlobal.MODERADOR
    ) {
      throw new ForbiddenException('No tienes permisos para ver este dashboard');
    }

    return negocio;
  }

  private resolvePeriod(query: DashboardRangeDto): DashboardPeriod {
    const today = new Date();
    const to = query.to ? endOfDay(query.to) : endOfDay(today);

    if (query.from) {
      const from = startOfDay(query.from);
      const days = Math.max(
        1,
        Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
      return { from, to, days };
    }

    const days = Math.max(1, query.days ?? 30);
    const from = startOfDay(to);
    from.setDate(from.getDate() - (days - 1));
    return { from, to, days };
  }

  private periodWhere(period: DashboardPeriod) {
    return {
      gte: period.from,
      lte: period.to,
    };
  }

  async getResumen(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    const negocio = await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [ventas, pedidosTotal, reservasTotal, visitasTotal] =
      await this.prisma.$transaction([
        this.prisma.compra.aggregate({
          where: {
            negocioId,
            estado: CompraEstado.COMPLETADA,
            creadoEn: this.periodWhere(period),
          },
          _sum: { total: true },
          _count: { _all: true },
        }),
        this.prisma.pedido.count({
          where: { negocioId, creadoEn: this.periodWhere(period) },
        }),
        this.prisma.reserva.count({
          where: { negocioId, creadoEn: this.periodWhere(period) },
        }),
        this.prisma.visitaNegocio.count({
          where: { negocioId, creadoEn: this.periodWhere(period) },
        }),
      ]);

    const ventasTotal = decimalToNumber(ventas._sum.total);
    const comprasCompletadas = ventas._count._all;

    return {
      negocio: { id: negocio.id, nombre: negocio.nombre },
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      kpis: {
        ventasTotal,
        comprasCompletadas,
        pedidosTotal,
        reservasTotal,
        visitasTotal,
        ticketMedio:
          comprasCompletadas > 0 ? ventasTotal / comprasCompletadas : 0,
      },
    };
  }

  async getVentas(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const compras = await this.prisma.compra.findMany({
      where: {
        negocioId,
        estado: CompraEstado.COMPLETADA,
        creadoEn: this.periodWhere(period),
      },
      select: {
        creadoEn: true,
        total: true,
        moneda: true,
      },
      orderBy: { creadoEn: 'asc' },
    });

    const series = new Map<
      string,
      { fecha: string; moneda: string; total: number; compras: number }
    >();

    for (const compra of compras) {
      const fecha = ymd(compra.creadoEn);
      const key = `${fecha}:${compra.moneda}`;
      const current = series.get(key) ?? {
        fecha,
        moneda: compra.moneda,
        total: 0,
        compras: 0,
      };
      current.total += decimalToNumber(compra.total);
      current.compras += 1;
      series.set(key, current);
    }

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      serie: Array.from(series.values()),
    };
  }

  async getIngresos(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [comprasPorMoneda, pagosPorMoneda] = await this.prisma.$transaction([
      this.prisma.compra.groupBy({
        by: ['moneda'],
        orderBy: { moneda: 'asc' },
        where: {
          negocioId,
          estado: CompraEstado.COMPLETADA,
          creadoEn: this.periodWhere(period),
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.pago.groupBy({
        by: ['moneda'],
        orderBy: { moneda: 'asc' },
        where: {
          compra: { negocioId },
          estado: PagoEstado.PAGADO,
          creadoEn: this.periodWhere(period),
        },
        _sum: { cantidad: true },
        _count: { id: true },
      }),
    ]);

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      comprasCompletadas: comprasPorMoneda.map((item) => ({
        moneda: item.moneda,
        total: decimalToNumber(item._sum?.total),
        count: groupCount(item._count),
      })),
      pagosCobrados: pagosPorMoneda.map((item) => ({
        moneda: item.moneda,
        total: decimalToNumber(item._sum?.cantidad),
        count: groupCount(item._count),
      })),
    };
  }

  async getPedidos(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [counts, ultimosPedidos] = await this.prisma.$transaction([
      this.prisma.pedido.groupBy({
        by: ['estado'],
        orderBy: { estado: 'asc' },
        where: {
          negocioId,
          creadoEn: this.periodWhere(period),
        },
        _count: { id: true },
      }),
      this.prisma.pedido.findMany({
        where: { negocioId },
        include: {
          usuario: {
            select: { id: true, nombre: true, nickname: true, email: true },
          },
          pedidoProductos: {
            include: {
              producto: {
                select: { id: true, nombre: true, codigoSKU: true },
              },
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        take: 10,
      }),
    ]);

    const conteo = {
      PENDIENTE: 0,
      COMPLETADO: 0,
      CANCELADO: 0,
    };

    for (const item of counts) {
      conteo[item.estado] = groupCount(item._count);
    }

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      conteo,
      ultimosPedidos,
    };
  }

  async getReservas(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [counts, proximasReservas] = await this.prisma.$transaction([
      this.prisma.reserva.groupBy({
        by: ['estado'],
        orderBy: { estado: 'asc' },
        where: {
          negocioId,
          creadoEn: this.periodWhere(period),
        },
        _count: { id: true },
      }),
      this.prisma.reserva.findMany({
        where: {
          negocioId,
          fecha: { gte: new Date() },
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, nickname: true, email: true },
          },
          recurso: {
            select: { id: true, nombre: true, capacidad: true },
          },
        },
        orderBy: { fecha: 'asc' },
        take: 10,
      }),
    ]);

    const conteo = {
      PENDIENTE: 0,
      CONFIRMADA: 0,
      CANCELADA: 0,
      COMPLETADA: 0,
      NO_SHOW: 0,
    };

    for (const item of counts) {
      conteo[item.estado] = groupCount(item._count);
    }

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      conteo,
      proximasReservas,
    };
  }

  async getProductos(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [productosActivos, stockAgg, lineas, stockBajo] =
      await this.prisma.$transaction([
        this.prisma.producto.count({
          where: { negocioId, activo: true, eliminadoEn: null },
        }),
        this.prisma.producto.aggregate({
          where: { negocioId, eliminadoEn: null },
          _sum: { stockDisponible: true, stockReservado: true },
        }),
        this.prisma.pedidoProducto.findMany({
          where: {
            pedido: {
              negocioId,
              creadoEn: this.periodWhere(period),
            },
          },
          select: {
            cantidad: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                nombre: true,
                codigoSKU: true,
                activo: true,
                stockDisponible: true,
                stockReservado: true,
              },
            },
          },
        }),
        this.prisma.producto.findMany({
          where: {
            negocioId,
            eliminadoEn: null,
            OR: [
              { stockDisponible: { lte: 5 } },
              { stockDisponible: { lte: 0 } },
            ],
          },
          orderBy: [{ stockDisponible: 'asc' }, { nombre: 'asc' }],
          take: 10,
        }),
      ]);

    const topProductosMap = new Map<
      number,
      {
        id: number;
        nombre: string;
        codigoSKU: string | null;
        unidadesVendidas: number;
        ingresos: number;
        stockDisponible: number;
        stockReservado: number;
      }
    >();

    for (const linea of lineas) {
      const current = topProductosMap.get(linea.producto.id) ?? {
        id: linea.producto.id,
        nombre: linea.producto.nombre,
        codigoSKU: linea.producto.codigoSKU,
        unidadesVendidas: 0,
        ingresos: 0,
        stockDisponible: linea.producto.stockDisponible,
        stockReservado: linea.producto.stockReservado,
      };
      current.unidadesVendidas += linea.cantidad;
      current.ingresos += decimalToNumber(linea.subtotal);
      topProductosMap.set(linea.producto.id, current);
    }

    const topProductos = Array.from(topProductosMap.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      resumen: {
        productosActivos,
        stockDisponibleTotal: stockAgg._sum.stockDisponible ?? 0,
        stockReservadoTotal: stockAgg._sum.stockReservado ?? 0,
      },
      topProductos,
      stockBajo,
    };
  }

  async getClientes(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [compras, reservas, visitas] = await this.prisma.$transaction([
      this.prisma.compra.findMany({
        where: {
          negocioId,
          estado: CompraEstado.COMPLETADA,
          creadoEn: this.periodWhere(period),
        },
        select: {
          usuarioId: true,
          total: true,
          usuario: {
            select: { id: true, nombre: true, nickname: true, email: true },
          },
        },
      }),
      this.prisma.reserva.findMany({
        where: {
          negocioId,
          creadoEn: this.periodWhere(period),
        },
        select: {
          usuarioId: true,
          usuario: {
            select: { id: true, nombre: true, nickname: true, email: true },
          },
        },
      }),
      this.prisma.visitaNegocio.findMany({
        where: {
          negocioId,
          creadoEn: this.periodWhere(period),
          usuarioId: { not: null },
        },
        select: { usuarioId: true },
      }),
    ]);

    const topCompradoresMap = new Map<
      number,
      {
        usuario: { id: number; nombre: string; nickname: string; email: string };
        totalGastado: number;
        compras: number;
      }
    >();

    for (const compra of compras) {
      const current = topCompradoresMap.get(compra.usuarioId) ?? {
        usuario: compra.usuario,
        totalGastado: 0,
        compras: 0,
      };
      current.totalGastado += decimalToNumber(compra.total);
      current.compras += 1;
      topCompradoresMap.set(compra.usuarioId, current);
    }

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      resumen: {
        compradoresUnicos: topCompradoresMap.size,
        reservadoresUnicos: new Set(reservas.map((item) => item.usuarioId)).size,
        visitantesAutenticadosUnicos: new Set(
          visitas.map((item) => item.usuarioId).filter(Boolean),
        ).size,
      },
      topCompradores: Array.from(topCompradoresMap.values())
        .sort((a, b) => b.totalGastado - a.totalGastado)
        .slice(0, 10),
    };
  }

  async getConversion(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const [visitasTotal, comprasTotal, reservasTotal, visitasPorOrigen] =
      await this.prisma.$transaction([
        this.prisma.visitaNegocio.count({
          where: {
            negocioId,
            creadoEn: this.periodWhere(period),
          },
        }),
        this.prisma.compra.count({
          where: {
            negocioId,
            estado: CompraEstado.COMPLETADA,
            creadoEn: this.periodWhere(period),
          },
        }),
        this.prisma.reserva.count({
          where: {
            negocioId,
            creadoEn: this.periodWhere(period),
          },
        }),
        this.prisma.visitaNegocio.groupBy({
          by: ['origen'],
          orderBy: { origen: 'asc' },
          where: {
            negocioId,
            creadoEn: this.periodWhere(period),
          },
          _count: { _all: true },
        }),
      ]);

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      resumen: {
        visitasTotal,
        comprasTotal,
        reservasTotal,
        tasaCompra: visitasTotal > 0 ? comprasTotal / visitasTotal : 0,
        tasaReserva: visitasTotal > 0 ? reservasTotal / visitasTotal : 0,
      },
      visitasPorOrigen: visitasPorOrigen
        .map((item) => ({
          origen: item.origen ?? 'sin_origen',
          total: groupCount(item._count),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  async getCategorias(
    negocioId: number,
    actorUserId: number,
    query: DashboardRangeDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);
    const period = this.resolvePeriod(query);

    const groups = await this.prisma.pedidoProducto.groupBy({
      by: ['categoriaIdSnapshot'],
      where: {
        pedido: {
          negocioId,
          creadoEn: this.periodWhere(period),
        },
      },
      _count: { id: true },
      _sum: {
        cantidad: true,
        subtotal: true,
      },
    });

    const categoriaIds = groups
      .map((item) => item.categoriaIdSnapshot)
      .filter((value): value is number => typeof value === 'number');

    const categorias = categoriaIds.length
      ? await this.prisma.categoria.findMany({
          where: { id: { in: categoriaIds } },
          select: { id: true, nombre: true },
        })
      : [];

    const nombres = new Map(categorias.map((item) => [item.id, item.nombre]));

    return {
      periodo: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        days: period.days,
      },
      items: groups
        .map((item) => ({
          categoriaId: item.categoriaIdSnapshot,
          categoriaNombre:
            (item.categoriaIdSnapshot
              ? nombres.get(item.categoriaIdSnapshot)
              : null) ?? 'Sin categoría snapshot',
          lineasVendidas: groupCount(item._count),
          unidadesVendidas: item._sum.cantidad ?? 0,
          ingresos: decimalToNumber(item._sum.subtotal),
        }))
        .sort((a, b) => b.ingresos - a.ingresos),
    };
  }
}
