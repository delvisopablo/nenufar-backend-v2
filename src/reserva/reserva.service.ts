import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

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
  async availability(negocioId: number, ymd: string) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { intervaloReserva: true, horario: true },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');
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
      where: { negocioId, fecha: { gte: dayStart, lte: dayEnd } },
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
      slots,
    };
  }

  /** Crea reserva: valida slot */
  async crear(
    negocioId: number,
    userId: number,
    fechaISO: string,
    nota?: string,
  ) {
    if (!fechaISO) throw new BadRequestException('Fecha requerida');
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime()))
      throw new BadRequestException('Fecha inválida');

    // el slot debe existir en availability y no estar ocupado
    const ymd = fechaISO.slice(0, 10);
    const avail = await this.availability(negocioId, ymd);
    const ok = avail.slots.includes(fecha.toISOString());
    if (!ok) throw new BadRequestException('Slot no disponible');

    try {
      return await this.prisma.reserva.create({
        data: {
          negocioId,
          usuarioId: userId,
          fecha,
          nota: nota?.trim() || null,
        },
      });
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
      },
    });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    return r;
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
        include: { negocio: { select: { id: true, nombre: true } } },
        orderBy: { fecha: 'asc' },
        skip,
        take: l,
      }),
      this.prisma.reserva.count({ where: { usuarioId: userId } }),
    ]);

    return { items, total, page: p, limit: l };
  }
}
