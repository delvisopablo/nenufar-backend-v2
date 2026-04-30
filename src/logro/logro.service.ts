import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLogroDto } from './dto/create-logro.dto';
import { UpdateLogroDto } from './dto/update-logro.dto';
import { ACCION_LOGRO_LABELS, isAccionLogro } from './logro-accion';
import { LogroEngineService } from './logro-engine.service';

@Injectable()
export class LogroService {
  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  async create(dto: CreateLogroDto) {
    const { categoriaId, subcategoriaId, negocioId, productoId } = dto;

    try {
      return await this.prisma.logro.create({
        data: {
          titulo: dto.titulo.trim(),
          descripcion: dto.descripcion?.trim() || null,
          tipo: dto.tipo,
          accion: dto.accion?.trim() || null,
          dificultad: dto.dificultad,
          umbral: dto.umbral,
          recompensaPuntos: dto.recompensaPuntos,
          categoriaId: categoriaId ?? null,
          subcategoriaId: subcategoriaId ?? null,
          negocioId: negocioId ?? null,
          productoId: productoId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Alguna referencia relacionada no existe',
        );
      }
      throw error;
    }
  }

  async logrosPorUsuario(usuarioId: number) {
    return this.prisma.logroUsuario.findMany({
      where: {
        usuarioId,
        conseguido: true,
      },
      include: {
        logro: {
          include: {
            negocio: {
              select: { id: true, nombre: true, nenufarColor: true },
            },
          },
        },
      },
      orderBy: [{ conseguido: 'desc' }, { actualizadoEn: 'desc' }],
    });
  }

  async misLogros(usuarioId: number) {
    return this.prisma.logroUsuario.findMany({
      where: {
        usuarioId,
        conseguido: true,
      },
      select: {
        id: true,
        conseguidoEn: true,
        logro: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            tipo: true,
            dificultad: true,
            umbral: true,
            recompensaPuntos: true,
            accion: true,
          },
        },
      },
      orderBy: {
        conseguidoEn: 'desc',
      },
    });
  }

  async progresoUsuario(usuarioId: number) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const progreso = await this.logroEngine.buildProgresoUsuario(usuarioId);

    return progreso.map((item) => ({
      accion: item.accion,
      accionLabel: isAccionLogro(item.accion)
        ? ACCION_LOGRO_LABELS[item.accion]
        : item.accion,
      contador: item.contador,
      niveles: item.niveles,
    }));
  }

  async asignarOIncrementar(usuarioId: number, logroId: number) {
    const [usuario, logro, existente] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      }),
      this.prisma.logro.findUnique({
        where: { id: logroId },
        select: { id: true },
      }),
      this.prisma.logroUsuario.findUnique({
        where: {
          logroId_usuarioId: {
            logroId,
            usuarioId,
          },
        },
      }),
    ]);

    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!logro) throw new NotFoundException('Logro no encontrado');

    const now = new Date();

    return this.prisma.logroUsuario.upsert({
      where: {
        logroId_usuarioId: {
          logroId,
          usuarioId,
        },
      },
      create: {
        logroId,
        usuarioId,
        veces: 1,
        conseguido: true,
        conseguidoEn: now,
      },
      update: {
        veces: { increment: 1 },
        conseguido: true,
        conseguidoEn: existente?.conseguidoEn ?? now,
      },
      include: {
        logro: {
          include: {
            negocio: {
              select: { id: true, nombre: true, nenufarColor: true },
            },
          },
        },
        usuario: {
          select: { id: true, nombre: true, nickname: true },
        },
      },
    });
  }

  async findAll(negocioId?: number) {
    return this.prisma.logro.findMany({
      where: negocioId ? { negocioId } : undefined,
      include: {
        negocio: {
          select: { id: true, nombre: true, nenufarColor: true },
        },
      },
      orderBy: [{ actualizadoEn: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const logro = await this.prisma.logro.findUnique({
      where: { id },
      include: {
        negocio: {
          select: { id: true, nombre: true, nenufarColor: true },
        },
      },
    });
    if (!logro) throw new NotFoundException('Logro no encontrado');
    return logro;
  }

  async update(id: number, dto: UpdateLogroDto) {
    const logro = await this.prisma.logro.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!logro) throw new NotFoundException('Logro no encontrado');

    try {
      return await this.prisma.logro.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion?.trim() || null }
            : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.accion !== undefined
            ? { accion: dto.accion?.trim() || null }
            : {}),
          ...(dto.dificultad !== undefined
            ? { dificultad: dto.dificultad }
            : {}),
          ...(dto.umbral !== undefined ? { umbral: dto.umbral } : {}),
          ...(dto.recompensaPuntos !== undefined
            ? { recompensaPuntos: dto.recompensaPuntos }
            : {}),
          ...(dto.categoriaId !== undefined
            ? { categoriaId: dto.categoriaId }
            : {}),
          ...(dto.subcategoriaId !== undefined
            ? { subcategoriaId: dto.subcategoriaId }
            : {}),
          ...(dto.negocioId !== undefined ? { negocioId: dto.negocioId } : {}),
          ...(dto.productoId !== undefined
            ? { productoId: dto.productoId }
            : {}),
        },
        include: {
          negocio: {
            select: { id: true, nombre: true, nenufarColor: true },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Alguna referencia relacionada no existe',
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    const logro = await this.prisma.logro.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!logro) throw new NotFoundException('Logro no encontrado');
    return this.prisma.logro.delete({ where: { id } });
  }
}
