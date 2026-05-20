import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContenidoEstado, MotivoTx, PostTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { UpdateResenaDto } from './dto/update-resena.dto';
import { LogroEngineService } from '../logro/logro-engine.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import { mapResenaPublic, resenaPublicSelect } from './resena-public.util';

function toLimit(limit?: number | string, fallback = 10) {
  return Math.max(1, Math.min(50, Number(limit ?? fallback) | 0));
}

@Injectable()
export class ResenaService {
  constructor(
    private prisma: PrismaService,
    private readonly notificaciones: NotificacionService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  /** Listado global (paginable si quieres luego) */
  async todasLasResenas(limit?: number | string) {
    const resenas = await this.prisma.resena.findMany({
      take: toLimit(limit, 20),
      where: {
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        negocio: {
          eliminadoEn: null,
          activo: true,
        },
      },
      select: resenaPublicSelect,
      orderBy: { creadoEn: 'desc' },
    });

    return resenas.map((resena) => mapResenaPublic(resena));
  }

  /** Reseñas por negocio */
  async getResenasPorNegocio(negocioId: number, limit?: number | string) {
    const resenas = await this.prisma.resena.findMany({
      take: toLimit(limit, 20),
      where: {
        negocioId,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        negocio: {
          eliminadoEn: null,
          activo: true,
        },
      },
      select: resenaPublicSelect,
      orderBy: { creadoEn: 'desc' },
    });

    return resenas.map((resena) => mapResenaPublic(resena));
  }

  /** Reseñas por usuario */
  async findByUsuarioId(usuarioId: number, limit?: number | string) {
    const resenas = await this.prisma.resena.findMany({
      take: toLimit(limit, 20),
      where: {
        usuarioId,
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        negocio: {
          eliminadoEn: null,
          activo: true,
        },
      },
      select: resenaPublicSelect,
      orderBy: { creadoEn: 'desc' },
    });

    return resenas.map((resena) => mapResenaPublic(resena));
  }

  /** Últimas N reseñas (por defecto 10) */
  async obtenerUltimas(limit?: number | string) {
    const resenas = await this.prisma.resena.findMany({
      take: toLimit(limit, 10),
      where: {
        eliminadoEn: null,
        estado: ContenidoEstado.PUBLICADO,
        negocio: {
          eliminadoEn: null,
          activo: true,
        },
      },
      orderBy: { creadoEn: 'desc' },
      select: resenaPublicSelect,
    });

    return resenas.map((resena) => mapResenaPublic(resena));
  }

  /** Media de puntuación y número de reseñas de un negocio */
  async calcularMediaPorNegocio(negocioId: number) {
    const [agg] = await this.prisma.$queryRaw<
      { avg: number | null; count: number }[]
    >`SELECT AVG("puntuacion")::float AS avg, COUNT(*)::int AS count
       FROM "Resena"
       WHERE "negocioId" = ${negocioId}
         AND "eliminadoEn" IS NULL
         AND "estado" = 'PUBLICADO'`;
    return {
      negocioId,
      media: agg?.avg ?? 0,
      total: agg?.count ?? 0,
    };
  }

  /** Crear reseña + post + pagar pétalos (+5 autor, +5 dueño si distinto) */
  async crear(userId: number, dto: CreateResenaDto) {
    const productoIds = [...new Set(dto.productoIds ?? [])];
    const productosSugeridos = dto.productosSugeridos ?? [];

    const { postId, resenaId, duenoId } = await this.prisma.$transaction(
      async (tx) => {
        const negocio = await tx.negocio.findFirst({
          where: {
            id: dto.negocioId,
            eliminadoEn: null,
            activo: true,
          },
          select: { duenoId: true },
        });

        if (!negocio) {
          throw new NotFoundException('Negocio no encontrado');
        }

        if (productoIds.length > 0) {
          const productos = await tx.producto.findMany({
            where: {
              id: { in: productoIds },
              negocioId: dto.negocioId,
              activo: true,
              eliminadoEn: null,
            },
            select: { id: true },
          });

          if (productos.length !== productoIds.length) {
            throw new BadRequestException(
              'Algunos productos no existen o no pertenecen al negocio',
            );
          }
        }

        const resena = await tx.resena.create({
          data: {
            negocioId: dto.negocioId,
            usuarioId: userId,
            puntuacion: dto.puntuacion,
            contenido: dto.contenido ?? '',
            selloNenufar: dto.selloNenufar ?? false,
          },
          select: { id: true },
        });

        if (productoIds.length > 0) {
          await tx.resenaProducto.createMany({
            data: productoIds.map((productoId) => ({
              resenaId: resena.id,
              productoId,
            })),
            skipDuplicates: true,
          });
        }

        if (productosSugeridos.length > 0) {
          const sugerenciasNormalizadas = productosSugeridos.map((item) => {
            const nombre = item.nombre.trim();
            if (!nombre) {
              throw new BadRequestException(
                'Los productos sugeridos deben tener nombre',
              );
            }

            return {
              nombre,
              descripcion: item.descripcion?.trim() || null,
              precioSugerido: item.precioSugerido ?? null,
            };
          });

          await tx.solicitudProductoCatalogo.createMany({
            data: sugerenciasNormalizadas.map((item) => ({
              negocioId: dto.negocioId,
              usuarioId: userId,
              resenaId: resena.id,
              nombre: item.nombre,
              descripcion: item.descripcion,
              precioSugerido: item.precioSugerido,
            })),
          });
        }

        const post = await tx.post.create({
          data: {
            usuarioId: userId,
            tipo: PostTipo.RESENA,
            negocioId: dto.negocioId,
            resenaId: resena.id,
          },
          select: { id: true },
        });

        const autor = await tx.usuario.update({
          where: { id: userId },
          data: { petalosSaldo: { increment: 5 } },
          select: { petalosSaldo: true },
        });
        await tx.petaloTx.create({
          data: {
            usuarioId: userId,
            delta: 5,
            saldoResultante: autor.petalosSaldo,
            motivo: MotivoTx.RESENA_AUTOR,
            refTipo: 'Resena',
            refId: resena.id,
          },
        });

        if (negocio.duenoId && negocio.duenoId !== userId) {
          const saldoDueno = await tx.usuario.update({
            where: { id: negocio.duenoId },
            data: { petalosSaldo: { increment: 5 } },
            select: { petalosSaldo: true },
          });
          await tx.petaloTx.create({
            data: {
              usuarioId: negocio.duenoId,
              delta: 5,
              saldoResultante: saldoDueno.petalosSaldo,
              motivo: MotivoTx.RESENA_NEGOCIO,
              refTipo: 'Resena',
              refId: resena.id,
            },
          });
        }

        return {
          resenaId: resena.id,
          postId: post.id,
          duenoId: negocio.duenoId,
        };
      },
    );

    void this.notificaciones
      .fanoutNegocio({
        negocioId: dto.negocioId,
        tipo: 'POST',
        titulo: 'Nuevo post en un negocio que sigues',
        contenido: dto.contenido?.slice(0, 140),
        link: `/posts/${postId}`,
        postId,
      })
      .catch(() => undefined);

    void this.logroEngine
      .registrarAccion({
        usuarioId: userId,
        accion: 'RESENA_PUBLICADA',
        refId: resenaId,
      })
      .catch(() => undefined);

    void this.logroEngine
      .registrarAccion({
        usuarioId: userId,
        accion: 'RESENAS_DIFERENTES_PUNTUACIONES',
        refId: resenaId,
      })
      .catch(() => undefined);

    void this.logroEngine
      .registrarAccion({
        usuarioId: userId,
        accion: 'RESENAS_5_ESTRELLAS',
        refId: resenaId,
      })
      .catch(() => undefined);

    if (duenoId) {
      void this.logroEngine
        .registrarAccion({
          usuarioId: duenoId,
          accion: 'HITO_NEGOCIO',
          refId: dto.negocioId,
        })
        .catch(() => undefined);
    }

    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
      select: resenaPublicSelect,
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return mapResenaPublic(resena);
  }

  /** Actualizar reseña (solo autor) */
  async actualizar(id: number, dto: UpdateResenaDto, userId: number) {
    const r = await this.prisma.resena.findUnique({
      where: { id },
      select: { id: true, usuarioId: true },
    });
    if (!r) throw new NotFoundException('Reseña no encontrada');
    if (r.usuarioId !== userId)
      throw new ForbiddenException('No puedes editar esta reseña');

    const updated = await this.prisma.resena.update({
      where: { id },
      data: {
        ...(dto.puntuacion !== undefined ? { puntuacion: dto.puntuacion } : {}),
        ...(dto.contenido !== undefined ? { contenido: dto.contenido } : {}),
        ...(dto.selloNenufar !== undefined
          ? { selloNenufar: dto.selloNenufar }
          : {}),
      },
      select: resenaPublicSelect,
    });

    return mapResenaPublic(updated);
  }

  /** Eliminar reseña (solo autor). No revertimos pétalos. */
  async eliminar(id: number, userId: number) {
    const r = await this.prisma.resena.findUnique({
      where: { id },
      select: { id: true, usuarioId: true },
    });
    if (!r) throw new NotFoundException('Reseña no encontrada');
    if (r.usuarioId !== userId)
      throw new ForbiddenException('No puedes borrar esta reseña');

    const deleted = await this.prisma.resena.delete({
      where: { id },
      select: resenaPublicSelect,
    });

    return mapResenaPublic(deleted);
  }
}
