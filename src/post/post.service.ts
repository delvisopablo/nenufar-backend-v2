import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LikeTipo,
  MotivoTx,
  PostTipo,
  Prisma,
  RolGlobal,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  private tipoToEnum(tipo?: 'resena' | 'promocion' | 'logro') {
    if (tipo === 'resena') return PostTipo.RESENA;
    if (tipo === 'promocion') return PostTipo.PROMOCION;
    if (tipo === 'logro') return PostTipo.LOGRO;
    return undefined;
  }

  async list(params: {
    tipo?: 'resena' | 'promocion' | 'logro';
    usuarioId?: number;
    negocioId?: number;
    q?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const { skip, take, page, limit } = toPaging(params.page, params.limit);

    const tipo = this.tipoToEnum(params.tipo);
    let where: Prisma.PostWhereInput = {
      ...(tipo ? { tipo } : {}),
      ...(params.usuarioId ? { usuarioId: params.usuarioId } : {}),
      ...(params.negocioId ? { negocioId: params.negocioId } : {}),
    };

    // búsqueda simple por contenido de reseña (si aplica)
    const include: Prisma.PostInclude = {
      usuario: { select: { id: true, nombre: true } },
      _count: { select: { likes: true, comentarios: true } },
      resena: true,
      promocion: true,
      logro: true,
    };

    if (params.q) {
      where = {
        ...where,
        OR: [
          {
            resena: { contenido: { contains: params.q, mode: 'insensitive' } },
          },
          {
            promocion: { titulo: { contains: params.q, mode: 'insensitive' } },
          },
          { logro: { titulo: { contains: params.q, mode: 'insensitive' } } },
        ],
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include,
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, petalosSaldo: true } },
        resena: true,
        promocion: true,
        logro: true,
        _count: { select: { likes: true, comentarios: true } },
      },
    });
    if (!post) throw new NotFoundException('Post no encontrado');
    return post;
  }

  async listByNegocio(
    negocioId: number,
    params: {
      tipo?: 'resena' | 'promocion' | 'logro';
      usuarioId?: number;
      q?: string;
      page?: number | string;
      limit?: number | string;
    },
  ) {
    return this.list({
      ...params,
      negocioId,
    });
  }

  /** Borrar un post (solo autor o admin). Ojo: borra cascada comentarios/likes por FK. */
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { usuarioId: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (!isAdmin && post.usuarioId !== currentUserId) {
      throw new ForbiddenException('No puedes borrar este post');
    }
    return this.prisma.post.delete({ where: { id } });
  }

  /** Dar like consumiendo 1 pétalo (sin permitir doble-like) */
  async like(postId: number, userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { petalosSaldo: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.petalosSaldo < 1)
      throw new BadRequestException('Saldo de pétalos insuficiente');

    const exists = await this.prisma.like.findUnique({
      where: { usuarioId_postId: { usuarioId: userId, postId } },
    });
    if (exists) throw new BadRequestException('Ya diste like');

    return this.prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: { postId, usuarioId: userId, tipo: LikeTipo.LIKE },
      });

      const saldoUsuario = await tx.usuario.update({
        where: { id: userId },
        data: { petalosSaldo: { decrement: 1 } },
        select: { petalosSaldo: true },
      });

      await tx.petaloTx.create({
        data: {
          usuarioId: userId,
          delta: -1,
          saldoResultante: saldoUsuario.petalosSaldo,
          motivo: MotivoTx.LIKE,
          refTipo: 'Post',
          refId: postId,
        },
      });

      return { ok: true };
    });
  }

  /** Quitar like (no reembolsa pétalos) */
  async unlike(postId: number, userId: number) {
    const like = await this.prisma.like.findUnique({
      where: { usuarioId_postId: { usuarioId: userId, postId } },
    });
    if (!like) throw new NotFoundException('No tenías like en este post');

    await this.prisma.like.delete({
      where: { usuarioId_postId: { usuarioId: userId, postId } },
    });
    return { ok: true };
  }

  /** Listado simple de likes */
  async listLikes(postId: number) {
    const likes = await this.prisma.like.findMany({
      where: { postId },
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: 'asc' },
    });
    return { count: likes.length, likes };
  }

  /** Comentarios mínimos (crear/listar) — si ya tienes módulo de comentarios, ignora estas 2 */
  async listComentarios(postId: number) {
    return this.prisma.comentario.findMany({
      where: { postId },
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: 'asc' },
    });
  }
  async createComentario(postId: number, userId: number, contenido: string) {
    if (!contenido?.trim()) throw new BadRequestException('Contenido vacío');
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    return this.prisma.comentario.create({
      data: { postId, usuarioId: userId, contenido: contenido.trim() },
    });
  }

  async removeComentario(
    postId: number,
    comentarioId: number,
    currentUserId: number,
    isAdmin = false,
  ) {
    const [comentario, actor] = await this.prisma.$transaction([
      this.prisma.comentario.findUnique({
        where: { id: comentarioId },
        select: { id: true, postId: true, usuarioId: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: currentUserId },
        select: { id: true, rolGlobal: true },
      }),
    ]);

    if (!comentario || comentario.postId !== postId) {
      throw new NotFoundException('Comentario no encontrado');
    }

    const actorIsAdmin =
      isAdmin ||
      actor?.rolGlobal === RolGlobal.ADMIN ||
      actor?.rolGlobal === RolGlobal.MODERADOR;

    if (!actorIsAdmin && comentario.usuarioId !== currentUserId) {
      throw new ForbiddenException('No puedes borrar este comentario');
    }

    await this.prisma.comentario.delete({
      where: { id: comentarioId },
    });

    return { ok: true };
  }
}
