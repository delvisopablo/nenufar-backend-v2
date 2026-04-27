import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ContenidoEstado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { ValidarPromocionDto } from './dto/validar-promocion.dto';

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

@Injectable()
export class PromocionService {
  constructor(private prisma: PrismaService) {}

  async crearPromocion(dto: CreatePromocionDto, usuarioId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: dto.negocioId },
    });

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (negocio.duenoId !== usuarioId)
      throw new ForbiddenException(
        'No puedes crear promociones para este negocio',
      );

    return this.prisma.promocion.create({
      data: {
        titulo: dto.titulo.trim(),
        descripcion: normalizeOptionalString(dto.descripcion),
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaCaducidad: new Date(dto.fechaCaducidad),
        descuento: dto.descuento,
        tipoDescuento: dto.tipoDescuento,
        productoId: dto.productoId ?? null,
        negocioId: dto.negocioId,
        activa: dto.activa ?? true,
        codigo: normalizeOptionalString(dto.codigo),
        stockMaximo: dto.stockMaximo ?? null,
        usosMaximos: dto.usosMaximos ?? null,
        pack: {
          connect: dto.packIds?.map((id) => ({ id })) || [],
        },
      },
    });
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

    return this.prisma.promocion.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: normalizeOptionalString(dto.descripcion) }
          : {}),
        fechaCaducidad: dto.fechaCaducidad
          ? new Date(dto.fechaCaducidad)
          : undefined,
        ...(dto.fechaInicio !== undefined
          ? {
              fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
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
        ...(dto.productoId !== undefined ? { productoId: dto.productoId } : {}),
        pack: dto.packIds
          ? {
              set: dto.packIds.map((id) => ({ id })),
            }
          : undefined,
      },
    });
  }

  async listarActivas() {
    return this.prisma.promocion.findMany({
      where: {
        activa: true,
        fechaCaducidad: { gte: new Date() },
      },
      select: {
        id: true,
        titulo: true,
        descuento: true,
        tipoDescuento: true,
        fechaCaducidad: true,
        negocio: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaCaducidad: 'asc' },
      take: 10,
    });
  }

  async listarPorNegocio(negocioId: number) {
    return this.prisma.promocion.findMany({
      where: { negocioId },
    });
  }

  async validarPromocion(id: number, dto: ValidarPromocionDto) {
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

    if (
      promo.usosMaximos !== null &&
      promo.usosActuales >= promo.usosMaximos
    ) {
      motivos.push('La promoción ha agotado sus usos disponibles');
    }

    if (promo.codigo) {
      if (!dto.codigo) {
        motivos.push('La promoción requiere código');
      } else if (promo.codigo.toLowerCase() !== dto.codigo.toLowerCase()) {
        motivos.push('El código de promoción no es válido');
      }
    }

    return {
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
