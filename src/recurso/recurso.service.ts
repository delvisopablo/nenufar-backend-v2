import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

@Injectable()
export class RecursoService {
  constructor(private prisma: PrismaService) {}

  private async assertCanManageNegocio(negocioId: number, actorUserId: number) {
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

    if (
      negocio.duenoId !== actorUserId &&
      actor.rolGlobal !== RolGlobal.ADMIN &&
      actor.rolGlobal !== RolGlobal.MODERADOR
    ) {
      throw new ForbiddenException('No tienes permisos para gestionar este negocio');
    }

    return negocio;
  }

  async listByNegocio(negocioId: number, actorUserId: number) {
    await this.assertCanManageNegocio(negocioId, actorUserId);

    return this.prisma.recursoReserva.findMany({
      where: {
        negocioId,
        eliminadoEn: null,
      },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
  }

  async create(negocioId: number, actorUserId: number, dto: CreateRecursoDto) {
    await this.assertCanManageNegocio(negocioId, actorUserId);

    return this.prisma.recursoReserva.create({
      data: {
        negocioId,
        nombre: dto.nombre.trim(),
        descripcion: normalizeOptionalString(dto.descripcion),
        capacidad: dto.capacidad ?? null,
        activo: dto.activo ?? true,
      },
    });
  }

  async update(id: number, actorUserId: number, dto: UpdateRecursoDto) {
    const recurso = await this.prisma.recursoReserva.findUnique({
      where: { id },
      select: { id: true, negocioId: true, eliminadoEn: true },
    });

    if (!recurso || recurso.eliminadoEn) {
      throw new NotFoundException('Recurso no encontrado');
    }

    await this.assertCanManageNegocio(recurso.negocioId, actorUserId);

    return this.prisma.recursoReserva.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: normalizeOptionalString(dto.descripcion) }
          : {}),
        ...(dto.capacidad !== undefined ? { capacidad: dto.capacidad } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
  }

  async remove(id: number, actorUserId: number) {
    const recurso = await this.prisma.recursoReserva.findUnique({
      where: { id },
      select: { id: true, negocioId: true, eliminadoEn: true },
    });

    if (!recurso || recurso.eliminadoEn) {
      throw new NotFoundException('Recurso no encontrado');
    }

    await this.assertCanManageNegocio(recurso.negocioId, actorUserId);

    const updated = await this.prisma.recursoReserva.update({
      where: { id },
      data: {
        activo: false,
        eliminadoEn: new Date(),
      },
    });

    return {
      ok: true,
      recurso: updated,
    };
  }
}
