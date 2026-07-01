import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  ReservaCanceladaPor,
  ReservaEstado,
  RolGlobal,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogroEngineService } from '../logro/logro-engine.service';
import {
  HorarioJson,
  buildAvailabilitySlots,
  dateFromYMDAndMinutes,
  getRangosParaFecha,
  normalizeHorarioForRead,
  toMinutes,
} from '../negocio/horario.util';
import { QueryNegocioReservasDto } from './dto/query-negocio-reservas.dto';
import { UpdateReservaEstadoDto } from './dto/update-reserva-estado.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { createFieldError } from '../common/errors/app-error';

type AvailabilitySlot = {
  hora: string;
  disponible: boolean;
  fecha: string;
};

type AvailabilityDetail = {
  fecha: string;
  date: string;
  reservasActivas: boolean;
  intervaloReserva: number | null;
  intervalo: number | null;
  recursoId: number | null;
  slots: AvailabilitySlot[];
};

type ReservaPerfilRecord = Prisma.ReservaGetPayload<{
  select: {
    id: true;
    estado: true;
    fecha: true;
    nota: true;
    numPersonas: true;
    motivoCancelacion: true;
    negocio: {
      select: {
        id: true;
        nombre: true;
        fotoPerfil: true;
      };
    };
  };
}>;

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function parseYMD(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createFieldError(
      'INVALID_RESERVATION_DATE',
      `${label} debe ser YYYY-MM-DD`,
      label,
      `${label} debe ser YYYY-MM-DD`,
    );
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw createFieldError(
      'INVALID_RESERVATION_DATE',
      `${label} debe ser una fecha válida`,
      label,
      `${label} debe ser una fecha válida`,
    );
  }

  return date;
}

function formatYMD(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function formatHHmm(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function invalidReservationDate(message: string) {
  return createFieldError(
    'INVALID_RESERVATION_DATE',
    message,
    'fecha',
    message,
  );
}

function reservationOutsideSchedule(message: string) {
  return createFieldError(
    'RESERVATION_OUTSIDE_SCHEDULE',
    message,
    'fecha',
    message,
  );
}

function reservationSlotUnavailable(message = 'Slot no disponible') {
  return createFieldError(
    'RESERVATION_SLOT_UNAVAILABLE',
    message,
    'fecha',
    message,
  );
}

const CANCELABLE_ESTADOS: ReservaEstado[] = [
  ReservaEstado.PENDIENTE,
  ReservaEstado.CONFIRMADA,
];

function puedeCancelarReserva(estado: ReservaEstado, fecha: Date) {
  return CANCELABLE_ESTADOS.includes(estado) && fecha.getTime() > Date.now();
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

    throw new ForbiddenException(
      'No tienes permisos para gestionar este negocio',
    );
  }

  private async canEditNegocioReservas(negocioId: number, actorUserId: number) {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [negocio, actor] = await this.prisma.$transaction([
      this.prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, duenoId: true },
      }),
      this.prisma.usuario.findUnique({
        where: { id: actorUserId },
        select: { id: true, rolGlobal: true },
      }),
    ]);

    if (!negocio) throw new NotFoundException('Negocio no encontrado');
    if (!actor) throw new UnauthorizedException('Usuario no autenticado');

    return (
      negocio.duenoId === actorUserId ||
      actor.rolGlobal === RolGlobal.ADMIN ||
      actor.rolGlobal === RolGlobal.MODERADOR
    );
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

  private getRangosParaFecha(horario: HorarioJson | null, ymd: string) {
    return getRangosParaFecha(horario, ymd);
  }

  private async updateReservaRecord(
    id: number,
    data: Prisma.ReservaUpdateInput,
  ) {
    return this.prisma.reserva.update({
      where: { id },
      data,
      include: {
        negocio: {
          select: { id: true, nombre: true, slug: true, fotoPerfil: true },
        },
        usuario: { select: { id: true, nombre: true, nickname: true } },
        recurso: { select: { id: true, nombre: true, capacidad: true } },
      },
    });
  }

  private toReservaPerfilItem(item: ReservaPerfilRecord) {
    return {
      id: item.id,
      estado: item.estado,
      fecha: formatYMD(item.fecha),
      hora: formatHHmm(item.fecha),
      personas: item.numPersonas ?? null,
      mensaje: item.nota ?? null,
      motivoCancelacion: item.motivoCancelacion ?? null,
      puedeCancelar: puedeCancelarReserva(item.estado, item.fecha),
      negocio: {
        id: item.negocio.id,
        nombre: item.negocio.nombre,
        fotoPerfil: item.negocio.fotoPerfil ?? null,
      },
    };
  }

  private async assertSlotDisponible(
    negocioId: number,
    fechaISO: string,
    recursoId?: number | null,
    ignoreReservaId?: number,
  ) {
    if (!fechaISO) {
      throw invalidReservationDate('Fecha requerida');
    }

    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) {
      throw invalidReservationDate('Fecha inválida');
    }

    if (fecha.getTime() <= Date.now()) {
      throw invalidReservationDate('La reserva debe ser futura');
    }

    const ymd = fecha.toISOString().slice(0, 10);
    const negocio = await this.prisma.negocio.findFirst({
      where: {
        id: negocioId,
        activo: true,
        eliminadoEn: null,
      },
      select: {
        id: true,
        duenoId: true,
        intervaloReserva: true,
        horario: true,
        reservasActivas: true,
      },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    if (!negocio.reservasActivas) {
      throw reservationOutsideSchedule('El negocio no tiene reservas activas');
    }

    const recurso = await this.ensureRecursoValido(
      negocioId,
      recursoId ?? undefined,
    );

    if (!negocio.intervaloReserva || negocio.intervaloReserva <= 0) {
      throw reservationOutsideSchedule(
        'El negocio no tiene intervalo de reserva configurado',
      );
    }

    const rangos = this.getRangosParaFecha(
      normalizeHorarioForRead(negocio.horario),
      ymd,
    );
    if (rangos === null) {
      throw reservationOutsideSchedule(
        'El negocio no tiene horario configurado',
      );
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
      throw reservationOutsideSchedule(
        'La reserva está fuera del horario disponible',
      );
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
      throw reservationSlotUnavailable();
    }

    return {
      fecha,
      recursoId: recurso?.id ?? null,
      duenoId: negocio.duenoId,
    };
  }

  async availabilityDetailed(
    negocioId: number,
    ymd: string,
    recursoId?: number,
  ): Promise<AvailabilityDetail> {
    const negocio = await this.prisma.negocio.findFirst({
      where: {
        id: negocioId,
        activo: true,
        eliminadoEn: null,
      },
      select: {
        intervaloReserva: true,
        horario: true,
        reservasActivas: true,
      },
    });
    if (!negocio) throw new NotFoundException('Negocio no encontrado');

    const recurso = await this.ensureRecursoValido(negocioId, recursoId);

    if (!negocio.reservasActivas) {
      return {
        fecha: ymd,
        date: ymd,
        reservasActivas: false,
        intervaloReserva: negocio.intervaloReserva ?? null,
        intervalo: negocio.intervaloReserva ?? null,
        recursoId: recurso?.id ?? null,
        slots: [],
      };
    }

    if (!negocio.intervaloReserva || negocio.intervaloReserva <= 0) {
      throw reservationOutsideSchedule(
        'El negocio no tiene intervalo de reserva configurado',
      );
    }

    const rangos = this.getRangosParaFecha(
      normalizeHorarioForRead(negocio.horario),
      ymd,
    );
    if (rangos === null) {
      throw reservationOutsideSchedule(
        'El negocio no tiene horario configurado',
      );
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
    const slots = buildAvailabilitySlots(
      ymd,
      negocio.intervaloReserva,
      rangos,
      ocupadas,
    );

    return {
      fecha: ymd,
      date: ymd,
      reservasActivas: true,
      intervaloReserva: negocio.intervaloReserva,
      intervalo: negocio.intervaloReserva,
      recursoId: recurso?.id ?? null,
      slots,
    };
  }

  async availability(negocioId: number, ymd: string, recursoId?: number) {
    const detailed = await this.availabilityDetailed(negocioId, ymd, recursoId);

    return {
      date: detailed.date,
      intervalo: detailed.intervalo,
      recursoId: detailed.recursoId,
      slots: detailed.slots
        .filter((slot) => slot.disponible)
        .map((slot) => slot.fecha),
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

      void this.logroEngine
        .registrarAccionNegocio({
          negocioId,
          accion: 'NEGOCIO_RECIBIR_RESERVAS',
          refId: reserva.id,
        })
        .catch(() => undefined);

      void this.logroEngine
        .registrarAccion({
          usuarioId: slot.duenoId,
          accion: 'HITO_NEGOCIO',
          refId: negocioId,
        })
        .catch(() => undefined);

      return this.getById(reserva.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw reservationSlotUnavailable();
      }
      throw error;
    }
  }

  async getById(id: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        negocio: {
          select: { id: true, nombre: true, slug: true, fotoPerfil: true },
        },
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
      ...(query.from || query.to
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
            select: {
              id: true,
              nombre: true,
              nickname: true,
              email: true,
              foto: true,
            },
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

  async resumenPorDia(
    negocioId: number,
    actorUserId: number,
    desde?: string,
    dias?: number | string,
  ) {
    const canEdit = await this.canEditNegocioReservas(negocioId, actorUserId);
    if (!canEdit) {
      throw new ForbiddenException(
        'No tienes permisos para ver estas reservas',
      );
    }

    const today = formatYMD(new Date());
    const from = parseYMD(desde?.trim() || today, 'desde');
    const totalDias = Math.max(1, Math.min(60, Number(dias ?? 14) | 0));
    const to = new Date(from);
    to.setDate(from.getDate() + totalDias);

    const buckets = new Map<
      string,
      {
        fecha: string;
        total: number;
        reservas: Array<{
          id: number;
          hora: string;
          clienteNombre: string;
          estado: ReservaEstado;
          nota: string | null;
        }>;
      }
    >();

    for (let offset = 0; offset < totalDias; offset += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + offset);
      const fecha = formatYMD(date);
      buckets.set(fecha, { fecha, total: 0, reservas: [] });
    }

    const reservas = await this.prisma.reserva.findMany({
      where: {
        negocioId,
        fecha: { gte: from, lt: to },
        estado: { not: ReservaEstado.CANCELADA },
      },
      select: {
        id: true,
        fecha: true,
        estado: true,
        nota: true,
        usuario: {
          select: {
            nombre: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });

    for (const reserva of reservas) {
      const fecha = formatYMD(reserva.fecha);
      const bucket = buckets.get(fecha);
      if (!bucket) {
        continue;
      }

      bucket.reservas.push({
        id: reserva.id,
        hora: formatHHmm(reserva.fecha),
        clienteNombre: reserva.usuario.nombre || reserva.usuario.nickname,
        estado: reserva.estado,
        nota: reserva.nota,
      });
      bucket.total += 1;
    }

    return {
      desde: formatYMD(from),
      dias: Array.from(buckets.values()),
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
      isAdmin ||
      (await this.canEditNegocioReservas(reserva.negocioId, actorUserId));
    const isOwner = reserva.usuarioId === actorUserId;

    if (dto.estado === ReservaEstado.CANCELADA && (canManage || isOwner)) {
      return this.cancelar(id, actorUserId, isAdmin, dto.motivoCancelacion);
    }

    if (!canManage) {
      throw new ForbiddenException(
        'Solo el negocio puede actualizar este estado',
      );
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
      isAdmin ||
      (await this.canEditNegocioReservas(reserva.negocioId, actorUserId));
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
        throw new ForbiddenException(
          'Solo el negocio puede cambiar ese estado',
        );
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
      isAdmin || (await this.canEditNegocioReservas(reserva.negocioId, userId));
    const isOwner = reserva.usuarioId === userId;

    if (!canManage && !isOwner) {
      throw new ForbiddenException('No puedes cancelar esta reserva');
    }

    return this.updateReservaRecord(id, {
      estado: ReservaEstado.CANCELADA,
      canceladaEn: new Date(),
      motivoCancelacion: motivoCancelacion?.trim() || null,
      canceladaPor: isOwner
        ? ReservaCanceladaPor.USUARIO
        : ReservaCanceladaPor.NEGOCIO,
    });
  }

  async cancelarPorUsuario(id: number, userId: number, motivo: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      select: {
        id: true,
        usuarioId: true,
        estado: true,
        fecha: true,
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    if (reserva.usuarioId !== userId) {
      throw new ForbiddenException('No puedes cancelar una reserva ajena');
    }

    if (reserva.estado === ReservaEstado.CANCELADA) {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    const motivoTrim = motivo?.trim();
    if (!motivoTrim) {
      throw createFieldError(
        'RESERVATION_CANCEL_REASON_REQUIRED',
        'El motivo de cancelación es obligatorio',
        'motivo',
        'El motivo de cancelación es obligatorio',
      );
    }

    if (reserva.fecha.getTime() <= Date.now()) {
      throw new BadRequestException('No se puede cancelar una reserva pasada');
    }

    return this.updateReservaRecord(id, {
      estado: ReservaEstado.CANCELADA,
      canceladaEn: new Date(),
      motivoCancelacion: motivoTrim,
      canceladaPor: ReservaCanceladaPor.USUARIO,
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
          negocio: {
            select: { id: true, nombre: true, slug: true, fotoPerfil: true },
          },
          recurso: { select: { id: true, nombre: true, capacidad: true } },
        },
        orderBy: { fecha: 'asc' },
        skip,
        take: l,
      }),
      this.prisma.reserva.count({ where: { usuarioId: userId } }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        puedeCancelar: puedeCancelarReserva(item.estado, item.fecha),
      })),
      total,
      page: p,
      limit: l,
    };
  }

  async misReservasPerfil(userId: number) {
    const items = await this.prisma.reserva.findMany({
      where: { usuarioId: userId },
      select: {
        id: true,
        estado: true,
        fecha: true,
        nota: true,
        numPersonas: true,
        motivoCancelacion: true,
        negocio: {
          select: { id: true, nombre: true, fotoPerfil: true },
        },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });

    return items.map((item) => this.toReservaPerfilItem(item));
  }
}
