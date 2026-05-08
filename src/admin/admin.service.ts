import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContenidoEstado,
  EstadoCuenta,
  Prisma,
  ReservaEstado,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async softDeleteNegocioGraph(
    tx: TxClient,
    negocioId: number,
    deletedAt: Date,
  ) {
    const promociones = await tx.promocion.findMany({
      where: { negocioId },
      select: { id: true },
    });
    const posts = await tx.post.findMany({
      where: { negocioId },
      select: { id: true },
    });

    const promocionIds = promociones.map((item) => item.id);
    const postIds = posts.map((item) => item.id);

    await tx.promocion.updateMany({
      where: {
        negocioId,
        OR: [
          { activa: true },
          { estado: { not: ContenidoEstado.ELIMINADO } },
          { eliminadoEn: null },
        ],
      },
      data: {
        activa: false,
        estado: ContenidoEstado.ELIMINADO,
        eliminadoEn: deletedAt,
      },
    });
    await tx.reserva.updateMany({
      where: {
        negocioId,
        fecha: { gte: deletedAt },
        estado: {
          in: [ReservaEstado.PENDIENTE, ReservaEstado.CONFIRMADA],
        },
      },
      data: {
        estado: ReservaEstado.CANCELADA,
        canceladaEn: deletedAt,
        motivoCancelacion: 'Negocio eliminado',
      },
    });
    await tx.post.updateMany({
      where: {
        negocioId,
        OR: [
          { estado: { not: ContenidoEstado.ELIMINADO } },
          { eliminadoEn: null },
        ],
      },
      data: {
        estado: ContenidoEstado.ELIMINADO,
        eliminadoEn: deletedAt,
      },
    });
    await tx.resena.updateMany({
      where: {
        negocioId,
        eliminadoEn: null,
        estado: { not: ContenidoEstado.OCULTO },
      },
      data: {
        estado: ContenidoEstado.OCULTO,
        moderadoEn: deletedAt,
        motivoModeracion: 'Negocio eliminado',
      },
    });
    await tx.negocioMiembro.deleteMany({
      where: { negocioId },
    });
    await tx.negocioSeguimiento.deleteMany({
      where: { negocioId },
    });
    await tx.notificacion.deleteMany({
      where: {
        OR: [
          { negocioId },
          ...(promocionIds.length > 0
            ? [{ promocionId: { in: promocionIds } }]
            : []),
          ...(postIds.length > 0 ? [{ postId: { in: postIds } }] : []),
        ],
      },
    });

    return tx.negocio.update({
      where: { id: negocioId },
      data: {
        activo: false,
        eliminadoEn: deletedAt,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        activo: true,
        eliminadoEn: true,
      },
    });
  }

  async listUsuarios() {
    const items = await this.prisma.usuario.findMany({
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombre: true,
        nickname: true,
        email: true,
        rolGlobal: true,
        estadoCuenta: true,
        eliminadoEn: true,
        creadoEn: true,
        actualizadoEn: true,
        ultimoLoginEn: true,
        _count: {
          select: {
            negocios: true,
            resenas: true,
            reservas: true,
          },
        },
      },
    });

    return { items, total: items.length };
  }

  async eliminarUsuario(adminId: number, usuarioId: number, motivo?: string) {
    if (adminId === usuarioId) {
      throw new BadRequestException(
        'No puedes eliminar tu propia cuenta desde el panel de administración',
      );
    }

    const usuario = await this.ensureUsuario(usuarioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          eliminadoEn: new Date(),
          estadoCuenta: EstadoCuenta.ELIMINADA,
        },
        select: {
          id: true,
          nombre: true,
          nickname: true,
          email: true,
          estadoCuenta: true,
          eliminadoEn: true,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'ELIMINAR',
        'USUARIO',
        usuarioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Usuario ${usuario.nickname} eliminado correctamente`,
      item: updated,
    };
  }

  async suspenderUsuario(adminId: number, usuarioId: number, motivo?: string) {
    if (adminId === usuarioId) {
      throw new BadRequestException(
        'No puedes suspender tu propia cuenta desde el panel de administración',
      );
    }

    const usuario = await this.ensureUsuario(usuarioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          estadoCuenta: EstadoCuenta.SUSPENDIDA,
        },
        select: {
          id: true,
          nombre: true,
          nickname: true,
          email: true,
          estadoCuenta: true,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'SUSPENDER',
        'USUARIO',
        usuarioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Usuario ${usuario.nickname} suspendido correctamente`,
      item: updated,
    };
  }

  async activarUsuario(adminId: number, usuarioId: number, motivo?: string) {
    const usuario = await this.ensureUsuario(usuarioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          estadoCuenta: EstadoCuenta.ACTIVA,
          eliminadoEn: null,
        },
        select: {
          id: true,
          nombre: true,
          nickname: true,
          email: true,
          estadoCuenta: true,
          eliminadoEn: true,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'ACTIVAR',
        'USUARIO',
        usuarioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Usuario ${usuario.nickname} activado correctamente`,
      item: updated,
    };
  }

  async listNegocios() {
    const items = await this.prisma.negocio.findMany({
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombre: true,
        slug: true,
        activo: true,
        verificado: true,
        eliminadoEn: true,
        creadoEn: true,
        categoria: { select: { id: true, nombre: true } },
        subcategoria: { select: { id: true, nombre: true } },
        dueno: {
          select: { id: true, nombre: true, nickname: true, email: true },
        },
        _count: {
          select: {
            productos: true,
            promociones: true,
            resenas: true,
            reservas: true,
          },
        },
      },
    });

    return { items, total: items.length };
  }

  async eliminarNegocio(adminId: number, negocioId: number, motivo?: string) {
    const negocio = await this.ensureNegocio(negocioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const deletedAt = negocio.eliminadoEn ?? new Date();

      const item = await this.softDeleteNegocioGraph(tx, negocioId, deletedAt);

      await this.createAdminLog(
        tx,
        adminId,
        'ELIMINAR',
        'NEGOCIO',
        negocioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Negocio ${negocio.nombre} eliminado correctamente`,
      item: updated,
    };
  }

  async activarNegocio(adminId: number, negocioId: number, motivo?: string) {
    const negocio = await this.ensureNegocio(negocioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.negocio.update({
        where: { id: negocioId },
        data: {
          activo: true,
          eliminadoEn: null,
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          activo: true,
          eliminadoEn: true,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'ACTIVAR',
        'NEGOCIO',
        negocioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Negocio ${negocio.nombre} activado correctamente`,
      item: updated,
    };
  }

  async desactivarNegocio(adminId: number, negocioId: number, motivo?: string) {
    const negocio = await this.ensureNegocio(negocioId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.negocio.update({
        where: { id: negocioId },
        data: {
          activo: false,
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          activo: true,
          eliminadoEn: true,
        },
      });

      await tx.promocion.updateMany({
        where: { negocioId },
        data: {
          activa: false,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'DESACTIVAR',
        'NEGOCIO',
        negocioId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Negocio ${negocio.nombre} desactivado correctamente`,
      item: updated,
    };
  }

  async listResenas() {
    const items = await this.prisma.resena.findMany({
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        contenido: true,
        puntuacion: true,
        estado: true,
        selloNenufar: true,
        eliminadoEn: true,
        moderadoEn: true,
        creadoEn: true,
        usuario: {
          select: { id: true, nombre: true, nickname: true, email: true },
        },
        negocio: {
          select: { id: true, nombre: true, slug: true },
        },
      },
    });

    return { items, total: items.length };
  }

  async eliminarResena(adminId: number, resenaId: number, motivo?: string) {
    const resena = await this.ensureResena(resenaId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.resena.update({
        where: { id: resenaId },
        data: {
          estado: ContenidoEstado.ELIMINADO,
          eliminadoEn: new Date(),
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Eliminada por administración',
        },
        select: {
          id: true,
          contenido: true,
          estado: true,
          eliminadoEn: true,
        },
      });

      await tx.post.updateMany({
        where: { resenaId },
        data: {
          estado: ContenidoEstado.ELIMINADO,
          eliminadoEn: new Date(),
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Eliminada por administración',
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'ELIMINAR',
        'RESENA',
        resenaId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Reseña ${resenaId} eliminada correctamente`,
      item: updated,
    };
  }

  async ocultarResena(adminId: number, resenaId: number, motivo?: string) {
    const resena = await this.ensureResena(resenaId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.resena.update({
        where: { id: resenaId },
        data: {
          estado: ContenidoEstado.OCULTO,
          eliminadoEn: null,
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Ocultada por administración',
        },
        select: {
          id: true,
          contenido: true,
          estado: true,
        },
      });

      await tx.post.updateMany({
        where: { resenaId },
        data: {
          estado: ContenidoEstado.OCULTO,
          eliminadoEn: null,
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Ocultada por administración',
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'OCULTAR',
        'RESENA',
        resenaId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Reseña ${resenaId} ocultada correctamente`,
      item: updated,
    };
  }

  async publicarResena(adminId: number, resenaId: number, motivo?: string) {
    const resena = await this.ensureResena(resenaId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.resena.update({
        where: { id: resenaId },
        data: {
          estado: ContenidoEstado.PUBLICADO,
          eliminadoEn: null,
          moderadoEn: null,
          motivoModeracion: null,
        },
        select: {
          id: true,
          contenido: true,
          estado: true,
          eliminadoEn: true,
        },
      });

      await tx.post.updateMany({
        where: { resenaId },
        data: {
          estado: ContenidoEstado.PUBLICADO,
          eliminadoEn: null,
          moderadoEn: null,
          motivoModeracion: null,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'PUBLICAR',
        'RESENA',
        resenaId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Reseña ${resenaId} publicada correctamente`,
      item: updated,
    };
  }

  async listPromociones() {
    const items = await this.prisma.promocion.findMany({
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        titulo: true,
        descuento: true,
        tipoDescuento: true,
        descripcion: true,
        estado: true,
        activa: true,
        eliminadoEn: true,
        fechaCaducidad: true,
        creadoEn: true,
        negocio: {
          select: { id: true, nombre: true, slug: true },
        },
      },
    });

    return { items, total: items.length };
  }

  async eliminarPromocion(
    adminId: number,
    promocionId: number,
    motivo?: string,
  ) {
    const promocion = await this.ensurePromocion(promocionId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.promocion.update({
        where: { id: promocionId },
        data: {
          estado: ContenidoEstado.ELIMINADO,
          activa: false,
          eliminadoEn: new Date(),
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Eliminada por administración',
        },
        select: {
          id: true,
          titulo: true,
          estado: true,
          activa: true,
          eliminadoEn: true,
        },
      });

      await tx.post.updateMany({
        where: { promocionId },
        data: {
          estado: ContenidoEstado.ELIMINADO,
          eliminadoEn: new Date(),
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Eliminada por administración',
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'ELIMINAR',
        'PROMOCION',
        promocionId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Promoción ${promocion.titulo} eliminada correctamente`,
      item: updated,
    };
  }

  async ocultarPromocion(
    adminId: number,
    promocionId: number,
    motivo?: string,
  ) {
    const promocion = await this.ensurePromocion(promocionId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.promocion.update({
        where: { id: promocionId },
        data: {
          estado: ContenidoEstado.OCULTO,
          activa: false,
          eliminadoEn: null,
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Ocultada por administración',
        },
        select: {
          id: true,
          titulo: true,
          estado: true,
          activa: true,
        },
      });

      await tx.post.updateMany({
        where: { promocionId },
        data: {
          estado: ContenidoEstado.OCULTO,
          eliminadoEn: null,
          moderadoEn: new Date(),
          motivoModeracion: motivo ?? 'Ocultada por administración',
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'OCULTAR',
        'PROMOCION',
        promocionId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Promoción ${promocion.titulo} ocultada correctamente`,
      item: updated,
    };
  }

  async publicarPromocion(
    adminId: number,
    promocionId: number,
    motivo?: string,
  ) {
    const promocion = await this.ensurePromocion(promocionId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.promocion.update({
        where: { id: promocionId },
        data: {
          estado: ContenidoEstado.PUBLICADO,
          activa: true,
          eliminadoEn: null,
          moderadoEn: null,
          motivoModeracion: null,
        },
        select: {
          id: true,
          titulo: true,
          estado: true,
          activa: true,
          eliminadoEn: true,
        },
      });

      await tx.post.updateMany({
        where: { promocionId },
        data: {
          estado: ContenidoEstado.PUBLICADO,
          eliminadoEn: null,
          moderadoEn: null,
          motivoModeracion: null,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        'PUBLICAR',
        'PROMOCION',
        promocionId,
        motivo,
      );
      return item;
    });

    return {
      ok: true,
      message: `Promoción ${promocion.titulo} publicada correctamente`,
      item: updated,
    };
  }

  async listReservas() {
    const items = await this.prisma.reserva.findMany({
      orderBy: { fecha: 'desc' },
      select: {
        id: true,
        fecha: true,
        estado: true,
        canceladaEn: true,
        motivoCancelacion: true,
        creadoEn: true,
        actualizadoEn: true,
        numPersonas: true,
        usuario: {
          select: { id: true, nombre: true, nickname: true, email: true },
        },
        negocio: {
          select: { id: true, nombre: true, slug: true },
        },
        recurso: {
          select: { id: true, nombre: true },
        },
      },
    });

    return { items, total: items.length };
  }

  async eliminarReserva(adminId: number, reservaId: number, motivo?: string) {
    return this.cancelarReserva(
      adminId,
      reservaId,
      motivo ?? 'Cancelada por administración',
      'ELIMINAR',
    );
  }

  async cancelarReserva(
    adminId: number,
    reservaId: number,
    motivo?: string,
    accion = 'CANCELAR',
  ) {
    const reserva = await this.ensureReserva(reservaId);
    const reason = (motivo || 'Cancelada por administración').trim();
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.reserva.update({
        where: { id: reservaId },
        data: {
          estado: ReservaEstado.CANCELADA,
          canceladaEn: new Date(),
          motivoCancelacion: reason,
        },
        select: {
          id: true,
          fecha: true,
          estado: true,
          canceladaEn: true,
          motivoCancelacion: true,
        },
      });

      await this.createAdminLog(
        tx,
        adminId,
        accion,
        'RESERVA',
        reservaId,
        reason,
      );
      return item;
    });

    return {
      ok: true,
      message:
        accion === 'ELIMINAR'
          ? `Reserva ${reservaId} cancelada y eliminada lógicamente correctamente`
          : `Reserva ${reservaId} cancelada correctamente`,
      item: updated,
    };
  }

  async listLogs() {
    const items = await this.prisma.adminLog.findMany({
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        accion: true,
        entidad: true,
        entidadId: true,
        motivo: true,
        creadoEn: true,
        admin: {
          select: { id: true, nombre: true, nickname: true, email: true },
        },
      },
    });

    return { items, total: items.length };
  }

  private async createAdminLog(
    tx: TxClient,
    adminId: number,
    accion: string,
    entidad: string,
    entidadId?: number | null,
    motivo?: string,
  ) {
    await tx.adminLog.create({
      data: {
        adminId,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        motivo: motivo?.trim() || null,
      },
    });
  }

  private async ensureUsuario(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre: true,
        nickname: true,
        email: true,
        estadoCuenta: true,
        eliminadoEn: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  private async ensureNegocio(negocioId: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        activo: true,
        eliminadoEn: true,
      },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return negocio;
  }

  private async ensureResena(resenaId: number) {
    const resena = await this.prisma.resena.findUnique({
      where: { id: resenaId },
      select: {
        id: true,
        contenido: true,
        estado: true,
        eliminadoEn: true,
      },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return resena;
  }

  private async ensurePromocion(promocionId: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id: promocionId },
      select: {
        id: true,
        titulo: true,
        estado: true,
        activa: true,
        eliminadoEn: true,
      },
    });

    if (!promocion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return promocion;
  }

  private async ensureReserva(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      select: {
        id: true,
        fecha: true,
        estado: true,
        canceladaEn: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return reserva;
  }
}
