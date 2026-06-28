import { Injectable, Optional } from '@nestjs/common';
import {
  ContenidoEstado,
  LogroCategoria,
  MotivoTx,
  PedidoEstado,
  Prisma,
  ReservaEstado,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import { normalizeHorarioForRead } from '../negocio/horario.util';
import {
  ACCIONES_LOGRO_NEGOCIO,
  AccionLogro,
  AccionLogroNegocio,
} from './logro-accion';

type RegistrarAccionOpts = {
  usuarioId: number;
  accion: AccionLogro;
  refId?: number;
};

type RegistrarAccionNegocioOpts = {
  negocioId: number;
  accion: AccionLogroNegocio;
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
    const desbloqueados = await this.desbloquearLogrosParaAccion(opts);

    if (opts.accion !== 'TODOS_LOGROS_COMPLETADOS') {
      const final = await this.desbloquearLogrosParaAccion({
        usuarioId: opts.usuarioId,
        accion: 'TODOS_LOGROS_COMPLETADOS',
        refId: opts.refId,
      });
      desbloqueados.push(...final);
    }

    return { desbloqueados };
  }

  async registrarAccionNegocio(
    opts: RegistrarAccionNegocioOpts,
  ): Promise<{ desbloqueados: number[] }> {
    const desbloqueados = await this.desbloquearLogrosNegocioParaAccion(opts);
    return { desbloqueados };
  }

  private async desbloquearLogrosParaAccion(
    opts: RegistrarAccionOpts,
  ): Promise<number[]> {
    const contador = await this.getContadorAccion(opts.usuarioId, opts.accion);
    if (contador <= 0) {
      return [];
    }

    const logros = await this.prisma.logro.findMany({
      where: {
        accion: opts.accion,
      },
      orderBy: {
        umbral: 'asc',
      },
    });

    if (logros.length === 0) {
      return [];
    }

    const desbloqueados: number[] = [];

    for (const logro of logros) {
      const objetivo = await this.getObjetivoLogro(logro.accion, logro.umbral);
      if (objetivo <= 0) {
        continue;
      }

      const progreso = Math.min(contador, objetivo);
      const yaTiene = await this.prisma.logroUsuario.findUnique({
        where: {
          logroId_usuarioId: {
            logroId: logro.id,
            usuarioId: opts.usuarioId,
          },
        },
        select: { id: true, conseguido: true, conseguidoEn: true },
      });

      if (contador < objetivo) {
        if (yaTiene && !yaTiene.conseguido) {
          await this.prisma.logroUsuario.update({
            where: { id: yaTiene.id },
            data: { progreso },
          });
        } else if (!yaTiene) {
          try {
            await this.prisma.logroUsuario.create({
              data: {
                logroId: logro.id,
                usuarioId: opts.usuarioId,
                progreso,
                veces: 0,
                conseguido: false,
              },
            });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              continue;
            }
            throw error;
          }
        }
        continue;
      }

      if (yaTiene?.conseguido) {
        continue;
      }

      const conseguidoEn = new Date();

      try {
        const desbloqueado = await this.prisma.$transaction(async (tx) => {
          if (yaTiene) {
            const updated = await tx.logroUsuario.updateMany({
              where: {
                id: yaTiene.id,
                conseguido: false,
              },
              data: {
                progreso,
                veces: { increment: 1 },
                conseguido: true,
                conseguidoEn,
              },
            });

            if (updated.count === 0) {
              return false;
            }
          } else {
            await tx.logroUsuario.create({
              data: {
                logroId: logro.id,
                usuarioId: opts.usuarioId,
                progreso,
                veces: 1,
                conseguido: true,
                conseguidoEn,
              },
            });
          }

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

          return true;
        });

        if (!desbloqueado) {
          continue;
        }

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

    return desbloqueados;
  }

  private async desbloquearLogrosNegocioParaAccion(
    opts: RegistrarAccionNegocioOpts,
  ): Promise<number[]> {
    const contador = await this.getContadorAccionNegocio(
      opts.negocioId,
      opts.accion,
    );
    if (contador <= 0) {
      return [];
    }

    const logros = await this.prisma.logro.findMany({
      where: {
        accion: opts.accion,
        categoriaLogro: LogroCategoria.NEGOCIO,
      },
      orderBy: {
        umbral: 'asc',
      },
    });

    if (logros.length === 0) {
      return [];
    }

    const desbloqueados: number[] = [];

    for (const logro of logros) {
      const objetivo = Math.max(1, logro.umbral);
      const progreso = Math.min(contador, objetivo);
      const yaTiene = await this.prisma.logroNegocio.findUnique({
        where: {
          logroId_negocioId: {
            logroId: logro.id,
            negocioId: opts.negocioId,
          },
        },
        select: { id: true, conseguido: true, conseguidoEn: true },
      });

      if (contador < objetivo) {
        if (yaTiene && !yaTiene.conseguido) {
          await this.prisma.logroNegocio.update({
            where: { id: yaTiene.id },
            data: { progreso },
          });
        } else if (!yaTiene) {
          try {
            await this.prisma.logroNegocio.create({
              data: {
                logroId: logro.id,
                negocioId: opts.negocioId,
                progreso,
                veces: 0,
                conseguido: false,
              },
            });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              continue;
            }
            throw error;
          }
        }
        continue;
      }

      if (yaTiene?.conseguido) {
        continue;
      }

      const conseguidoEn = new Date();

      try {
        const desbloqueado = await this.prisma.$transaction(async (tx) => {
          const negocio = await tx.negocio.findUnique({
            where: { id: opts.negocioId },
            select: { id: true, nombre: true, duenoId: true },
          });

          if (!negocio) {
            return false;
          }

          if (yaTiene) {
            const updated = await tx.logroNegocio.updateMany({
              where: {
                id: yaTiene.id,
                conseguido: false,
              },
              data: {
                progreso,
                veces: { increment: 1 },
                conseguido: true,
                conseguidoEn,
              },
            });

            if (updated.count === 0) {
              return false;
            }
          } else {
            await tx.logroNegocio.create({
              data: {
                logroId: logro.id,
                negocioId: opts.negocioId,
                progreso,
                veces: 1,
                conseguido: true,
                conseguidoEn,
              },
            });
          }

          if (logro.recompensaPuntos > 0) {
            const usuario = await tx.usuario.update({
              where: { id: negocio.duenoId },
              data: {
                petalosSaldo: {
                  increment: logro.recompensaPuntos,
                },
              },
              select: { petalosSaldo: true },
            });

            await tx.petaloTx.create({
              data: {
                usuarioId: negocio.duenoId,
                delta: logro.recompensaPuntos,
                saldoResultante: usuario.petalosSaldo,
                motivo: MotivoTx.LOGRO,
                refTipo: 'LogroNegocio',
                refId: logro.id,
                metadata: opts.refId
                  ? {
                      accion: opts.accion,
                      accionRefId: opts.refId,
                      negocioId: negocio.id,
                      negocioNombre: negocio.nombre,
                    }
                  : {
                      accion: opts.accion,
                      negocioId: negocio.id,
                      negocioNombre: negocio.nombre,
                    },
              },
            });
          }

          return negocio.duenoId;
        });

        if (!desbloqueado) {
          continue;
        }

        desbloqueados.push(logro.id);

        try {
          await this.notificaciones?.fanoutUsuario({
            usuarioId: desbloqueado,
            tipo: 'SISTEMA',
            titulo: `🏅 Tu negocio ha desbloqueado: ${logro.titulo}`,
            contenido: logro.descripcion ?? undefined,
            link: `/negocios/${opts.negocioId}/logros`,
          });
        } catch {
          // Best effort: una notificación fallida no debe romper el desbloqueo.
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    return desbloqueados;
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

      case 'VISITA_TODAS_CATEGORIAS': {
        const visitas = await this.prisma.visitaNegocio.findMany({
          where: { usuarioId },
          select: {
            negocio: {
              select: { categoriaId: true },
            },
          },
        });
        return new Set(visitas.map((visita) => visita.negocio.categoriaId))
          .size;
      }

      case 'VISITA_TODAS_SUBCATEGORIAS': {
        const visitas = await this.prisma.visitaNegocio.findMany({
          where: { usuarioId },
          select: {
            negocio: {
              select: { subcategoriaId: true },
            },
          },
        });
        return new Set(
          visitas
            .map((visita) => visita.negocio.subcategoriaId)
            .filter((id): id is number => typeof id === 'number'),
        ).size;
      }

      case 'RESENAS_DIFERENTES_PUNTUACIONES': {
        const resenas = await this.prisma.resena.findMany({
          where: {
            usuarioId,
            eliminadoEn: null,
            estado: ContenidoEstado.PUBLICADO,
          },
          select: { puntuacion: true },
          distinct: ['puntuacion'],
        });
        return resenas.length;
      }

      case 'RESENAS_5_ESTRELLAS':
        return this.prisma.resena.count({
          where: {
            usuarioId,
            puntuacion: 5,
            eliminadoEn: null,
            estado: ContenidoEstado.PUBLICADO,
          },
        });

      case 'PERFIL_COMPLETADO': {
        const usuario = await this.prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: {
            nombre: true,
            nickname: true,
            email: true,
            biografia: true,
            foto: true,
          },
        });
        return usuario &&
          usuario.nombre?.trim() &&
          usuario.nickname?.trim() &&
          usuario.email?.trim() &&
          usuario.biografia?.trim() &&
          usuario.foto?.trim()
          ? 1
          : 0;
      }

      case 'HORARIO_NEGOCIO_CONFIGURADO': {
        const negocios = await this.prisma.negocio.findMany({
          where: {
            duenoId: usuarioId,
            activo: true,
            eliminadoEn: null,
          },
          select: { horario: true },
        });
        return negocios.filter((negocio) =>
          Boolean(normalizeHorarioForRead(negocio.horario)),
        ).length;
      }

      case 'HITO_NEGOCIO': {
        const negocios = await this.prisma.negocio.findMany({
          where: {
            duenoId: usuarioId,
            activo: true,
            eliminadoEn: null,
          },
          select: {
            _count: {
              select: {
                seguidores: true,
                resenas: true,
                reservas: true,
                productos: true,
              },
            },
          },
        });
        return negocios.filter(
          (negocio) =>
            negocio._count.seguidores > 0 ||
            negocio._count.resenas > 0 ||
            negocio._count.reservas > 0 ||
            negocio._count.productos > 0,
        ).length;
      }

      case 'TODOS_LOGROS_COMPLETADOS':
        return this.prisma.logroUsuario.count({
          where: {
            usuarioId,
            conseguido: true,
            logro: {
              esFinal: false,
            },
          },
        });

      default:
        return 0;
    }
  }

  async getContadorAccionNegocio(
    negocioId: number,
    accion: AccionLogroNegocio,
  ) {
    switch (accion) {
      case 'NEGOCIO_RECIBIR_RESENAS':
        return this.prisma.resena.count({
          where: {
            negocioId,
            eliminadoEn: null,
            estado: ContenidoEstado.PUBLICADO,
          },
        });

      case 'NEGOCIO_CREAR_PROMOCIONES':
        return this.prisma.promocion.count({
          where: {
            negocioId,
            eliminadoEn: null,
          },
        });

      case 'NEGOCIO_RECIBIR_RESERVAS':
        return this.prisma.reserva.count({
          where: {
            negocioId,
            estado: {
              not: ReservaEstado.CANCELADA,
            },
          },
        });

      case 'NEGOCIO_COMPLETAR_PEDIDOS':
        return this.prisma.pedido.count({
          where: {
            negocioId,
            estado: PedidoEstado.COMPLETADO,
          },
        });

      case 'NEGOCIO_CONSEGUIR_SEGUIDORES':
        return this.prisma.negocioSeguimiento.count({
          where: { negocioId },
        });

      case 'NEGOCIO_TENER_PRODUCTOS':
        return this.prisma.producto.count({
          where: {
            negocioId,
            activo: true,
            eliminadoEn: null,
          },
        });

      case 'NEGOCIO_RECIBIR_VISITAS':
        return this.prisma.visitaNegocio.count({
          where: { negocioId },
        });
    }
  }

  async getObjetivoLogro(accion: string | null, umbral: number) {
    switch (accion) {
      case 'VISITA_TODAS_CATEGORIAS':
        return this.prisma.categoria.count({
          where: {
            activo: true,
            eliminadoEn: null,
            negocios: {
              some: {
                activo: true,
                eliminadoEn: null,
              },
            },
          },
        });

      case 'VISITA_TODAS_SUBCATEGORIAS':
        return this.prisma.subcategoria.count({
          where: {
            activo: true,
            eliminadoEn: null,
            negocios: {
              some: {
                activo: true,
                eliminadoEn: null,
              },
            },
          },
        });

      case 'TODOS_LOGROS_COMPLETADOS':
        return this.prisma.logro.count({
          where: {
            esFinal: false,
          },
        });

      default:
        return umbral;
    }
  }

  async buildProgresoUsuario(usuarioId: number) {
    const logros = await this.prisma.logro.findMany({
      where: {
        accion: {
          not: null,
        },
        NOT: {
          accion: {
            in: [...ACCIONES_LOGRO_NEGOCIO],
          },
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

    const acciones = [
      ...new Set(logros.map((logro) => logro.accion).filter(Boolean)),
    ];
    const contadores = new Map<AccionLogro, number>();

    for (const accion of acciones) {
      const typedAccion = accion as AccionLogro;
      contadores.set(
        typedAccion,
        await this.getContadorAccion(usuarioId, typedAccion),
      );
    }

    const grupos: Array<{
      accion: string;
      contador: number;
      niveles: Array<{
        id: number;
        titulo: string;
        descripcion: string | null;
        categoriaLogro: string;
        oculto: boolean;
        esFinal: boolean;
        umbral: number;
        progresoActual: number;
        progresoObjetivo: number;
        progresoPorcentaje: number;
        recompensaPuntos: number;
        recompensaPetalos: number;
        desbloqueado: boolean;
        conseguidoEn?: Date | null;
      }>;
    }> = [];

    for (const logro of logros) {
      const accion = logro.accion;
      if (!accion) {
        continue;
      }

      const existing = grupos.at(-1);
      const desbloqueo = logro.logrosUsuario[0];
      const contador = contadores.get(accion as AccionLogro) ?? 0;
      const objetivo = await this.getObjetivoLogro(accion, logro.umbral);
      const progresoActual = desbloqueo?.conseguidoEn
        ? objetivo
        : Math.min(contador, objetivo);
      const progresoPorcentaje =
        objetivo > 0
          ? Math.min(100, Math.floor((progresoActual / objetivo) * 100))
          : 0;
      const desbloqueado = Boolean(desbloqueo);
      const ocultoBloqueado = logro.oculto && !desbloqueado;

      if (!existing || existing.accion !== accion) {
        grupos.push({
          accion,
          contador,
          niveles: [],
        });
      }

      grupos[grupos.length - 1].niveles.push({
        id: logro.id,
        titulo: ocultoBloqueado ? 'Logro oculto' : logro.titulo,
        descripcion: ocultoBloqueado ? null : logro.descripcion,
        categoriaLogro: logro.categoriaLogro,
        oculto: logro.oculto,
        esFinal: logro.esFinal,
        umbral: objetivo,
        progresoActual,
        progresoObjetivo: objetivo,
        progresoPorcentaje,
        recompensaPuntos: logro.recompensaPuntos,
        recompensaPetalos: logro.recompensaPuntos,
        desbloqueado,
        conseguidoEn: desbloqueo?.conseguidoEn,
      });
    }

    return grupos;
  }
}
