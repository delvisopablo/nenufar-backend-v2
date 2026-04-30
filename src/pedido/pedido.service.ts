import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CanalVenta,
  CompraEstado,
  PagoEstado,
  PedidoEstado,
  Prisma,
  RolGlobal,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { CreateCompraDto } from './dto/create-compra.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { LogroEngineService } from '../logro/logro-engine.service';
import { QueryNegocioPedidosDto } from './dto/query-negocio-pedidos.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdatePagoEstadoDto } from './dto/update-pago-estado.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

function asDecimal(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value);
}

@Injectable()
export class PedidoService {
  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private async assertCanManageNegocio(negocioId: number, actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [negocio, actor] = await this.prisma.$transaction([
      this.prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, duenoId: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
    ]);

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (!actor) throw new UnauthorizedException('Usuario no autenticado');

    if (negocio.duenoId === actorUserId) {
      return negocio;
    }

    if (
      actor.rolGlobal === RolGlobal.ADMIN ||
      actor.rolGlobal === RolGlobal.MODERADOR
    ) {
      return negocio;
    }

    throw new ForbiddenException('No tienes permisos para gestionar este negocio');
  }

  private async syncPedidoTotal(
    tx: Prisma.TransactionClient,
    pedidoId: number,
  ) {
    const aggregate = await tx.pedidoProducto.aggregate({
      where: { pedidoId },
      _sum: { subtotal: true },
    });

    const totalSnapshot = aggregate._sum.subtotal ?? new Prisma.Decimal(0);

    await tx.pedido.update({
      where: { id: pedidoId },
      data: { totalSnapshot },
    });

    return totalSnapshot;
  }

  private async recomputeCompraEstado(
    tx: Prisma.TransactionClient,
    compraId: number,
  ) {
    const compra = await tx.compra.findUnique({
      where: { id: compraId },
      select: {
        id: true,
        total: true,
        pagos: {
          select: {
            estado: true,
            cantidad: true,
          },
        },
      },
    });

    if (!compra) throw new NotFoundException('Compra no encontrada');

    const totalPagado = compra.pagos
      .filter((p) => p.estado === PagoEstado.PAGADO)
      .reduce(
        (sum, pago) => sum.plus(pago.cantidad),
        new Prisma.Decimal(0),
      );

    let estado: CompraEstado = CompraEstado.PENDIENTE;
    if (totalPagado.greaterThanOrEqualTo(compra.total)) {
      estado = CompraEstado.COMPLETADA;
    } else if (
      compra.pagos.length > 0 &&
      compra.pagos.every((p) => p.estado === PagoEstado.FALLIDO)
    ) {
      estado = CompraEstado.CANCELADA;
    }

    return tx.compra.update({
      where: { id: compraId },
      data: { estado },
    });
  }

  async createPedido(negocioId: number, usuarioId?: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    return this.prisma.pedido.create({
      data: {
        negocioId,
        usuarioId:
          Number.isInteger(usuarioId) && Number(usuarioId) > 0
            ? Number(usuarioId)
            : null,
        canalVenta: CanalVenta.WEB,
        totalSnapshot: new Prisma.Decimal(0),
      },
      include: {
        usuario: { select: { id: true, nombre: true, nickname: true } },
        negocio: { select: { id: true, nombre: true } },
        pedidoProductos: true,
      },
    });
  }

  async listByNegocio(
    negocioId: number,
    actorUserId: number,
    query: QueryNegocioPedidosDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);

    const { skip, take, page, limit } = toPaging(query.page, query.limit);
    const where: Prisma.PedidoWhereInput = {
      negocioId,
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.fecha
        ? {
            creadoEn: {
              gte: new Date(`${query.fecha}T00:00:00.000`),
              lte: new Date(`${query.fecha}T23:59:59.999`),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              nickname: true,
              email: true,
            },
          },
          pedidoProductos: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  codigoSKU: true,
                },
              },
              promocionAplicada: {
                select: {
                  id: true,
                  titulo: true,
                  descuento: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
          compras: {
            select: {
              id: true,
              estado: true,
              total: true,
              moneda: true,
              creadoEn: true,
              usuario: {
                select: { id: true, nombre: true, nickname: true },
              },
            },
            orderBy: { creadoEn: 'desc' },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getPedido(id: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        negocio: { select: { id: true, nombre: true, duenoId: true } },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        pedidoProductos: {
          include: {
            producto: true,
            promocionAplicada: true,
          },
        },
        compras: {
          include: {
            pagos: true,
            usuario: { select: { id: true, nombre: true, nickname: true } },
          },
        },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  async updatePedido(id: number, dto: UpdatePedidoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    return this.prisma.pedido.update({
      where: { id },
      data: {
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.canalVenta !== undefined
          ? { canalVenta: dto.canalVenta }
          : {}),
      },
      include: {
        usuario: { select: { id: true, nombre: true, nickname: true } },
        negocio: { select: { id: true, nombre: true } },
      },
    });
  }

  async addItem(pedidoId: number, dto: AddItemDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, negocioId: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
      select: {
        id: true,
        negocioId: true,
        precio: true,
        negocio: { select: { categoriaId: true } },
      },
    });
    if (!producto || producto.negocioId !== pedido.negocioId) {
      throw new BadRequestException('Producto no válido para este pedido');
    }

    const precioUnitario = asDecimal(producto.precio);
    const descuentoAplicado = new Prisma.Decimal(0);
    const subtotal = precioUnitario.mul(dto.cantidad).minus(descuentoAplicado);

    await this.prisma.$transaction(async (tx) => {
      const existente = await tx.pedidoProducto.findUnique({
        where: {
          pedidoId_productoId: {
            pedidoId,
            productoId: dto.productoId,
          },
        },
        select: { id: true, cantidad: true },
      });

      if (existente) {
        const nuevaCantidad = existente.cantidad + dto.cantidad;
        await tx.pedidoProducto.update({
          where: {
            pedidoId_productoId: {
              pedidoId,
              productoId: dto.productoId,
            },
          },
          data: {
            cantidad: nuevaCantidad,
            precioUnitario,
            descuentoAplicado,
            subtotal: precioUnitario.mul(nuevaCantidad).minus(descuentoAplicado),
            categoriaIdSnapshot: producto.negocio.categoriaId,
          },
        });
      } else {
        await tx.pedidoProducto.create({
          data: {
            pedidoId,
            productoId: dto.productoId,
            cantidad: dto.cantidad,
            precioUnitario,
            descuentoAplicado,
            subtotal,
            categoriaIdSnapshot: producto.negocio.categoriaId,
          },
        });
      }

      await this.syncPedidoTotal(tx, pedidoId);
    });

    return this.getPedido(pedidoId);
  }

  async updateItemCantidad(
    pedidoId: number,
    productoId: number,
    dto: UpdateItemDto,
  ) {
    const item = await this.prisma.pedidoProducto.findUnique({
      where: {
        pedidoId_productoId: {
          pedidoId,
          productoId,
        },
      },
      select: {
        pedidoId: true,
        productoId: true,
        precioUnitario: true,
        descuentoAplicado: true,
      },
    });
    if (!item) throw new NotFoundException('Línea de pedido no encontrada');

    await this.prisma.$transaction(async (tx) => {
      await tx.pedidoProducto.update({
        where: {
          pedidoId_productoId: {
            pedidoId,
            productoId,
          },
        },
        data: {
          cantidad: dto.cantidad,
          subtotal: item.precioUnitario
            .mul(dto.cantidad)
            .minus(item.descuentoAplicado ?? new Prisma.Decimal(0)),
        },
      });

      await this.syncPedidoTotal(tx, pedidoId);
    });

    return this.getPedido(pedidoId);
  }

  async removeItem(pedidoId: number, productoId: number) {
    const item = await this.prisma.pedidoProducto.findUnique({
      where: {
        pedidoId_productoId: {
          pedidoId,
          productoId,
        },
      },
      select: { pedidoId: true },
    });
    if (!item) throw new NotFoundException('Línea de pedido no encontrada');

    await this.prisma.$transaction(async (tx) => {
      await tx.pedidoProducto.delete({
        where: {
          pedidoId_productoId: {
            pedidoId,
            productoId,
          },
        },
      });
      await this.syncPedidoTotal(tx, pedidoId);
    });

    return this.getPedido(pedidoId);
  }

  async createCompra(pedidoId: number, userId: number, dto: CreateCompraDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        negocioId: true,
        totalSnapshot: true,
        pedidoProductos: {
          select: { id: true },
        },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.pedidoProductos.length === 0) {
      throw new BadRequestException('El pedido no tiene productos');
    }

    const total = pedido.totalSnapshot ?? new Prisma.Decimal(0);
    if (total.lessThanOrEqualTo(0)) {
      throw new BadRequestException('El pedido no tiene importe válido');
    }

    try {
      const compra = await this.prisma.compra.create({
        data: {
          pedidoId,
          usuarioId: userId,
          negocioId: pedido.negocioId,
          total,
          moneda: dto.moneda ?? 'EUR',
          estado: CompraEstado.PENDIENTE,
        },
        include: {
          pedido: true,
          usuario: { select: { id: true, nombre: true, nickname: true } },
          negocio: { select: { id: true, nombre: true } },
        },
      });

      void this.logroEngine
        .registrarAccion({
          usuarioId: userId,
          accion: 'COMPRA_REALIZADA',
          refId: compra.id,
        })
        .catch(() => undefined);

      return compra;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Ya existe una compra para este pedido y usuario');
      }
      throw error;
    }
  }

  async getCompra(id: number) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: {
        pedido: {
          include: {
            pedidoProductos: {
              include: {
                producto: true,
                promocionAplicada: true,
              },
            },
          },
        },
        negocio: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        pagos: true,
      },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  async listComprasUsuario(
    userId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.compra.findMany({
        where: { usuarioId: userId },
        include: {
          negocio: { select: { id: true, nombre: true } },
          pedido: { select: { id: true, estado: true, totalSnapshot: true } },
          pagos: true,
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.compra.count({ where: { usuarioId: userId } }),
    ]);

    return { items, total, page: p, limit: l };
  }

  async createPago(compraId: number, dto: CreatePagoDto) {
    const compra = await this.prisma.compra.findUnique({
      where: { id: compraId },
      select: {
        id: true,
        usuarioId: true,
        moneda: true,
      },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');

    const moneda = dto.moneda ?? compra.moneda;

    if (moneda !== compra.moneda) {
      throw new BadRequestException('La moneda del pago debe coincidir con la compra');
    }

    const pago = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pago.create({
        data: {
          compraId,
          usuarioId: compra.usuarioId,
          metodoPago: dto.metodoPago,
          cantidad: dto.cantidad,
          estado: dto.estado,
          moneda,
          refExterna: dto.refExterna?.trim() || null,
        },
      });

      await this.recomputeCompraEstado(tx, compraId);
      return created;
    });

    return this.getPago(pago.id);
  }

  async updatePagoEstado(id: number, dto: UpdatePagoEstadoDto) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      select: { id: true, compraId: true },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.pago.update({
        where: { id },
        data: {
          estado: dto.estado,
          ...(dto.refExterna !== undefined
            ? { refExterna: dto.refExterna?.trim() || null }
            : {}),
        },
      });

      await this.recomputeCompraEstado(tx, pago.compraId);
    });

    return this.getPago(id);
  }

  async getPago(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, nickname: true } },
        compra: {
          select: {
            id: true,
            estado: true,
            total: true,
            moneda: true,
            negocio: { select: { id: true, nombre: true } },
            pedido: { select: { id: true, estado: true } },
          },
        },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  async listPagosUsuario(
    userId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pago.findMany({
        where: { usuarioId: userId },
        include: {
          compra: {
            select: {
              id: true,
              estado: true,
              total: true,
              moneda: true,
              negocio: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.pago.count({ where: { usuarioId: userId } }),
    ]);

    return { items, total, page: p, limit: l };
  }
}
