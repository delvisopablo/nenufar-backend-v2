import {
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
import {
  mapNegocioPublic,
  negocioPublicSelect,
} from '../negocio/negocio-public.util';

const resenaPublicSelect = {
  id: true,
  contenido: true,
  puntuacion: true,
  estado: true,
  moderadoEn: true,
  motivoModeracion: true,
  selloNenufar: true,
  usuarioId: true,
  negocioId: true,
  creadoEn: true,
  actualizadoEn: true,
  eliminadoEn: true,
  usuario: { select: { id: true, nombre: true, foto: true } },
  negocio: { select: negocioPublicSelect },
} satisfies Prisma.ResenaSelect;

type ResenaPublicRecord = Prisma.ResenaGetPayload<{ select: typeof resenaPublicSelect }>;

@Injectable()
export class ResenaService {
  constructor(
    private prisma: PrismaService,
    private readonly notificaciones: NotificacionService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private mapResena(resena: ResenaPublicRecord) {
    return {
      ...resena,
      negocio: mapNegocioPublic(resena.negocio),
      comentario: resena.contenido,
      fecha: resena.creadoEn,
    };
  }

  /** Listado global (paginable si quieres luego) */
  async todasLasResenas() {
    const resenas = await this.prisma.resena.findMany({
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

    return resenas.map((resena) => this.mapResena(resena));
  }

  /** Reseñas por negocio */
  async getResenasPorNegocio(negocioId: number) {
    const resenas = await this.prisma.resena.findMany({
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

    return resenas.map((resena) => this.mapResena(resena));
  }

  /** Reseñas por usuario */
  async findByUsuarioId(usuarioId: number) {
    const resenas = await this.prisma.resena.findMany({
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

    return resenas.map((resena) => this.mapResena(resena));
  }

  /** Últimas N reseñas (por defecto 10) */
  async obtenerUltimas(limit = 10) {
    const resenas = await this.prisma.resena.findMany({
      take: limit,
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

    return resenas.map((resena) => this.mapResena(resena));
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
    const { postId, resenaId } = await this.prisma.$transaction(async (tx) => {
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

      return { resenaId: resena.id, postId: post.id };
    });

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

    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
      select: resenaPublicSelect,
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return this.mapResena(resena);
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

    return this.mapResena(updated);
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

    return this.mapResena(deleted);
  }
}
