import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LogroCategoria, MotivoTx, Prisma } from '@prisma/client';
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
    const recompensaPuntos = dto.recompensaPetalos ?? dto.recompensaPuntos;
    if (recompensaPuntos === undefined) {
      throw new BadRequestException(
        'recompensaPuntos o recompensaPetalos es requerido',
      );
    }

    try {
      return await this.prisma.logro.create({
        data: {
          titulo: dto.titulo.trim(),
          descripcion: dto.descripcion?.trim() || null,
          tipo: dto.tipo,
          categoriaLogro: dto.categoriaLogro ?? LogroCategoria.GENERAL,
          oculto: dto.oculto ?? false,
          esFinal: dto.esFinal ?? false,
          accion: dto.accion?.trim() || null,
          dificultad: dto.dificultad,
          umbral: dto.umbral,
          recompensaPuntos,
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
    const logros = await this.prisma.logroUsuario.findMany({
      where: {
        usuarioId,
        conseguido: true,
      },
      select: {
        id: true,
        progreso: true,
        conseguido: true,
        conseguidoEn: true,
        logro: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            tipo: true,
            categoriaLogro: true,
            oculto: true,
            esFinal: true,
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

    return logros.map((item) => ({
      ...item,
      desbloqueado: item.conseguido,
      logro: {
        ...item.logro,
        recompensaPetalos: item.logro.recompensaPuntos,
      },
    }));
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

  async resumenUsuario(usuarioId: number) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const [usuario, logros, petalosGanadosPorLogros] =
      await this.prisma.$transaction([
        this.prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true, petalosSaldo: true },
        }),
        this.prisma.logro.findMany({
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            categoriaLogro: true,
            oculto: true,
            esFinal: true,
            logrosUsuario: {
              where: { usuarioId, conseguido: true },
              select: { id: true, conseguidoEn: true },
            },
          },
        }),
        this.prisma.petaloTx.aggregate({
          where: {
            usuarioId,
            motivo: MotivoTx.LOGRO,
            delta: { gt: 0 },
          },
          _sum: { delta: true },
        }),
      ]);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const total = logros.length;
    const desbloqueados = logros.filter(
      (logro) => logro.logrosUsuario.length > 0,
    ).length;
    const categorias = Object.values(LogroCategoria).map((categoriaLogro) => {
      const items = logros.filter(
        (logro) => logro.categoriaLogro === categoriaLogro,
      );
      return {
        categoriaLogro,
        total: items.length,
        desbloqueados: items.filter((logro) => logro.logrosUsuario.length > 0)
          .length,
      };
    });
    const finales = logros.filter((logro) => logro.esFinal);
    const logroFinal = finales[0];
    const logroFinalDesbloqueado = Boolean(logroFinal?.logrosUsuario.length);

    return {
      total,
      desbloqueados,
      pendientes: Math.max(0, total - desbloqueados),
      porcentaje: total > 0 ? Math.floor((desbloqueados / total) * 100) : 0,
      petalosSaldo: usuario.petalosSaldo,
      petalosBalance: usuario.petalosSaldo,
      petalosGanadosPorLogros: petalosGanadosPorLogros._sum.delta ?? 0,
      ocultos: {
        total: logros.filter((logro) => logro.oculto).length,
        desbloqueados: logros.filter(
          (logro) => logro.oculto && logro.logrosUsuario.length > 0,
        ).length,
      },
      finales: {
        total: finales.length,
        desbloqueados: finales.filter((logro) => logro.logrosUsuario.length > 0)
          .length,
      },
      categorias,
      logroFinal: logroFinal
        ? {
            id: logroFinal.id,
            titulo:
              logroFinal.oculto && !logroFinalDesbloqueado
                ? 'Logro oculto'
                : logroFinal.titulo,
            descripcion:
              logroFinal.oculto && !logroFinalDesbloqueado
                ? null
                : logroFinal.descripcion,
            desbloqueado: logroFinalDesbloqueado,
            conseguidoEn: logroFinal.logrosUsuario[0]?.conseguidoEn ?? null,
          }
        : null,
    };
  }

  async asignarOIncrementar(usuarioId: number, logroId: number) {
    const [usuario, logro, existente] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      }),
      this.prisma.logro.findUnique({
        where: { id: logroId },
        select: {
          id: true,
          umbral: true,
          recompensaPuntos: true,
          esFinal: true,
        },
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

    if (logro.esFinal) {
      const [totalPrevios, completadosPrevios] = await this.prisma.$transaction(
        [
          this.prisma.logro.count({ where: { esFinal: false } }),
          this.prisma.logroUsuario.count({
            where: {
              usuarioId,
              conseguido: true,
              logro: { esFinal: false },
            },
          }),
        ],
      );

      if (totalPrevios === 0 || completadosPrevios < totalPrevios) {
        throw new BadRequestException(
          'El logro final solo se puede desbloquear al completar todos los demás',
        );
      }
    }

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
        progreso: logro.umbral,
        veces: 1,
        conseguido: true,
        conseguidoEn: now,
      },
      update: {
        progreso: logro.umbral,
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

  async findAll(options?: {
    negocioId?: number;
    categoriaLogro?: LogroCategoria;
    incluirOcultos?: boolean;
  }) {
    return this.prisma.logro.findMany({
      where: {
        ...(options?.negocioId ? { negocioId: options.negocioId } : {}),
        ...(options?.categoriaLogro
          ? { categoriaLogro: options.categoriaLogro }
          : {}),
        ...(options?.incluirOcultos ? {} : { oculto: false }),
      },
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
    const recompensaPuntos = dto.recompensaPetalos ?? dto.recompensaPuntos;

    try {
      return await this.prisma.logro.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion?.trim() || null }
            : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.categoriaLogro !== undefined
            ? { categoriaLogro: dto.categoriaLogro }
            : {}),
          ...(dto.oculto !== undefined ? { oculto: dto.oculto } : {}),
          ...(dto.esFinal !== undefined ? { esFinal: dto.esFinal } : {}),
          ...(dto.accion !== undefined
            ? { accion: dto.accion?.trim() || null }
            : {}),
          ...(dto.dificultad !== undefined
            ? { dificultad: dto.dificultad }
            : {}),
          ...(dto.umbral !== undefined ? { umbral: dto.umbral } : {}),
          ...(recompensaPuntos !== undefined ? { recompensaPuntos } : {}),
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
