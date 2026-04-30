import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificacionTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificacionesDto } from './dto/query-notificaciones.dto';

type FanoutNegocioOpts = {
  negocioId: number;
  tipo: NotificacionTipo;
  titulo: string;
  contenido?: string;
  link?: string;
  promocionId?: number;
  postId?: number;
};

type FanoutUsuarioOpts = {
  usuarioId: number;
  tipo: NotificacionTipo;
  titulo: string;
  contenido?: string;
  link?: string;
  negocioId?: number;
  promocionId?: number;
  postId?: number;
};

function toPaging(page?: number, limit?: number) {
  const currentPage = Math.max(1, Number(page ?? 1) | 0);
  const currentLimit = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return {
    skip: (currentPage - 1) * currentLimit,
    take: currentLimit,
    page: currentPage,
    limit: currentLimit,
  };
}

@Injectable()
export class NotificacionService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(usuarioId: number, query: QueryNotificacionesDto) {
    const { skip, take, page, limit } = toPaging(query.page, query.limit);
    const where: Prisma.NotificacionWhereInput = {
      usuarioId,
      ...(query.leida !== undefined ? { leida: query.leida } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async countUnreadForUser(usuarioId: number) {
    const count = await this.prisma.notificacion.count({
      where: {
        usuarioId,
        leida: false,
      },
    });

    return { count };
  }

  async updateReadState(usuarioId: number, id: number, leida: boolean) {
    const updated = await this.prisma.notificacion.updateMany({
      where: {
        id,
        usuarioId,
      },
      data: {
        leida,
        leidaEn: leida ? new Date() : null,
      },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notificacion.findUniqueOrThrow({
      where: { id },
    });
  }

  async markAllAsRead(usuarioId: number) {
    const result = await this.prisma.notificacion.updateMany({
      where: {
        usuarioId,
        leida: false,
      },
      data: {
        leida: true,
        leidaEn: new Date(),
      },
    });

    return { updated: result.count };
  }

  async removeForUser(usuarioId: number, id: number) {
    const result = await this.prisma.notificacion.deleteMany({
      where: {
        id,
        usuarioId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return { deleted: true };
  }

  async fanoutNegocio(opts: FanoutNegocioOpts): Promise<{ enviadas: number }> {
    const seguidores = await this.prisma.negocioSeguimiento.findMany({
      where: {
        negocioId: opts.negocioId,
        notificacionesActivas: true,
      },
      select: {
        usuarioId: true,
      },
    });

    if (seguidores.length === 0) {
      return { enviadas: 0 };
    }

    const result = await this.prisma.notificacion.createMany({
      data: seguidores.map((seguimiento) => ({
        usuarioId: seguimiento.usuarioId,
        negocioId: opts.negocioId,
        tipo: opts.tipo,
        titulo: opts.titulo,
        contenido: opts.contenido,
        link: opts.link,
        promocionId: opts.promocionId,
        postId: opts.postId,
      })),
    });

    return { enviadas: result.count };
  }

  async fanoutUsuario(opts: FanoutUsuarioOpts) {
    return this.prisma.notificacion.create({
      data: {
        usuarioId: opts.usuarioId,
        tipo: opts.tipo,
        titulo: opts.titulo,
        contenido: opts.contenido,
        link: opts.link,
        negocioId: opts.negocioId,
        promocionId: opts.promocionId,
        postId: opts.postId,
      },
    });
  }
}
