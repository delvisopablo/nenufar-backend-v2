import { BadRequestException, Injectable } from '@nestjs/common';
import { MotivoTx } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class PetalosService {
  constructor(private prisma: PrismaService) {}

  /** Saldo del usuario actual */
  async balance(userId: number) {
    const u = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, petalosSaldo: true },
    });
    return u;
  }

  /** Ledger del usuario actual (paginado) */
  async ledger(
    userId: number,
    page?: number | string,
    limit?: number | string,
  ) {
    const { skip, take, page: p, limit: l } = toPaging(page, limit);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.petaloTx.findMany({
        where: { usuarioId: userId },
        orderBy: { creadoEn: 'desc' },
        skip,
        take,
      }),
      this.prisma.petaloTx.count({ where: { usuarioId: userId } }),
    ]);
    return { items, total, page: p, limit: l };
  }

  /** Ajuste manual (admin) */
  async ajustarAdmin(
    usuarioId: number,
    delta: number,
    motivo: MotivoTx = MotivoTx.OTRO,
    refTipo?: string,
    refId?: number,
  ) {
    if (!delta || Number.isNaN(delta))
      throw new BadRequestException('Delta inválido');
    return this.prisma.$transaction(async (tx) => {
      await tx.petaloTx.create({
        data: { usuarioId, delta, motivo, refTipo, refId },
      });
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { petalosSaldo: { increment: delta } },
      });
      return { ok: true };
    });
  }
}
