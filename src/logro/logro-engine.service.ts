import { Injectable, Optional } from '@nestjs/common';
import {
  MotivoTx,
  Prisma,
  ReservaEstado,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import { AccionLogro } from './logro-accion';

type RegistrarAccionOpts = {
  usuarioId: number;
  accion: AccionLogro;
  refId?: number;
};

@Injectable()
export class LogroEngineService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly notificaciones?: NotificacionService,
  ) {}

  async registrarAccion(
    opts: RegistrarAccionOpts,
  ): Promise<{ desbloqueados: number[] }> {
    const contador = await this.getContadorAccion(opts.usuarioId, opts.accion);
    if (contador <= 0) {
      return { desbloqueados: [] };
    }

    const logros = await this.prisma.logro.findMany({
      where: {
        accion: opts.accion,
        umbral: {
          lte: contador,
        },
      },
      orderBy: {
        umbral: 'asc',
      },
    });

    if (logros.length === 0) {
      return { desbloqueados: [] };
    }

    const desbloqueados: number[] = [];

    for (const logro of logros) {
      const yaTiene = await this.prisma.logroUsuario.findUnique({
        where: {
          logroId_usuarioId: {
            logroId: logro.id,
            usuarioId: opts.usuarioId,
          },
        },
        select: { id: true },
      });

      if (yaTiene) {
        continue;
      }

      const conseguidoEn = new Date();

      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.logroUsuario.create({
            data: {
              logroId: logro.id,
              usuarioId: opts.usuarioId,
              veces: 1,
              conseguido: true,
              conseguidoEn,
            },
          });

          const usuario = await tx.usuario.update({
            where: { id: opts.usuarioId },
            data: {
              petalosSaldo: {
                increment: logro.recompensaPuntos,
              },
            },
            select: { petalosSaldo: true },
          });

          await tx.petaloTx.create({
            data: {
              usuarioId: opts.usuarioId,
              delta: logro.recompensaPuntos,
              saldoResultante: usuario.petalosSaldo,
              motivo: MotivoTx.LOGRO,
              refTipo: 'Logro',
              refId: logro.id,
              metadata: opts.refId
                ? {
                    accion: opts.accion,
                    accionRefId: opts.refId,
                  }
                : {
                    accion: opts.accion,
                  },
            },
          });
        });

        desbloqueados.push(logro.id);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }

      try {
        await this.notificaciones?.fanoutUsuario({
          usuarioId: opts.usuarioId,
          tipo: 'SISTEMA',
          titulo: `🏅 Has desbloqueado: ${logro.titulo}`,
          contenido: logro.descripcion ?? undefined,
          link: '/mis-logros',
        });
      } catch {
        // Best effort: una notificación fallida no debe romper el desbloqueo.
      }
    }

    return { desbloqueados };
  }

  async getContadorAccion(usuarioId: number, accion: AccionLogro) {
    switch (accion) {
      case 'RESENA_PUBLICADA':
        return this.prisma.resena.count({
          where: {
            usuarioId,
            eliminadoEn: null,
          },
        });

      case 'COMPRA_REALIZADA':
        return this.prisma.compra.count({
          where: { usuarioId },
        });

      case 'RESERVA_HECHA':
        return this.prisma.reserva.count({
          where: {
            usuarioId,
            estado: {
              not: ReservaEstado.CANCELADA,
            },
          },
        });

      case 'PROMOCION_CANJEADA':
        return this.prisma.pedidoProducto.count({
          where: {
            promocionId: {
              not: null,
            },
            pedido: {
              compras: {
                some: {
                  usuarioId,
                },
              },
            },
          },
        });

      case 'VISITA_NEGOCIO': {
        const visitas = await this.prisma.visitaNegocio.findMany({
          where: {
            usuarioId,
          },
          select: {
            negocioId: true,
          },
          distinct: ['negocioId'],
        });
        return visitas.length;
      }

      case 'NEGOCIO_SEGUIDO':
        return this.prisma.negocioSeguimiento.count({
          where: { usuarioId },
        });
    }
  }

  async buildProgresoUsuario(usuarioId: number) {
    const logros = await this.prisma.logro.findMany({
      where: {
        accion: {
          not: null,
        },
      },
      orderBy: [{ accion: 'asc' }, { umbral: 'asc' }],
      include: {
        logrosUsuario: {
          where: {
            usuarioId,
            conseguido: true,
          },
          select: {
            id: true,
            conseguidoEn: true,
          },
        },
      },
    });

    const acciones = [...new Set(logros.map((logro) => logro.accion).filter(Boolean))];
    const contadores = new Map<AccionLogro, number>();

    for (const accion of acciones) {
      const typedAccion = accion as AccionLogro;
      contadores.set(
        typedAccion,
        await this.getContadorAccion(usuarioId, typedAccion),
      );
    }

    return logros.reduce<
      Array<{
        accion: string;
        contador: number;
        niveles: Array<{
          id: number;
          titulo: string;
          umbral: number;
          recompensaPuntos: number;
          desbloqueado: boolean;
          conseguidoEn?: Date | null;
        }>;
      }>
    >((acc, logro) => {
      const accion = logro.accion;
      if (!accion) {
        return acc;
      }

      const existing = acc.at(-1);
      const desbloqueo = logro.logrosUsuario[0];

      if (!existing || existing.accion !== accion) {
        acc.push({
          accion,
          contador: contadores.get(accion as AccionLogro) ?? 0,
          niveles: [],
        });
      }

      acc[acc.length - 1].niveles.push({
        id: logro.id,
        titulo: logro.titulo,
        umbral: logro.umbral,
        recompensaPuntos: logro.recompensaPuntos,
        desbloqueado: Boolean(desbloqueo),
        conseguidoEn: desbloqueo?.conseguidoEn,
      });

      return acc;
    }, []);
  }
}
