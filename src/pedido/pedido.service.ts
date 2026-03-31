/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateCompraDto } from './dto/create-compra.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CompraEstado, PagoEstado, PedidoEstado, Prisma } from '@prisma/client';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class PedidoService {
  constructor(private prisma: PrismaService) {}

  // ---- Pedidos -------------------------------------------------------------

  async createPedido(negocioId: number) {
    // cualquiera puede crear un pedido para un negocio
    return this.prisma.pedido.create({
      data: { negocioId, estado: PedidoEstado.PENDIENTE },
    });
  }

  async getPedido(id: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        negocio: { select: { id: true, nombre: true } },
        pedidoProductos: {
          include: { producto: { select: { id: true, nombre: true } } },
          orderBy: { id: 'asc' },
        },
        compras: true,
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  async updatePedido(id: number, dto: UpdatePedidoDto) {
    try {
      return await this.prisma.pedido.update({ where: { id }, data: dto });
    } catch {
      throw new BadRequestException('No se pudo actualizar el pedido');
    }
  }

  async addItem(pedidoId: number, dto: AddItemDto) {
    // precioUnitario se coge del producto actual
    const prod = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
      select: { id: true, precio: true, negocioId: true },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { negocioId: true, estado: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estado !== PedidoEstado.PENDIENTE)
      throw new BadRequestException('Pedido no editable');
    if (pedido.negocioId !== prod.negocioId)
      throw new BadRequestException('Producto no pertenece a este negocio');

    // usar unique compuesto (pedidoId, productoId)
    const where = {
      pedidoId_productoId: { pedidoId, productoId: dto.productoId } as any,
    };

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.pedidoProducto
        .findUnique({ where })
        .catch(() => null);
      if (exists) {
        return tx.pedidoProducto.update({
          where,
          data: { cantidad: exists.cantidad + dto.cantidad },
        });
      }
      return tx.pedidoProducto.create({
        data: {
          pedidoId,
          productoId: dto.productoId,
          cantidad: dto.cantidad,
          precioUnitario: prod.precio,
        },
      });
    });
  }

  async updateItemCantidad(
    pedidoId: number,
    productoId: number,
    dto: UpdateItemDto,
  ) {
    const where = { pedidoId_productoId: { pedidoId, productoId } as any };
    try {
      return await this.prisma.pedidoProducto.update({
        where,
        data: { cantidad: dto.cantidad },
      });
    } catch {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
  }

  async removeItem(pedidoId: number, productoId: number) {
    const where = { pedidoId_productoId: { pedidoId, productoId } as any };
    try {
      await this.prisma.pedidoProducto.delete({ where });
      return { ok: true };
    } catch {
      throw new NotFoundException('Línea de pedido no encontrada');
    }
  }

  // ---- Compras -------------------------------------------------------------

  private async calcTotalPedido(pedidoId: number) {
    const lines = await this.prisma.pedidoProducto.findMany({
      where: { pedidoId },
    });
    return lines.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
  }

  async createCompra(
    pedidoId: number,
    usuarioId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dto: CreateCompraDto,
  ) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, estado: true, negocioId: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estado !== PedidoEstado.PENDIENTE)
      throw new BadRequestException('Pedido no disponible para compra');

    const total = await this.calcTotalPedido(pedidoId);
    if (total <= 0) throw new BadRequestException('Pedido vacío');

    // una compra por usuario-pedido; si quisieras split múltiple, haz otra tabla puente
    try {
      return await this.prisma.compra.create({
        data: {
          pedidoId,
          usuarioId,
          negocioId: pedido.negocioId,
          total,
          estado: CompraEstado.PENDIENTE,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Ya existe una compra para este pedido y usuario',
        );
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
              include: { producto: { select: { id: true, nombre: true } } },
            },
          },
        },
        pagos: true,
        usuario: { select: { id: true, nombre: true } },
      },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  async listComprasUsuario(
    usuarioId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.compra.findMany({
        where: { usuarioId },
        include: { pedido: true, pagos: true },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.compra.count({ where: { usuarioId } }),
    ]);
    return { items, total, page: p, limit: l };
  }

  // ---- Pagos ---------------------------------------------------------------

  private async recomputeCompraEstado(
    tx: PrismaService['$transaction'] extends (cb: any) => any ? any : never,
    compraId: number,
  ) {
    // suma pagos y actualiza estado de la compra
    const compra = await tx.compra.findUnique({ where: { id: compraId } });
    const pagos = await tx.pago.findMany({
      where: { compraId, estado: PagoEstado.PAGADO },
    });
    const pagado = pagos.reduce((a, p) => a + p.cantidad, 0);
    if (!compra) return;

    if (pagado >= compra.total && compra.estado !== CompraEstado.COMPLETADA) {
      await tx.compra.update({
        where: { id: compraId },
        data: { estado: CompraEstado.COMPLETADA },
      });
    }
  }

  async createPago(compraId: number, dto: CreatePagoDto) {
    // no hacemos lógica de gateway; solo registramos pago y si es PAGADO
    return this.prisma.$transaction(async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: compraId },
        select: { id: true, usuarioId: true },
      });
      if (!compra) throw new NotFoundException('Compra no encontrada');

      const pago = await tx.pago.create({
        data: {
          compraId,
          usuarioId: compra.usuarioId,
          metodoPago: dto.metodoPago,
          estado: dto.estado,
          cantidad: dto.cantidad,
        },
      });

      // si está pagado, recalcula estado de compra
      if (dto.estado === PagoEstado.PAGADO) {
        await this.recomputeCompraEstado(tx, compraId);
      }

      return pago;
    });
  }

  async getPago(id: number) {
    const pago = await this.prisma.pago.findUnique({ where: { id } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  async listPagosUsuario(
    usuarioId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pago.findMany({
        where: { usuarioId },
        include: { compra: true },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.pago.count({ where: { usuarioId } }),
    ]);
    return { items, total, page: p, limit: l };
  }
}
