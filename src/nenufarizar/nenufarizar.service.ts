import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  MotivoTx,
  NotificacionTipo,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const REFERIDO_CODIGO_LENGTH = 6;
const REFERIDO_CODIGO_MAX_ATTEMPTS = 5;
const REFERIDO_RECOMPENSA = 50;
const referidoPublicSelect = {
  id: true,
  nickname: true,
  foto: true,
  creadoEn: true,
} satisfies Prisma.UsuarioSelect;

type ReferidoPublicRecord = Prisma.UsuarioGetPayload<{
  select: typeof referidoPublicSelect;
}>;

@Injectable()
export class NenufarizarService {
  constructor(private readonly prisma: PrismaService) {}

  private generarCodigoAleatorio() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < REFERIDO_CODIGO_LENGTH; i += 1) {
      code += alphabet[randomInt(alphabet.length)];
    }

    return code;
  }

  private async asignarNuevoCodigo(
    usuarioId: number,
    currentCode?: string | null,
  ) {
    for (let attempt = 0; attempt < REFERIDO_CODIGO_MAX_ATTEMPTS; attempt += 1) {
      const candidate = this.generarCodigoAleatorio();

      if (candidate === currentCode) {
        continue;
      }

      try {
        const updated = await this.prisma.usuario.update({
          where: { id: usuarioId },
          data: { codigoReferido: candidate },
          select: { codigoReferido: true },
        });

        return updated.codigoReferido as string;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException('Usuario no encontrado');
        }

        throw error;
      }
    }

    throw new InternalServerErrorException(
      'No se pudo generar un código de referido único',
    );
  }

  async generarCodigo(usuarioId: number): Promise<string> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, codigoReferido: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.codigoReferido) {
      return usuario.codigoReferido;
    }

    return this.asignarNuevoCodigo(usuarioId);
  }

  async regenerarCodigo(usuarioId: number): Promise<string> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, codigoReferido: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.asignarNuevoCodigo(usuarioId, usuario.codigoReferido);
  }

  async obtenerReferidos(
    usuarioId: number,
  ): Promise<ReferidoPublicRecord[]> {
    return this.prisma.usuario.findMany({
      where: { referidoPorId: usuarioId },
      orderBy: { creadoEn: 'desc' },
      select: referidoPublicSelect,
    });
  }

  async procesarReferido(
    nuevoUsuarioId: number,
    codigoReferido: string,
  ): Promise<void> {
    const normalizedCode = codigoReferido.trim().toUpperCase();

    if (!normalizedCode) {
      throw new BadRequestException('Código de referido inválido');
    }

    await this.prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuario.findUnique({
        where: { id: nuevoUsuarioId },
        select: { id: true, referidoPorId: true },
      });

      if (!nuevoUsuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const referidor = await tx.usuario.findUnique({
        where: { codigoReferido: normalizedCode },
        select: { id: true, petalosSaldo: true },
      });

      if (!referidor) {
        throw new BadRequestException('Código de referido inválido');
      }

      if (referidor.id === nuevoUsuario.id) {
        throw new BadRequestException(
          'No puedes usar tu propio código de referido',
        );
      }

      if (nuevoUsuario.referidoPorId) {
        throw new BadRequestException(
          'El usuario ya tiene un referidor asignado',
        );
      }

      const vinculo = await tx.usuario.updateMany({
        where: {
          id: nuevoUsuarioId,
          referidoPorId: null,
        },
        data: {
          referidoPorId: referidor.id,
        },
      });

      if (vinculo.count === 0) {
        throw new BadRequestException(
          'El usuario ya tiene un referidor asignado',
        );
      }

      const saldoReferidor = await tx.usuario.update({
        where: { id: referidor.id },
        data: {
          petalosSaldo: {
            increment: REFERIDO_RECOMPENSA,
          },
        },
        select: { petalosSaldo: true },
      });

      await tx.petaloTx.create({
        data: {
          usuarioId: referidor.id,
          delta: REFERIDO_RECOMPENSA,
          saldoResultante: saldoReferidor.petalosSaldo,
          motivo: MotivoTx.REFERIDO,
          refTipo: 'Usuario',
          refId: nuevoUsuarioId,
        },
      });

      await tx.notificacion.create({
        data: {
          usuarioId: referidor.id,
          tipo: NotificacionTipo.REFERIDO,
          titulo: '¡Tienes un nuevo referido!',
          contenido: 'Alguien se ha unido con tu código. +50 pétalos',
        },
      });
    });
  }
}
