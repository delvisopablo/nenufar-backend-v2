import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MotivoTx, PostTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { UpdateResenaDto } from './dto/update-resena.dto';

@Injectable()
export class ResenaService {
  constructor(private prisma: PrismaService) {}

  /** Listado global (paginable si quieres luego) */
  async todasLasResenas() {
    return this.prisma.resena.findMany({
      include: {
        usuario: { select: { id: true, nombre: true, foto: true } },
        negocio: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /** Reseñas por negocio */
  async getResenasPorNegocio(negocioId: number) {
    return this.prisma.resena.findMany({
      where: { negocioId },
      include: {
        usuario: { select: { id: true, nombre: true, foto: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /** Reseñas por usuario */
  async findByUsuarioId(usuarioId: number) {
    return this.prisma.resena.findMany({
      where: { usuarioId },
      include: {
        negocio: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /** Últimas N reseñas (por defecto 10) */
  async obtenerUltimas(limit = 10) {
    return this.prisma.resena.findMany({
      take: limit,
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { id: true, nombre: true, foto: true } },
        negocio: { select: { id: true, nombre: true } },
      },
    });
  }

  /** Media de puntuación y número de reseñas de un negocio */
  async calcularMediaPorNegocio(negocioId: number) {
    const [agg] = await this.prisma.$queryRaw<
      { avg: number | null; count: number }[]
    >`SELECT AVG("puntuacion")::float AS avg, COUNT(*)::int AS count
       FROM "Resena" WHERE "negocioId" = ${negocioId}`;
    return {
      negocioId,
      media: agg?.avg ?? 0,
      total: agg?.count ?? 0,
    };
  }

  /** Crear reseña + post + pagar pétalos (+5 autor, +5 dueño si distinto) */
  async crear(userId: number, dto: CreateResenaDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.resena.findFirst({
        where: {
          usuarioId: userId,
          negocioId: dto.negocioId,
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe una reseña tuya para este negocio');
      }

      // crear reseña
      const resena = await tx.resena.create({
        data: {
          negocioId: dto.negocioId,
          usuarioId: userId,
          puntuacion: dto.puntuacion,
          contenido: dto.contenido ?? '',
          selloNenufar: dto.selloNenufar ?? false,
        },
      });

      // crear post “one-of” apuntando a la reseña
      await tx.post.create({
        data: {
          usuarioId: userId,
          tipo: PostTipo.RESENA,
          negocioId: dto.negocioId,
          resenaId: resena.id,
        },
      });

      // pagar pétalos al autor
      await tx.petaloTx.create({
        data: {
          usuarioId: userId,
          delta: 5,
          motivo: MotivoTx.RESENA_AUTOR,
          refTipo: 'Resena',
          refId: resena.id,
        },
      });
      await tx.usuario.update({
        where: { id: userId },
        data: { petalosSaldo: { increment: 5 } },
      });

      // pagar al dueño del negocio (si es distinto)
      const dueno = await tx.negocio.findUnique({
        where: { id: dto.negocioId },
        select: { duenoId: true },
      });
      if (dueno?.duenoId && dueno.duenoId !== userId) {
        await tx.petaloTx.create({
          data: {
            usuarioId: dueno.duenoId,
            delta: 5,
            motivo: MotivoTx.RESENA_NEGOCIO,
            refTipo: 'Resena',
            refId: resena.id,
          },
        });
        await tx.usuario.update({
          where: { id: dueno.duenoId },
          data: { petalosSaldo: { increment: 5 } },
        });
      }

      return resena;
    });
  }

  /** Actualizar reseña (solo autor) */
  async actualizar(id: number, dto: UpdateResenaDto, userId: number) {
    const r = await this.prisma.resena.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reseña no encontrada');
    if (r.usuarioId !== userId)
      throw new ForbiddenException('No puedes editar esta reseña');

    try {
      return await this.prisma.resena.update({
        where: { id },
        data: {
          ...(dto.puntuacion !== undefined
            ? { puntuacion: dto.puntuacion }
            : {}),
          ...(dto.contenido !== undefined ? { contenido: dto.contenido } : {}),
          ...(dto.selloNenufar !== undefined
            ? { selloNenufar: dto.selloNenufar }
            : {}),
        },
      });
    } catch {
      throw new BadRequestException('Actualización inválida');
    }
  }

  /** Eliminar reseña (solo autor). No revertimos pétalos. */
  async eliminar(id: number, userId: number) {
    const r = await this.prisma.resena.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reseña no encontrada');
    if (r.usuarioId !== userId)
      throw new ForbiddenException('No puedes borrar esta reseña');

    return this.prisma.resena.delete({ where: { id } });
  }
}
