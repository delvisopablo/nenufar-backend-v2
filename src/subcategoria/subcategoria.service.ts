import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubcategoriaDto } from './dto/create-subcategoria.dto';
import { QuerySubcategoriaDto } from './dto/query-subcategoria.dto';
import { UpdateSubcategoriaDto } from './dto/update-subcategoria.dto';

function toPaging(page?: number | string, limit?: number | string) {
  const p = Math.max(1, Number(page ?? 1) | 0);
  const l = Math.max(1, Math.min(100, Number(limit ?? 20) | 0));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class SubcategoriaService {
  constructor(private prisma: PrismaService) {}

  async list(query: QuerySubcategoriaDto) {
    const { skip, take, page, limit } = toPaging(query.page, query.limit);
    const where: Prisma.SubcategoriaWhereInput = {
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(query.q
        ? { nombre: { contains: query.q, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subcategoria.findMany({
        where,
        include: {
          categoria: {
            select: { id: true, nombre: true },
          },
        },
        orderBy: [{ categoriaId: 'asc' }, { nombre: 'asc' }],
        skip,
        take,
      }),
      this.prisma.subcategoria.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: number) {
    const subcategoria = await this.prisma.subcategoria.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
      },
    });

    if (!subcategoria) {
      throw new NotFoundException('Subcategoría no encontrada');
    }

    return subcategoria;
  }

  async create(dto: CreateSubcategoriaDto) {
    try {
      return await this.prisma.subcategoria.create({
        data: {
          nombre: dto.nombre.trim(),
          categoriaId: dto.categoriaId,
          activo: dto.activo ?? true,
        },
        include: {
          categoria: { select: { id: true, nombre: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una subcategoría con ese nombre en la categoría',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('La categoría indicada no existe');
      }

      throw error;
    }
  }

  async update(id: number, dto: UpdateSubcategoriaDto) {
    try {
      return await this.prisma.subcategoria.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.categoriaId !== undefined
            ? { categoriaId: dto.categoriaId }
            : {}),
          ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
        },
        include: {
          categoria: { select: { id: true, nombre: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una subcategoría con ese nombre en la categoría',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('La categoría indicada no existe');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subcategoría no encontrada');
      }

      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.subcategoria.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'No se puede eliminar: tiene negocios o logros vinculados',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subcategoría no encontrada');
      }

      throw error;
    }
  }
}
