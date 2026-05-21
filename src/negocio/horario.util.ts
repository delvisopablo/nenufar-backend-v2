import { BadRequestException } from '@nestjs/common';

export const HORARIO_DAY_KEYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

export type HorarioDayKey = (typeof HORARIO_DAY_KEYS)[number];
export type HorarioRange = [string, string];
export type HorarioWeekly = Record<HorarioDayKey, HorarioRange[]>;
export type HorarioJson = {
  weekly?: Partial<Record<HorarioDayKey, HorarioRange[]>>;
  exceptions?: Record<string, HorarioRange[]>;
  apertura?: string;
  cierre?: string;
};

const DAY_ALIAS: Record<string, HorarioDayKey> = {
  mon: 'mon',
  monday: 'mon',
  lunes: 'mon',
  tue: 'tue',
  tuesday: 'tue',
  martes: 'tue',
  wed: 'wed',
  wednesday: 'wed',
  miercoles: 'wed',
  thu: 'thu',
  thursday: 'thu',
  jueves: 'thu',
  fri: 'fri',
  friday: 'fri',
  viernes: 'fri',
  sat: 'sat',
  saturday: 'sat',
  sabado: 'sat',
  sun: 'sun',
  sunday: 'sun',
  domingo: 'sun',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isHHmm(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function toMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function dateFromYMDAndMinutes(ymd: string, mins: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function minutesToHHmm(mins: number) {
  const hours = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (mins % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function normalizeDayToken(rawDay: string) {
  const normalizedDay = rawDay
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return DAY_ALIAS[normalizedDay];
}

function normalizeRangeParts(
  rawStart: unknown,
  rawEnd: unknown,
  label: string,
): HorarioRange {
  if (typeof rawStart !== 'string' || typeof rawEnd !== 'string') {
    throw new BadRequestException(`${label} debe incluir horas HH:mm`);
  }

  const start = rawStart.trim();
  const end = rawEnd.trim();

  if (!isHHmm(start) || !isHHmm(end)) {
    throw new BadRequestException(`${label} debe usar formato HH:mm`);
  }

  if (toMinutes(start) >= toMinutes(end)) {
    throw new BadRequestException(
      `${label} debe tener apertura menor que cierre`,
    );
  }

  return [start, end];
}

function normalizeRange(rawRange: unknown, label: string): HorarioRange {
  if (!Array.isArray(rawRange) || rawRange.length !== 2) {
    throw new BadRequestException(`${label} debe ser [apertura, cierre]`);
  }

  return normalizeRangeParts(rawRange[0], rawRange[1], label);
}

function normalizeRanges(rawRanges: unknown, label: string): HorarioRange[] {
  if (!Array.isArray(rawRanges)) {
    throw new BadRequestException(`${label} debe ser un array`);
  }

  return rawRanges.map((range, index) =>
    normalizeRange(range, `${label}[${index}]`),
  );
}

function buildWeekly(
  weekly: Partial<Record<HorarioDayKey, HorarioRange[]>>,
): HorarioWeekly {
  return {
    mon: weekly.mon ?? [],
    tue: weekly.tue ?? [],
    wed: weekly.wed ?? [],
    thu: weekly.thu ?? [],
    fri: weekly.fri ?? [],
    sat: weekly.sat ?? [],
    sun: weekly.sun ?? [],
  };
}

function normalizeExceptions(
  rawExceptions: unknown,
): Record<string, HorarioRange[]> {
  if (!isObject(rawExceptions)) {
    throw new BadRequestException('horario.exceptions debe ser un objeto');
  }

  const exceptions: Record<string, HorarioRange[]> = {};

  for (const [date, ranges] of Object.entries(rawExceptions)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(
        `horario.exceptions.${date} debe usar formato YYYY-MM-DD`,
      );
    }

    exceptions[date] = normalizeRanges(ranges, `horario.exceptions.${date}`);
  }

  return exceptions;
}

function normalizeLegacyHorario(input: Record<string, unknown>): HorarioJson {
  const horario: HorarioJson = {};

  if (input.weekly !== undefined) {
    if (!isObject(input.weekly)) {
      throw new BadRequestException('horario.weekly debe ser un objeto');
    }

    const weekly: Partial<Record<HorarioDayKey, HorarioRange[]>> = {};

    for (const [rawDay, rawRanges] of Object.entries(input.weekly)) {
      const dayKey = normalizeDayToken(rawDay);
      if (!dayKey) {
        throw new BadRequestException(
          `Dia invalido en horario.weekly: ${rawDay}`,
        );
      }

      weekly[dayKey] = normalizeRanges(rawRanges, `horario.weekly.${rawDay}`);
    }

    horario.weekly = buildWeekly(weekly);
  }

  if (input.exceptions !== undefined) {
    horario.exceptions = normalizeExceptions(input.exceptions);
  }

  if (input.apertura !== undefined || input.cierre !== undefined) {
    const [apertura, cierre] = normalizeRangeParts(
      input.apertura,
      input.cierre,
      'horario',
    );
    horario.apertura = apertura;
    horario.cierre = cierre;
  }

  if (
    horario.weekly === undefined &&
    horario.exceptions === undefined &&
    horario.apertura === undefined &&
    horario.cierre === undefined
  ) {
    horario.weekly = buildWeekly({});
  }

  return horario;
}

function normalizeStructuredDay(
  rawDay: unknown,
  dayLabel: string,
): HorarioRange[] {
  if (rawDay === null || rawDay === undefined) {
    return [];
  }

  if (!isObject(rawDay)) {
    throw new BadRequestException(`${dayLabel} debe ser un objeto`);
  }

  const abierto = rawDay.abierto;
  if (abierto !== undefined && typeof abierto !== 'boolean') {
    throw new BadRequestException(`${dayLabel}.abierto debe ser boolean`);
  }

  if (rawDay.rangos !== undefined) {
    const ranges = normalizeRanges(rawDay.rangos, `${dayLabel}.rangos`);
    if (abierto === false && ranges.length > 0) {
      throw new BadRequestException(
        `${dayLabel} no puede tener rangos si esta cerrado`,
      );
    }

    return abierto === false ? [] : ranges;
  }

  if (rawDay.apertura !== undefined || rawDay.cierre !== undefined) {
    if (abierto === false) {
      throw new BadRequestException(
        `${dayLabel} no puede tener apertura/cierre si esta cerrado`,
      );
    }

    return [normalizeRangeParts(rawDay.apertura, rawDay.cierre, dayLabel)];
  }

  if (abierto === true) {
    throw new BadRequestException(
      `${dayLabel} abierto requiere apertura/cierre o rangos`,
    );
  }

  return [];
}

export function normalizeHorarioInput(rawHorario: unknown): HorarioJson | null {
  if (rawHorario === null) {
    return null;
  }

  if (!isObject(rawHorario)) {
    throw new BadRequestException('horario debe ser un objeto');
  }

  if (
    'weekly' in rawHorario ||
    'exceptions' in rawHorario ||
    'apertura' in rawHorario ||
    'cierre' in rawHorario
  ) {
    return normalizeLegacyHorario(rawHorario);
  }

  const weekly: Partial<Record<HorarioDayKey, HorarioRange[]>> = {};
  let hasWeeklyData = false;
  let exceptions: Record<string, HorarioRange[]> | undefined;

  for (const [rawDay, rawConfig] of Object.entries(rawHorario)) {
    if (rawDay === 'exceptions') {
      exceptions = normalizeExceptions(rawConfig);
      continue;
    }

    const dayKey = normalizeDayToken(rawDay);
    if (!dayKey) {
      throw new BadRequestException(`Dia invalido en horario: ${rawDay}`);
    }

    weekly[dayKey] = normalizeStructuredDay(rawConfig, `horario.${rawDay}`);
    hasWeeklyData = true;
  }

  return {
    weekly: buildWeekly(hasWeeklyData ? weekly : {}),
    ...(exceptions ? { exceptions } : {}),
  };
}

export function hasOpenDays(horario?: HorarioJson | null) {
  if (!horario) {
    return false;
  }

  if (horario.weekly) {
    return HORARIO_DAY_KEYS.some((dayKey) => {
      const ranges = horario.weekly?.[dayKey];
      return Array.isArray(ranges) && ranges.length > 0;
    });
  }

  return Boolean(horario.apertura && horario.cierre);
}

export function normalizeHorarioForRead(
  rawHorario: unknown,
): HorarioJson | null {
  if (rawHorario === null || rawHorario === undefined) {
    return null;
  }

  try {
    const horario = normalizeHorarioInput(rawHorario);
    return horario && hasOpenDays(horario) ? horario : null;
  } catch {
    return null;
  }
}

export function summarizeHorarioForLog(rawHorario: unknown) {
  const horario = normalizeHorarioForRead(rawHorario);
  if (!horario) {
    return 'configured=false openDays=0 exceptions=0';
  }

  const openDays = horario.weekly
    ? HORARIO_DAY_KEYS.filter((dayKey) => {
        const ranges = horario.weekly?.[dayKey];
        return Array.isArray(ranges) && ranges.length > 0;
      }).length
    : horario.apertura && horario.cierre
      ? 1
      : 0;
  const exceptions = horario.exceptions
    ? Object.keys(horario.exceptions).length
    : 0;

  return `configured=true openDays=${openDays} exceptions=${exceptions}`;
}

function dayKeyFromDate(date: Date): HorarioDayKey {
  return HORARIO_DAY_KEYS[(date.getDay() + 6) % 7];
}

export function getRangosParaFecha(
  horario: HorarioJson | null,
  ymd: string,
): HorarioRange[] | null {
  if (!horario) {
    return null;
  }

  if (horario.exceptions && horario.exceptions[ymd] !== undefined) {
    return horario.exceptions[ymd];
  }

  if (horario.weekly && typeof horario.weekly === 'object') {
    const currentDay = new Date(`${ymd}T00:00:00`);
    return horario.weekly[dayKeyFromDate(currentDay)] || [];
  }

  if (horario.apertura && horario.cierre) {
    return [[horario.apertura, horario.cierre]];
  }

  return [];
}

export function buildAvailabilitySlots(
  ymd: string,
  intervaloReserva: number,
  rangos: HorarioRange[],
  occupiedTimestamps: Set<number>,
  now = new Date(),
) {
  const slots: Array<{ hora: string; disponible: boolean; fecha: string }> = [];

  for (const [start, end] of rangos) {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    for (
      let current = startMinutes;
      current + intervaloReserva <= endMinutes;
      current += intervaloReserva
    ) {
      const slotDate = dateFromYMDAndMinutes(ymd, current);
      const timestamp = slotDate.getTime();

      slots.push({
        hora: minutesToHHmm(current),
        disponible:
          timestamp > now.getTime() && !occupiedTimestamps.has(timestamp),
        fecha: slotDate.toISOString(),
      });
    }
  }

  return slots;
}
