import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mapProductoCatalogo,
  productoCatalogSelect,
} from '../producto/producto-catalogo.util';
import { AddListaCompraItemDto } from './dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from './dto/update-lista-compra-item.dto';

const productoListaCompraSelect = {
  ...productoCatalogSelect,
  negocio: {
    select: {
      id: true,
      nombre: true,
      slug: true,
      fotoPerfil: true,
      fotoPortada: true,
      nenufarActivo: true,
      nenufarAsset: true,
      activo: true,
    },
  },
} satisfies Prisma.ProductoSelect;

const listaCompraItemSelect = {
  id: true,
  listaCompraId: true,
  productoId: true,
  nombreManual: true,
  cantidad: true,
  completado: true,
  nota: true,
  creadoEn: true,
  producto: { select: productoListaCompraSelect },
} satisfies Prisma.ListaCompraItemSelect;

const listaCompraSelect = {
  id: true,
  usuarioId: true,
  nombre: true,
  creadaEn: true,
  actualizadaEn: true,
  items: {
    select: listaCompraItemSelect,
    orderBy: [{ completado: 'asc' }, { creadoEn: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ListaCompraSelect;

type ProductoListaCompraRecord = Prisma.ProductoGetPayload<{
  select: typeof productoListaCompraSelect;
}>;

type ListaCompraItemRecord = Prisma.ListaCompraItemGetPayload<{
  select: typeof listaCompraItemSelect;
}>;

type ListaCompraRecord = Prisma.ListaCompraGetPayload<{
  select: typeof listaCompraSelect;
}>;

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

@Injectable()
export class ListaCompraService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCantidad(value?: number) {
    const cantidad = value ?? 1;
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('La cantidad mínima es 1');
    }
    return cantidad;
  }

  private mapProducto(producto: ProductoListaCompraRecord | null) {
    if (!producto) {
      return null;
    }

    const { negocio, ...productoCatalogo } = producto;
    return {
      ...mapProductoCatalogo(productoCatalogo),
      negocio,
    };
  }

  private mapItem(item: ListaCompraItemRecord) {
    return {
      ...item,
      producto: this.mapProducto(item.producto),
    };
  }

  private mapLista(lista: ListaCompraRecord) {
    return {
      ...lista,
      items: lista.items.map((item) => this.mapItem(item)),
    };
  }

  private async getOrCreateLista(usuarioId: number) {
    return this.prisma.listaCompra.upsert({
      where: { usuarioId },
      update: {},
      create: { usuarioId },
      select: listaCompraSelect,
    });
  }

  private async assertProductoDisponible(productoId: number) {
    const producto = await this.prisma.producto.findFirst({
      where: {
        id: productoId,
        activo: true,
        eliminadoEn: null,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: { id: true },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
  }

  private async assertItemPerteneceAUsuario(itemId: number, usuarioId: number) {
    const item = await this.prisma.listaCompraItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        listaCompra: {
          select: { usuarioId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item de lista no encontrado');
    }

    if (item.listaCompra.usuarioId !== usuarioId) {
      throw new ForbiddenException('No puedes modificar este item');
    }

    return item;
  }

  async getLista(usuarioId: number) {
    const lista = await this.getOrCreateLista(usuarioId);
    return this.mapLista(lista);
  }

  async addItem(usuarioId: number, dto: AddListaCompraItemDto) {
    const cantidad = this.normalizeCantidad(dto.cantidad);
    const nota = normalizeOptionalString(dto.nota);
    const lista = await this.getOrCreateLista(usuarioId);

    if (dto.productoId !== undefined && dto.productoId !== null) {
      await this.assertProductoDisponible(dto.productoId);

      const item = await this.prisma.listaCompraItem.upsert({
        where: {
          listaCompraId_productoId: {
            listaCompraId: lista.id,
            productoId: dto.productoId,
          },
        },
        update: {
          cantidad: { increment: cantidad },
          ...(nota !== undefined ? { nota } : {}),
        },
        create: {
          listaCompraId: lista.id,
          productoId: dto.productoId,
          cantidad,
          nota: nota ?? null,
        },
        select: listaCompraItemSelect,
      });

      return this.mapItem(item);
    }

    const nombreManual = dto.nombreManual?.trim();
    if (!nombreManual) {
      throw new BadRequestException(
        'nombreManual es obligatorio si no se indica productoId',
      );
    }

    const item = await this.prisma.listaCompraItem.create({
      data: {
        listaCompraId: lista.id,
        nombreManual,
        cantidad,
        nota: nota ?? null,
      },
      select: listaCompraItemSelect,
    });

    return this.mapItem(item);
  }

  async updateItem(
    usuarioId: number,
    itemId: number,
    dto: UpdateListaCompraItemDto,
  ) {
    await this.assertItemPerteneceAUsuario(itemId, usuarioId);

    const data: Prisma.ListaCompraItemUpdateInput = {};

    if (dto.cantidad !== undefined) {
      data.cantidad = this.normalizeCantidad(dto.cantidad);
    }

    if (dto.completado !== undefined) {
      data.completado = dto.completado;
    }

    if (dto.nota !== undefined) {
      data.nota = normalizeOptionalString(dto.nota);
    }

    const item = await this.prisma.listaCompraItem.update({
      where: { id: itemId },
      data,
      select: listaCompraItemSelect,
    });

    return this.mapItem(item);
  }

  async removeItem(usuarioId: number, itemId: number) {
    await this.assertItemPerteneceAUsuario(itemId, usuarioId);
    await this.prisma.listaCompraItem.delete({ where: { id: itemId } });

    return { ok: true, itemId };
  }

  async removeCompleted(usuarioId: number) {
    const result = await this.prisma.listaCompraItem.deleteMany({
      where: {
        completado: true,
        listaCompra: { usuarioId },
      },
    });

    return { ok: true, deletedCount: result.count };
  }
}
