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
import { UpdateReservaEstadoDto } from './dto/update-reserva-estado.dto';
import { QueryNegocioReservasDto } from './dto/query-negocio-reservas.dto';

type Horario = {
  weekly?: Record<string, [string, string][]>;
  exceptions?: Record<string, [string, string][]>;
};

function dayKey(d: Date) {
  // 0=Sun..6=Sat -> sun,mon,...
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return names[d.getDay()];
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// function addMinutes(date: Date, minutes: number) {
//   return new Date(date.getTime() + minutes * 60000);
// }

function dateFromYMDAndMinutes(ymd: string, mins: number) {
  // ymd en formato YYYY-MM-DD. Creamos Date local (sin TZ forzada)
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

  /** Devuelve los intervalos base (min..max) para un negocio en una fecha concreta */
  private getRangosParaFecha(horario: Horario | null, ymd: string) {
    if (!horario) return null;
    // prioridad a excepciones
    if (horario.exceptions && horario.exceptions[ymd] !== undefined) {
      return horario.exceptions[ymd];
    }
    const d = new Date(ymd + 'T00:00:00');
    const key = dayKey(d);
    const weekly = horario.weekly || {};
    return weekly[key] || [];
  }

  /** Genera slots de disponibilidad (hora de inicio) para un negocio y fecha */
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

    // todas las reservas del día (para bloquear slots)
    const dayStart = new Date(ymd + 'T00:00:00');
    const dayEnd = new Date(ymd + 'T23:59:59.999');
    const reservas = await this.prisma.reserva.findMany({
      where: {
        negocioId,
        ...(recurso ? { recursoId: recurso.id } : {}),
        fecha: { gte: dayStart, lte: dayEnd },
      },
      select: { fecha: true },
    });
    const ocupadas = new Set(reservas.map((r) => r.fecha.getTime()));

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
        // elimina slots en el pasado (si es hoy)
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

  /** Crea reserva: valida slot */
  async crear(
    negocioId: number,
    userId: number,
    fechaISO: string,
    nota?: string,
    recursoId?: number,
    duracionMinutos?: number,
    numPersonas?: number,
  ) {
    if (!fechaISO) throw new BadRequestException('Fecha requerida');
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime()))
      throw new BadRequestException('Fecha inválida');

    // el slot debe existir en availability y no estar ocupado
    const ymd = fechaISO.slice(0, 10);
    const avail = await this.availability(negocioId, ymd, recursoId);
    const ok = avail.slots.includes(fecha.toISOString());
    if (!ok) throw new BadRequestException('Slot no disponible');

    try {
      const reserva = await this.prisma.reserva.create({
        data: {
          negocioId,
          usuarioId: userId,
          fecha,
          recursoId: avail.recursoId ?? null,
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

      return reserva;
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
    const r = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        negocio: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        recurso: { select: { id: true, nombre: true, capacidad: true } },
      },
    });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    return r;
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
          negocio: { select: { id: true, nombre: true } },
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
  ) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      select: { id: true, negocioId: true },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    await this.assertCanManageNegocio(reserva.negocioId, actorUserId);

    const allowedStates: ReservaEstado[] = [
      ReservaEstado.CONFIRMADA,
      ReservaEstado.CANCELADA,
      ReservaEstado.COMPLETADA,
      ReservaEstado.NO_SHOW,
    ];

    if (!allowedStates.includes(dto.estado)) {
      throw new BadRequestException('Estado de reserva no permitido');
    }

    return this.prisma.reserva.update({
      where: { id },
      data: {
        estado: dto.estado,
        ...(dto.estado === ReservaEstado.CANCELADA
          ? {
              canceladaEn: new Date(),
              motivoCancelacion: dto.motivoCancelacion?.trim() || null,
            }
          : {
              canceladaEn: null,
              motivoCancelacion: null,
            }),
      },
      include: {
        negocio: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        recurso: { select: { id: true, nombre: true, capacidad: true } },
      },
    });
  }

  async cancelar(id: number, userId: number, isAdmin = false) {
    const r = await this.prisma.reserva.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    if (!isAdmin && r.usuarioId !== userId)
      throw new ForbiddenException('No puedes cancelar esta reserva');

    await this.prisma.reserva.delete({ where: { id } });
    return { ok: true };
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
          negocio: { select: { id: true, nombre: true } },
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
