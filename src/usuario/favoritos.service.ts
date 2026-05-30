import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const productoFavoritoSelect = {
  id: true,
  usuarioId: true,
  productoId: true,
  creadoEn: true,
  producto: {
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      precio: true,
      foto: true,
      activo: true,
      negocioId: true,
      negocio: {
        select: {
          id: true,
          nombre: true,
          slug: true,
          verificado: true,
        },
      },
    },
  },
} satisfies Prisma.ProductoFavoritoSelect;

export type ProductoFavoritoResponse = Prisma.ProductoFavoritoGetPayload<{
  select: typeof productoFavoritoSelect;
}>;

@Injectable()
export class FavoritosService {
  constructor(private prisma: PrismaService) {}

  async getFavoritos(usuarioId: number) {
    const favoritos = await this.prisma.productoFavorito.findMany({
      where: { usuarioId },
      select: productoFavoritoSelect,
      orderBy: { creadoEn: 'desc' },
    });

    return favoritos;
  }

  async addFavorito(usuarioId: number, productoId: number) {
    // Verificar que el producto existe y está activo
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, activo: true },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!producto.activo) {
      throw new NotFoundException('Producto no disponible');
    }

    try {
      const favorito = await this.prisma.productoFavorito.create({
        data: {
          usuarioId,
          productoId,
        },
        select: productoFavoritoSelect,
      });

      return favorito;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unique constraint violated - el favorito ya existe
        // Retornar el existente en lugar de error
        const existente = await this.prisma.productoFavorito.findUnique({
          where: {
            usuarioId_productoId: { usuarioId, productoId },
          },
          select: productoFavoritoSelect,
        });
        return existente;
      }
      throw error;
    }
  }

  async deleteFavorito(usuarioId: number, productoId: number) {
    await this.prisma.productoFavorito.deleteMany({
      where: { usuarioId, productoId },
    });

    return { ok: true, productoId, favorito: false };
  }

  async isFavorito(usuarioId: number, productoId: number): Promise<boolean> {
    const favorito = await this.prisma.productoFavorito.findUnique({
      where: {
        usuarioId_productoId: { usuarioId, productoId },
      },
      select: { id: true },
    });

    return !!favorito;
  }
}
