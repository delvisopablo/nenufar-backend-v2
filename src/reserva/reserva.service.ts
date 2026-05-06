import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, ReservaEstado, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogroEngineService } from '../logro/logro-engine.service';
import { QueryNegocioReservasDto } from './dto/query-negocio-reservas.dto';
import { UpdateReservaEstadoDto } from './dto/update-reserva-estado.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

type Horario = {
  weekly?: Record<string, [string, string][]>;
  exceptions?: Record<string, [string, string][]>;
  apertura?: string;
  cierre?: string;
};

function dayKey(d: Date) {
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return names[d.getDay()];
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function dateFromYMDAndMinutes(ymd: string, mins: number) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return new Date(Y, M - 1, D, h, m, 0, 0);
}

@Injectable()
export class ReservaService {
  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private async assertCanManageNegocio(negocioId: number, actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [negocio, actor, miembro] = await this.prisma.$transaction([
      this.prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, duenoId: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
      this.prisma.negocioMiembro.findUnique({
        where: {
          negocioId_usuarioId: {
            negocioId,
            usuarioId: actorUserId,
          },
        },
        select: { usuarioId: true },
      }),
    ]);

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (!actor) throw new UnauthorizedException('Usuario no autenticado');

    if (negocio.duenoId === actorUserId || miembro) {
      return negocio;
    }

    if (
      actor.rolGlobal === RolGlobal.ADMIN ||
      actor.rolGlobal === RolGlobal.MODERADOR
    ) {
      return negocio;
    }

    throw new ForbiddenException('No tienes permisos para gestionar este negocio');
  }

  private async canManageNegocio(negocioId: number, actorUserId: number) {
    try {
      await this.assertCanManageNegocio(negocioId, actorUserId);
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        return false;
      }
      throw error;
    }
  }

  private async ensureRecursoValido(negocioId: number, recursoId?: number) {
    if (!Number.isInteger(recursoId) || !recursoId || recursoId <= 0) {
      return null;
    }

    const recurso = await this.prisma.recursoReserva.findFirst({
      where: {
        id: recursoId,
        negocioId,
        eliminadoEn: null,
        activo: true,
      },
      select: { id: true, nombre: true },
    });

    if (!recurso) {
      throw new BadRequestException('Recurso no válido para este negocio');
    }

    return recurso;
  }

  private getRangosParaFecha(horario: Horario | null, ymd: string) {
    if (!horario) return null;

    if (horario.exceptions && horario.exceptions[ymd] !== undefined) {
      return horario.exceptions[ymd];
    }

    if (horario.weekly && typeof horario.weekly === 'object') {
      const d = new Date(`${ymd}T00:00:00`);
      return horario.weekly[dayKey(d)] || [];
    }

    if (horario.apertura && horario.cierre) {
      return [[horario.apertura, horario.cierre]];
    }

    return [];
  }

  private async updateReservaRecord(
    id: number,
    data: Prisma.ReservaUpdateInput,
  ) {
    return this.prisma.reserva.update({
      where: { id },
      data,
      include: {
        negocio: { select: { id: true, nombre: true, slug: true } },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        recurso: { select: { id: true, nombre: true, capacidad: true } },
      },
    });
  }

  private async assertSlotDisponible(
    negocioId: number,
    fechaISO: string,
    recursoId?: number | null,
    ignoreReservaId?: number,
  ) {
    if (!fechaISO) {
      throw new BadRequestException('Fecha requerida');
    }

    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    if (fecha.getTime() <= Date.now()) {
      throw new BadRequestException('La reserva debe ser futura');
    }

    const ymd = fecha.toISOString().slice(0, 10);
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        id: true,
        intervaloReserva: true,
        horario: true,
      },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    const recurso = await this.ensureRecursoValido(
      negocioId,
      recursoId ?? undefined,
    );

    if (!negocio.intervaloReserva || negocio.intervaloReserva <= 0) {
      throw new BadRequestException(
        'El negocio no tiene intervalo de reserva configurado',
      );
    }

    const rangos = this.getRangosParaFecha(
      negocio.horario as Horario | null,
      ymd,
    );
    if (rangos === null) {
      throw new BadRequestException('El negocio no tiene horario configurado');
    }

    const targetIso = fecha.toISOString();
    let slotValido = false;

    for (const [inicio, fin] of rangos) {
      const min0 = toMinutes(inicio);
      const min1 = toMinutes(fin);
      for (
        let t = min0;
        t + negocio.intervaloReserva <= min1;
        t += negocio.intervaloReserva
      ) {
        if (dateFromYMDAndMinutes(ymd, t).toISOString() === targetIso) {
          slotValido = true;
          break;
        }
      }
      if (slotValido) break;
    }

    if (!slotValido) {
      throw new BadRequestException('Slot no disponible');
    }

    const conflict = await this.prisma.reserva.findFirst({
      where: {
        negocioId,
        ...(recurso ? { recursoId: recurso.id } : {}),
        ...(ignoreReservaId ? { id: { not: ignoreReservaId } } : {}),
        fecha,
        estado: { not: ReservaEstado.CANCELADA },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('Slot no disponible');
    }

    return {
      fecha,
      recursoId: recurso?.id ?? null,
    };
  }

  async availability(negocioId: number, ymd: string, recursoId?: number) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { intervaloReserva: true, horario: true },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    const recurso = await this.ensureRecursoValido(negocioId, recursoId);

    if (!negocio.intervaloReserva || negocio.intervaloReserva <= 0) {
      throw new BadRequestException(
        'El negocio no tiene intervalo de reserva configurado',
      );
    }

    const rangos = this.getRangosParaFecha(
      negocio.horario as Horario | null,
      ymd,
    );
    if (rangos === null) {
      throw new BadRequestException('El negocio no tiene horario configurado');
    }

    const dayStart = new Date(`${ymd}T00:00:00`);
    const dayEnd = new Date(`${ymd}T23:59:59.999`);
    const reservas = await this.prisma.reserva.findMany({
      where: {
        negocioId,
        ...(recurso ? { recursoId: recurso.id } : {}),
        fecha: { gte: dayStart, lte: dayEnd },
        estado: { not: ReservaEstado.CANCELADA },
      },
      select: { fecha: true },
    });
    const ocupadas = new Set(reservas.map((item) => item.fecha.getTime()));

    const now = new Date();
    const slots: string[] = [];

    for (const [ini, fin] of rangos) {
      const min0 = toMinutes(ini);
      const min1 = toMinutes(fin);
      for (
        let t = min0;
        t + negocio.intervaloReserva <= min1;
        t += negocio.intervaloReserva
      ) {
        const slotDate = dateFromYMDAndMinutes(ymd, t);
        if (slotDate.getTime() <= now.getTime()) continue;
        if (ocupadas.has(slotDate.getTime())) continue;
        slots.push(slotDate.toISOString());
      }
    }

    return {
      date: ymd,
      intervalo: negocio.intervaloReserva,
      recursoId: recurso?.id ?? null,
      slots,
    };
  }

  async crear(
    negocioId: number,
    userId: number,
    fechaISO: string,
    nota?: string,
    recursoId?: number,
    duracionMinutos?: number,
    numPersonas?: number,
  ) {
    const slot = await this.assertSlotDisponible(
      negocioId,
      fechaISO,
      recursoId,
    );

    try {
      const reserva = await this.prisma.reserva.create({
        data: {
          negocioId,
          usuarioId: userId,
          fecha: slot.fecha,
          recursoId: slot.recursoId,
          nota: nota?.trim() || null,
          duracionMinutos: duracionMinutos ?? null,
          numPersonas: numPersonas ?? null,
        },
      });

      void this.logroEngine
        .registrarAccion({
          usuarioId: userId,
          accion: 'RESERVA_HECHA',
          refId: reserva.id,
        })
        .catch(() => undefined);

      return this.getById(reserva.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Slot no disponible');
      }
      throw error;
    }
  }

  async getById(id: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        negocio: { select: { id: true, nombre: true, slug: true } },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        recurso: { select: { id: true, nombre: true, capacidad: true } },
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return reserva;
  }

  async listByNegocio(
    negocioId: number,
    actorUserId: number,
    query: QueryNegocioReservasDto,
  ) {
    await this.assertCanManageNegocio(negocioId, actorUserId);

    const page = Math.max(1, Number(query.page ?? 1) | 0);
    const limit = Math.max(1, Math.min(100, Number(query.limit ?? 20) | 0));
    const skip = (page - 1) * limit;

    const where: Prisma.ReservaWhereInput = {
      negocioId,
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.recursoId ? { recursoId: query.recursoId } : {}),
      ...(query.usuarioId ? { usuarioId: query.usuarioId } : {}),
      ...((query.from || query.to)
        ? {
            fecha: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reserva.findMany({
        where,
        include: {
          negocio: { select: { id: true, nombre: true, slug: true } },
          usuario: {
            select: { id: true, nombre: true, nickname: true, email: true },
          },
          recurso: { select: { id: true, nombre: true, capacidad: true } },
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.reserva.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async actualizarEstado(
    id: number,
    actorUserId: number,
    dto: UpdateReservaEstadoDto,
    isAdmin = false,
  ) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      select: {
        id: true,
        negocioId: true,
        usuarioId: true,
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const canManage =
      isAdmin || (await this.canManageNegocio(reserva.negocioId, actorUserId));
    const isOwner = reserva.usuarioId === actorUserId;

    if (dto.estado === ReservaEstado.CANCELADA && (canManage || isOwner)) {
      return this.cancelar(id, actorUserId, isAdmin, dto.motivoCancelacion);
    }

    if (!canManage) {
      throw new ForbiddenException('Solo el negocio puede actualizar este estado');
    }

    const allowedStates: ReservaEstado[] = [
      ReservaEstado.CONFIRMADA,
      ReservaEstado.COMPLETADA,
      ReservaEstado.NO_SHOW,
    ];

    if (!allowedStates.includes(dto.estado)) {
      throw new BadRequestException('Estado de reserva no permitido');
    }

    return this.updateReservaRecord(id, {
      estado: dto.estado,
      canceladaEn: null,
      motivoCancelacion: null,
    });
  }

  async actualizar(
    id: number,
    actorUserId: number,
    dto: UpdateReservaDto,
    isAdmin = false,
  ) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      select: {
        id: true,
        negocioId: true,
        usuarioId: true,
        recursoId: true,
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const canManage =
      isAdmin || (await this.canManageNegocio(reserva.negocioId, actorUserId));
    const isOwner = reserva.usuarioId === actorUserId;

    if (!canManage && !isOwner) {
      throw new ForbiddenException('No puedes editar esta reserva');
    }

    if (dto.estado === ReservaEstado.CANCELADA) {
      return this.cancelar(id, actorUserId, isAdmin, dto.motivoCancelacion);
    }

    const data: Prisma.ReservaUpdateInput = {};

    if (dto.fecha !== undefined) {
      const slot = await this.assertSlotDisponible(
        reserva.negocioId,
        dto.fecha,
        reserva.recursoId ?? undefined,
        reserva.id,
      );
      data.fecha = slot.fecha;
    }

    if (dto.nota !== undefined) {
      data.nota = dto.nota?.trim() || null;
    }

    if (dto.numPersonas !== undefined) {
      data.numPersonas = dto.numPersonas;
    }

    if (dto.duracionMinutos !== undefined) {
      data.duracionMinutos = dto.duracionMinutos;
    }

    if (dto.estado !== undefined) {
      if (!canManage) {
        throw new ForbiddenException('Solo el negocio puede cambiar ese estado');
      }

      const allowedStates: ReservaEstado[] = [
        ReservaEstado.CONFIRMADA,
        ReservaEstado.COMPLETADA,
        ReservaEstado.NO_SHOW,
      ];

      if (!allowedStates.includes(dto.estado)) {
        throw new BadRequestException('Estado de reserva no permitido');
      }

      data.estado = dto.estado;
      data.canceladaEn = null;
      data.motivoCancelacion = null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No hay cambios válidos para aplicar');
    }

    return this.updateReservaRecord(id, data);
  }

  async cancelar(
    id: number,
    userId: number,
    isAdmin = false,
    motivoCancelacion?: string,
  ) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      select: {
        id: true,
        negocioId: true,
        usuarioId: true,
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const canManage =
      isAdmin || (await this.canManageNegocio(reserva.negocioId, userId));

    if (!canManage && reserva.usuarioId !== userId) {
      throw new ForbiddenException('No puedes cancelar esta reserva');
    }

    return this.updateReservaRecord(id, {
      estado: ReservaEstado.CANCELADA,
      canceladaEn: new Date(),
      motivoCancelacion: motivoCancelacion?.trim() || null,
    });
  }

  async misReservas(
    userId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const p = Math.max(1, Number(page ?? 1) | 0);
    const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
    const skip = (p - 1) * l;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reserva.findMany({
        where: { usuarioId: userId },
        include: {
          negocio: { select: { id: true, nombre: true, slug: true } },
          recurso: { select: { id: true, nombre: true, capacidad: true } },
        },
        orderBy: { fecha: 'asc' },
        skip,
        take: l,
      }),
      this.prisma.reserva.count({ where: { usuarioId: userId } }),
    ]);

    return { items, total, page: p, limit: l };
  }
}
