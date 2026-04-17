/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolNegocio } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { QueryNegocioDto } from './dto/query-negocio.dto';
import { ConfigHorarioDto } from './dto/config-horario.dto';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

function isHHmm(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}

function validateHorarioShape(h: any) {
  if (!h) return;
  if (h.weekly && typeof h.weekly !== 'object') {
    throw new BadRequestException('horario.weekly debe ser objeto');
  }
  if (h.exceptions && typeof h.exceptions !== 'object') {
    throw new BadRequestException('horario.exceptions debe ser objeto');
  }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  for (const d of days) {
    const ranges = h.weekly?.[d];
    if (!ranges) continue;
    if (!Array.isArray(ranges))
      throw new BadRequestException(`horario.weekly.${d} debe ser array`);
    for (const r of ranges) {
      if (!Array.isArray(r) || r.length !== 2)
        throw new BadRequestException(`Rango inválido en weekly.${d}`);
      const [ini, fin] = r;
      if (!isHHmm(ini) || !isHHmm(fin))
        throw new BadRequestException(`Formato HH:mm inválido en weekly.${d}`);
      if (ini >= fin)
        throw new BadRequestException(`Inicio>=fin en weekly.${d}`);
    }
  }
  if (h.exceptions) {
    for (const [ymd, arr] of Object.entries(h.exceptions)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd))
        throw new BadRequestException(`Fecha inválida en exceptions: ${ymd}`);
      if (!Array.isArray(arr))
        throw new BadRequestException(`exceptions["${ymd}"] debe ser array`);
      for (const r of arr as any[]) {
        if (!Array.isArray(r) || r.length !== 2)
          throw new BadRequestException(
            `Rango inválido en exceptions["${ymd}"]`,
          );
        const [ini, fin] = r;
        if (!isHHmm(ini) || !isHHmm(fin))
          throw new BadRequestException(
            `Formato HH:mm inválido en exceptions["${ymd}"]`,
          );
        if (ini >= fin)
          throw new BadRequestException(`Inicio>=fin en exceptions["${ymd}"]`);
      }
    }
  }
}

@Injectable()
export class NegocioService {
  constructor(private prisma: PrismaService) {}

  // LIST
  async list(qry: QueryNegocioDto) {
    const { q, categoriaId, subcategoriaId, page, limit } = qry;
    const { skip, take, page: p, limit: l } = toPaging(page, limit);

    const where: any = {
      ...(categoriaId ? { categoriaId } : {}),
      ...(subcategoriaId ? { subcategoriaId } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' as const } },
              { direccion: { contains: q, mode: 'insensitive' as const } },
              { historia: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.negocio.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          historia: true,
          direccion: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.negocio.count({ where }),
    ]);

    return { items, total, page: p, limit: l };
  }

  // DETAIL
  async getById(id: number) {
    let n: any = null;

    try {
      n = await this.prisma.negocio.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          historia: true,
          direccion: true,
          categoria: { select: { id: true, nombre: true } },
          duenoId: true,
          dueno: {
            select: {
              id: true,
              nombre: true,
              nickname: true,
              foto: true,
            },
          },
          horario: true,
          intervaloReserva: true,
        },
      });
    } catch {
      n = await this.prisma.negocio.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          historia: true,
          direccion: true,
          categoria: { select: { id: true, nombre: true } },
        },
      });
    }

    if (!n) throw new NotFoundException('Negocio no encontrado');
    return n;
  }

  // CREATE
  async create(dto: CreateNegocioDto, currentUserId: number) {
    if (dto.horario) validateHorarioShape(dto.horario);

    const data: any = {
      nombre: dto.nombre.trim(),
      historia: dto.historia?.trim(),
      fechaFundacion: new Date(dto.fechaFundacion),
      direccion: dto.direccion?.trim(),
      categoriaId: dto.categoriaId,
      subcategoriaId: dto.subcategoriaId,
      duenoId: currentUserId,
      intervaloReserva: dto.intervaloReserva,
      horario: dto.horario ?? undefined,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const negocio = await tx.negocio.create({ data });
        await tx.negocioMiembro.create({
          data: {
            negocioId: negocio.id,
            usuarioId: currentUserId,
            rol: RolNegocio.DUENO,
          },
        });
        return negocio;
      });
    } catch {
      // P2003 FK inválida, P2002 unique (si pones unique en nombre)
      throw new BadRequestException(
        'Datos inválidos o referencias inexistentes',
      );
    }
  }

  // UPDATE
  async update(
    id: number,
    dto: UpdateNegocioDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    if (dto.horario) validateHorarioShape(dto.horario);

    const data: any = {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.historia !== undefined
        ? { historia: dto.historia?.trim() ?? null }
        : {}),
      ...(dto.fechaFundacion !== undefined
        ? { fechaFundacion: new Date(dto.fechaFundacion) }
        : {}),
      ...(dto.direccion !== undefined
        ? { direccion: dto.direccion?.trim() ?? null }
        : {}),
      ...(dto.categoriaId !== undefined
        ? { categoriaId: dto.categoriaId }
        : {}),
      ...(dto.subcategoriaId !== undefined
        ? { subcategoriaId: dto.subcategoriaId }
        : {}),
      ...(dto.intervaloReserva !== undefined
        ? { intervaloReserva: dto.intervaloReserva }
        : {}),
      ...(dto.horario !== undefined ? { horario: dto.horario } : {}),
    };

    try {
      return await this.prisma.negocio.update({ where: { id }, data });
    } catch {
      throw new BadRequestException('Actualización inválida');
    }
  }

  // DELETE
  async remove(id: number, currentUserId: number, isAdmin = false) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    try {
      return await this.prisma.negocio.delete({ where: { id } });
    } catch {
      // P2003: dependencias (productos, reseñas, etc.)
      throw new BadRequestException(
        'No se puede eliminar: tiene datos vinculados',
      );
    }
  }

  // CONFIG HORARIO
  async setConfigHorario(
    id: number,
    dto: ConfigHorarioDto,
    currentUserId: number,
    isAdmin = false,
  ) {
    const n = await this.prisma.negocio.findUnique({
      where: { id },
      select: { duenoId: true },
    });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!isAdmin && n.duenoId !== currentUserId)
      throw new ForbiddenException('No eres el dueño');

    if (dto.horario) validateHorarioShape(dto.horario);

    if (dto.intervaloReserva === undefined && dto.horario === undefined) {
      throw new BadRequestException('Nada que actualizar');
    }

    return this.prisma.negocio.update({
      where: { id },
      data: {
        ...(dto.intervaloReserva !== undefined
          ? { intervaloReserva: dto.intervaloReserva }
          : {}),
        ...(dto.horario !== undefined ? { horario: dto.horario } : {}),
      },
      select: { id: true, nombre: true, intervaloReserva: true, horario: true },
    });
  }

  // GET HORARIO
  async getHorario(id: number) {
    const neg = await this.prisma.negocio.findUnique({
      where: { id },
      select: { id: true, nombre: true, intervaloReserva: true, horario: true },
    });
    if (!neg) throw new NotFoundException('Negocio no encontrado');
    return neg;
  }

  //  // AVAILABILITY - descomentar
  //   async availability(negocioId: number, ymd: string) {
  //     const negocio = await this.prisma.negocio.findUnique({
  //       where: { id: negocioId },
  //       select: { id: true, nombre: true, intervaloReserva: true, horario: true },
  //     });
  //     if (!negocio) throw new NotFoundException('Negocio no encontrado');

  //     const date = new Date(ymd);
  //     if (Number.isNaN(date.getTime())) throw new BadRequestException('Fecha inválida');

  //     const slots: string[] = [];
  //     const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  //     const endOfDay = new Date(date.setHours(23, 59, 59, 999));
}
