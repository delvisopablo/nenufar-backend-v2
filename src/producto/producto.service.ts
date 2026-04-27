/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateProductoStockDto } from './dto/update-producto-stock.dto';

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
      select: { id: true, duenoId: true },
    });

    if (!negocio) throw new NotFoundException('Negocio no encontrado');

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

  /** Lista productos de un negocio */
  async listByNegocio(
    negocioId: number,
    q?: string,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const where: any = { negocioId };
    if (q) where.nombre = { contains: q, mode: 'insensitive' as const };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return { items, total, page: p, limit: l };
  }

  async getById(id: number) {
    const prod = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        negocio: { select: { id: true, nombre: true, duenoId: true } },
      },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    return prod;
  }

  /** Crea producto dentro de un negocio (solo dueño o admin) */
  async create(
    negocioId: number,
    dto: CreateProductoDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    await this.assertCanManageNegocio(negocioId, currentUserId, isAdmin);

    const stockDisponible = dto.stockDisponible ?? 0;
    const stockReservado = dto.stockReservado ?? 0;
    if (stockDisponible < 0 || stockReservado < 0) {
      throw new BadRequestException('Los valores de stock no pueden ser negativos');
    }
    if (stockReservado > stockDisponible) {
      throw new BadRequestException(
        'stockReservado no puede superar stockDisponible',
      );
    }

    try {
      return await this.prisma.producto.create({
        data: {
          negocioId,
          nombre: dto.nombre.trim(),
          ...(dto.descripcion !== undefined
            ? { descripcion: trimOptionalString(dto.descripcion) }
            : {}),
          precio: dto.precio,
          ...(dto.codigoSKU !== undefined
            ? { codigoSKU: trimOptionalString(dto.codigoSKU) }
            : {}),
          stockDisponible,
          stockReservado,
        },
      });
    } catch {
      throw new BadRequestException('No se pudo crear el producto');
    }
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
      throw new BadRequestException('Los valores de stock no pueden ser negativos');
    }
    if (nextStockReservado > nextStockDisponible) {
      throw new BadRequestException(
        'stockReservado no puede superar stockDisponible',
      );
    }

    try {
      return await this.prisma.producto.update({
        where: { id },
        data: {
          ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: trimOptionalString(dto.descripcion) }
            : {}),
          ...(dto.precio !== undefined ? { precio: dto.precio } : {}),
          ...(dto.codigoSKU !== undefined
            ? { codigoSKU: trimOptionalString(dto.codigoSKU) }
            : {}),
          ...(dto.stockDisponible !== undefined
            ? { stockDisponible: dto.stockDisponible }
            : {}),
          ...(dto.stockReservado !== undefined
            ? { stockReservado: dto.stockReservado }
            : {}),
        },
      });
    } catch {
      throw new BadRequestException('No se pudo actualizar el producto');
    }
  }

  /** Elimina producto (solo dueño o admin). Bloqueará si hay líneas de pedido. */
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const prod = await this.prisma.producto.findUnique({
      where: { id },
      select: { id: true, negocioId: true },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    await this.assertCanManageNegocio(prod.negocioId, currentUserId, isAdmin);

    try {
      return await this.prisma.producto.delete({ where: { id } });
    } catch {
      throw new BadRequestException(
        'No se puede eliminar: puede tener pedidos/promos vinculados',
      );
    }
  }

  async adjustStock(
    id: number,
    dto: UpdateProductoStockDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    if (dto.deltaDisponible === undefined && dto.deltaReservado === undefined) {
      throw new BadRequestException('Debes indicar al menos un ajuste de stock');
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
    await this.assertCanManageNegocio(producto.negocioId, currentUserId, isAdmin);

    const nextStockDisponible =
      producto.stockDisponible + (dto.deltaDisponible ?? 0);
    const nextStockReservado = producto.stockReservado + (dto.deltaReservado ?? 0);

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
    });

    return {
      ...updated,
      ajuste: {
        deltaDisponible: dto.deltaDisponible ?? 0,
        deltaReservado: dto.deltaReservado ?? 0,
        motivo: dto.motivo ?? null,
      },
    };
  }
}
