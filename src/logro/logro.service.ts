import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LogroCategoria, MotivoTx, Prisma, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLogroDto } from './dto/create-logro.dto';
import { UpdateLogroDto } from './dto/update-logro.dto';
import {
  ACCION_LOGRO_LABELS,
  ACCIONES_LOGRO_NEGOCIO,
  AccionLogroNegocio,
  isAccionLogro,
  isAccionLogroNegocio,
} from './logro-accion';
import { LogroEngineService } from './logro-engine.service';

const accionesLogroNegocio = [...ACCIONES_LOGRO_NEGOCIO];

@Injectable()
export class LogroService {
  constructor(
    private prisma: PrismaService,
    private readonly logroEngine: LogroEngineService,
  ) {}

  private whereLogrosUsuario(): Prisma.LogroWhereInput {
    return {
      OR: [
        { accion: null },
        {
          accion: {
            notIn: accionesLogroNegocio,
          },
        },
      ],
    };
  }

  private whereLogrosNegocio(): Prisma.LogroWhereInput {
    return {
      categoriaLogro: LogroCategoria.NEGOCIO,
      accion: {
        in: accionesLogroNegocio,
      },
    };
  }

  private mapLogroDestacado(
    item: {
      id: number;
      posicion: number;
      creadoEn: Date;
      logro: {
        id: number;
        titulo: string;
        descripcion: string | null;
        tipo: string;
        categoriaLogro: string;
        oculto: boolean;
        esFinal: boolean;
        dificultad: string;
        umbral: number;
        recompensaPuntos: number;
        accion: string | null;
      };
    },
    conseguidoEn?: Date | null,
  ) {
    return {
      id: item.id,
      posicion: item.posicion,
      creadoEn: item.creadoEn,
      logro: {
        ...item.logro,
        recompensaPetalos: item.logro.recompensaPuntos,
        desbloqueado: true,
        conseguido: true,
        conseguidoEn: conseguidoEn ?? null,
      },
    };
  }

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
    const [usuario, logros, destacados] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true, petalosSaldo: true },
      }),
      this.prisma.logro.findMany({
        where: this.whereLogrosUsuario(),
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
          logrosUsuario: {
            where: { usuarioId },
            select: {
              id: true,
              progreso: true,
              conseguido: true,
              conseguidoEn: true,
              actualizadoEn: true,
            },
          },
        },
        orderBy: [
          { categoriaLogro: 'asc' },
          { accion: 'asc' },
          { umbral: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.usuarioLogroDestacado.findMany({
        where: { usuarioId },
        orderBy: { posicion: 'asc' },
        include: {
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
      }),
    ]);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const acciones = [
      ...new Set(
        logros
          .map((logro) => logro.accion)
          .filter((accion): accion is string => typeof accion === 'string'),
      ),
    ];
    const contadores = new Map<string, number>();

    for (const accion of acciones) {
      if (isAccionLogro(accion)) {
        contadores.set(
          accion,
          await this.logroEngine.getContadorAccion(usuarioId, accion),
        );
      }
    }

    const destacadosSet = new Set(destacados.map((item) => item.logroId));
    const desbloqueosPorLogro = new Map<number, Date | null>();

    const items: Array<{
      id: number;
      titulo: string;
      descripcion: string | null;
      tipo: string;
      categoriaLogro: string;
      oculto: boolean;
      esFinal: boolean;
      dificultad: string;
      accion: string | null;
      accionLabel: string | null;
      umbral: number;
      progresoActual: number;
      progresoObjetivo: number;
      progresoPorcentaje: number;
      recompensaPuntos: number;
      recompensaPetalos: number;
      desbloqueado: boolean;
      conseguido: boolean;
      conseguidoEn: Date | null;
      destacado: boolean;
    }> = [];
    for (const logro of logros) {
      const desbloqueo = logro.logrosUsuario[0];
      const accion = logro.accion;
      const objetivo = await this.logroEngine.getObjetivoLogro(
        accion,
        logro.umbral,
      );

      const contador = accion ? (contadores.get(accion) ?? 0) : 0;
      const desbloqueado = Boolean(desbloqueo?.conseguido);
      const progresoActual = desbloqueado
        ? objetivo
        : Math.min(desbloqueo?.progreso ?? contador, objetivo);
      const progresoPorcentaje =
        objetivo > 0
          ? Math.min(100, Math.floor((progresoActual / objetivo) * 100))
          : 0;
      const ocultoBloqueado = logro.oculto && !desbloqueado;

      if (desbloqueado) {
        desbloqueosPorLogro.set(logro.id, desbloqueo?.conseguidoEn ?? null);
      }

      items.push({
        id: logro.id,
        titulo: ocultoBloqueado ? 'Logro oculto' : logro.titulo,
        descripcion: ocultoBloqueado ? null : logro.descripcion,
        tipo: logro.tipo,
        categoriaLogro: logro.categoriaLogro,
        oculto: logro.oculto,
        esFinal: logro.esFinal,
        dificultad: logro.dificultad,
        accion,
        accionLabel:
          accion && isAccionLogro(accion)
            ? ACCION_LOGRO_LABELS[accion]
            : accion,
        umbral: objetivo,
        progresoActual,
        progresoObjetivo: objetivo,
        progresoPorcentaje,
        recompensaPuntos: logro.recompensaPuntos,
        recompensaPetalos: logro.recompensaPuntos,
        desbloqueado,
        conseguido: desbloqueado,
        conseguidoEn: desbloqueo?.conseguidoEn ?? null,
        destacado: destacadosSet.has(logro.id),
      });
    }

    const desbloqueadosParaDestacar = items
      .filter((item) => item.desbloqueado)
      .map((item) => ({
        id: item.id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        tipo: item.tipo,
        categoriaLogro: item.categoriaLogro,
        dificultad: item.dificultad,
        recompensaPuntos: item.recompensaPuntos,
        recompensaPetalos: item.recompensaPetalos,
        conseguidoEn: item.conseguidoEn,
        destacado: item.destacado,
      }));

    const total = items.length;
    const desbloqueados = items.filter((item) => item.desbloqueado).length;

    return {
      petalosSaldo: usuario.petalosSaldo,
      petalosBalance: usuario.petalosSaldo,
      total,
      totalLogros: total,
      desbloqueados,
      logrosDesbloqueados: desbloqueados,
      pendientes: Math.max(0, total - desbloqueados),
      porcentaje: total > 0 ? Math.floor((desbloqueados / total) * 100) : 0,
      logros: items,
      destacados: destacados.map((item) =>
        this.mapLogroDestacado(item, desbloqueosPorLogro.get(item.logroId)),
      ),
      desbloqueadosParaDestacar,
    };
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
          where: this.whereLogrosUsuario(),
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

  async logrosDestacados(usuarioId: number) {
    const destacados = await this.prisma.usuarioLogroDestacado.findMany({
      where: { usuarioId },
      orderBy: { posicion: 'asc' },
      include: {
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
            logrosUsuario: {
              where: { usuarioId, conseguido: true },
              select: { conseguidoEn: true },
            },
          },
        },
      },
    });

    return destacados.map((item) => {
      const { logrosUsuario, ...logro } = item.logro;
      return this.mapLogroDestacado(
        {
          id: item.id,
          posicion: item.posicion,
          creadoEn: item.creadoEn,
          logro,
        },
        logrosUsuario[0]?.conseguidoEn ?? null,
      );
    });
  }

  async actualizarLogrosDestacados(usuarioId: number, logroIds: number[]) {
    if (!Array.isArray(logroIds)) {
      throw new BadRequestException('logroIds debe ser un array');
    }

    if (logroIds.length > 3) {
      throw new BadRequestException('Solo puedes destacar hasta 3 logros');
    }

    const ids = logroIds.map((id) => Number(id));
    if (
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new BadRequestException(
        'Los logros destacados deben ser IDs positivos y sin duplicados',
      );
    }

    if (ids.length > 0) {
      const desbloqueados = await this.prisma.logroUsuario.findMany({
        where: {
          usuarioId,
          logroId: { in: ids },
          conseguido: true,
          logro: this.whereLogrosUsuario(),
        },
        select: { logroId: true },
      });
      const desbloqueadosSet = new Set(
        desbloqueados.map((item) => item.logroId),
      );

      if (ids.some((id) => !desbloqueadosSet.has(id))) {
        throw new BadRequestException(
          'Solo puedes destacar logros desbloqueados',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.usuarioLogroDestacado.deleteMany({
        where: { usuarioId },
      });

      if (ids.length > 0) {
        await tx.usuarioLogroDestacado.createMany({
          data: ids.map((logroId, index) => ({
            usuarioId,
            logroId,
            posicion: index + 1,
          })),
        });
      }
    });

    return this.logrosDestacados(usuarioId);
  }

  async logrosDesbloqueadosParaDestacar(usuarioId: number) {
    const logros = await this.prisma.logroUsuario.findMany({
      where: {
        usuarioId,
        conseguido: true,
        logro: this.whereLogrosUsuario(),
      },
      orderBy: { conseguidoEn: 'desc' },
      select: {
        conseguidoEn: true,
        logro: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            tipo: true,
            categoriaLogro: true,
            dificultad: true,
            recompensaPuntos: true,
          },
        },
      },
    });

    const destacados = await this.prisma.usuarioLogroDestacado.findMany({
      where: { usuarioId },
      select: { logroId: true },
    });
    const destacadosSet = new Set(destacados.map((item) => item.logroId));

    return logros.map((item) => ({
      ...item.logro,
      recompensaPetalos: item.logro.recompensaPuntos,
      conseguidoEn: item.conseguidoEn,
      destacado: destacadosSet.has(item.logro.id),
    }));
  }

  async logrosPorNegocio(negocioId: number, actorUserId?: number) {
    const negocio = await this.prisma.negocio.findFirst({
      where: { id: negocioId, eliminadoEn: null },
      select: { id: true, duenoId: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    let accesoCompleto = false;
    if (actorUserId && Number.isInteger(actorUserId) && actorUserId > 0) {
      const [actor, miembro] = await this.prisma.$transaction([
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

      accesoCompleto = Boolean(
        negocio.duenoId === actorUserId ||
          miembro ||
          actor?.rolGlobal === RolGlobal.ADMIN ||
          actor?.rolGlobal === RolGlobal.MODERADOR,
      );
    }

    const logros = await this.prisma.logro.findMany({
      where: this.whereLogrosNegocio(),
      orderBy: [{ accion: 'asc' }, { umbral: 'asc' }, { id: 'asc' }],
      include: {
        logrosNegocio: {
          where: { negocioId },
          select: {
            id: true,
            progreso: true,
            conseguido: true,
            conseguidoEn: true,
            actualizadoEn: true,
          },
        },
      },
    });

    const acciones = [
      ...new Set(
        logros
          .map((logro) => logro.accion)
          .filter((accion): accion is AccionLogroNegocio =>
            isAccionLogroNegocio(accion),
          ),
      ),
    ];
    const contadores = new Map<AccionLogroNegocio, number>();
    for (const accion of acciones) {
      contadores.set(
        accion,
        await this.logroEngine.getContadorAccionNegocio(negocioId, accion),
      );
    }

    const items = logros
      .map((logro) => {
        const accion = logro.accion;
        if (!isAccionLogroNegocio(accion)) {
          return null;
        }

        const progreso = logro.logrosNegocio[0];
        const objetivo = Math.max(1, logro.umbral);
        const contador = contadores.get(accion) ?? 0;
        const desbloqueado = Boolean(progreso?.conseguido);
        const progresoActual = desbloqueado
          ? objetivo
          : Math.min(progreso?.progreso ?? contador, objetivo);
        const progresoPorcentaje =
          objetivo > 0
            ? Math.min(100, Math.floor((progresoActual / objetivo) * 100))
            : 0;

        return {
          id: logro.id,
          titulo: logro.titulo,
          descripcion: logro.descripcion,
          tipo: logro.tipo,
          categoriaLogro: logro.categoriaLogro,
          oculto: logro.oculto,
          esFinal: logro.esFinal,
          accion,
          accionLabel: ACCION_LOGRO_LABELS[accion],
          dificultad: logro.dificultad,
          umbral: objetivo,
          progresoActual: accesoCompleto
            ? progresoActual
            : desbloqueado
              ? objetivo
              : 0,
          progresoObjetivo: objetivo,
          progresoPorcentaje: accesoCompleto
            ? progresoPorcentaje
            : desbloqueado
              ? 100
              : 0,
          recompensaPuntos: logro.recompensaPuntos,
          recompensaPetalos: logro.recompensaPuntos,
          desbloqueado,
          conseguido: desbloqueado,
          conseguidoEn: progreso?.conseguidoEn ?? null,
          actualizadoEn: progreso?.actualizadoEn ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const logrosConseguidos = items.filter((item) => item.desbloqueado).length;
    const visibles = accesoCompleto
      ? items
      : items.filter((item) => item.desbloqueado && !item.oculto);

    return {
      negocioId,
      acceso: accesoCompleto ? 'GESTOR' : 'VISITANTE',
      totalLogros: items.length,
      logrosConseguidos,
      porcentaje:
        items.length > 0
          ? Math.floor((logrosConseguidos / items.length) * 100)
          : 0,
      logros: visibles,
    };
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
