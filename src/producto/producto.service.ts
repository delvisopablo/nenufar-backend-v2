/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

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
    const nego = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { duenoId: true },
    });
    if (!nego) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && nego.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

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
        stockDisponible: true,
        stockReservado: true,
        negocio: { select: { duenoId: true } },
      },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    if (!isAdmin && prod.negocio.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

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
      include: { negocio: { select: { duenoId: true } } },
    });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    if (!isAdmin && prod.negocio.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    try {
      return await this.prisma.producto.delete({ where: { id } });
    } catch {
      throw new BadRequestException(
        'No se puede eliminar: puede tener pedidos/promos vinculados',
      );
    }
  }
}
