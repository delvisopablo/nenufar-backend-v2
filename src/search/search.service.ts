import { Injectable } from '@nestjs/common';
import { EstadoCuenta, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NegocioService } from '../negocio/negocio.service';
import { ProductoService } from '../producto/producto.service';
import { PromocionService } from '../promocion/promocion.service';

function toLimit(limit?: number | string, fallback = 10, max = 30) {
  const n = Number(limit ?? fallback);
  return Math.max(
    1,
    Math.min(max, Number.isFinite(n) ? Math.trunc(n) : fallback),
  );
}

const usuarioBuscablePublicSelect = {
  id: true,
  nombre: true,
  nickname: true,
  foto: true,
  biografia: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly negocioService: NegocioService,
    private readonly productoService: ProductoService,
    private readonly promocionService: PromocionService,
  ) {}

  async buscar(q?: string, limit?: number | string) {
    const term = q?.trim() ?? '';
    const take = toLimit(limit, 10, 30);

    if (!term) {
      return { negocios: [], productos: [], promociones: [], usuarios: [] };
    }

    const [negociosResult, productos, promociones, usuarios] =
      await Promise.all([
        this.negocioService.list({ q: term, limit: take }),
        this.productoService.search(term, take),
        this.promocionService.search(term, take),
        this.buscarUsuarios(term, take),
      ]);

    return {
      negocios: negociosResult.items,
      productos,
      promociones,
      usuarios,
    };
  }

  private async buscarUsuarios(term: string, take: number) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        estadoCuenta: EstadoCuenta.ACTIVA,
        eliminadoEn: null,
        OR: [
          { nombre: { contains: term, mode: 'insensitive' } },
          { nickname: { contains: term, mode: 'insensitive' } },
          { biografia: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: usuarioBuscablePublicSelect,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      take,
    });

    return usuarios.map((usuario) => ({
      id: usuario.id,
      tipo: 'usuario',
      nombre: usuario.nombre,
      nickname: usuario.nickname,
      foto: usuario.foto,
      fotoPerfil: usuario.foto,
      biografia: usuario.biografia,
    }));
  }
}
