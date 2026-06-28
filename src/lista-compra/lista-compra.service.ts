import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CanalVenta, ListaTipo, PedidoEstado, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import {
  mapProductoCatalogo,
  productoCatalogSelect,
} from '../producto/producto-catalogo.util';
import { AddListaCompraItemDto } from './dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from './dto/update-lista-compra-item.dto';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';
import { ImportarCodigoDto } from './dto/importar-codigo.dto';
import { createFieldError } from '../common/errors/app-error';

const NOMBRE_LISTA_FAVORITOS = 'Favoritos';
const NOMBRE_LISTA_COMPRA_DEFECTO = 'Mi lista de la compra';
const CODIGO_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODIGO_PREFIJO = 'NENU-';
const CODIGO_LONGITUD = 8;

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

const productoListaDetalleSelect = {
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
      categoria: { select: { id: true, nombre: true } },
      subcategoria: { select: { id: true, nombre: true } },
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

const listaCompraItemDetalleSelect = {
  id: true,
  listaCompraId: true,
  productoId: true,
  nombreManual: true,
  cantidad: true,
  completado: true,
  nota: true,
  creadoEn: true,
  producto: { select: productoListaDetalleSelect },
} satisfies Prisma.ListaCompraItemSelect;

const listaCompraSelect = {
  id: true,
  usuarioId: true,
  nombre: true,
  tipo: true,
  descripcion: true,
  color: true,
  iconoNenufar: true,
  creadaEn: true,
  actualizadaEn: true,
  items: {
    select: listaCompraItemSelect,
    orderBy: [{ completado: 'asc' }, { creadoEn: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ListaCompraSelect;

const listaCompraResumenSelect = {
  id: true,
  nombre: true,
  tipo: true,
  descripcion: true,
  color: true,
  iconoNenufar: true,
  creadaEn: true,
  actualizadaEn: true,
  _count: { select: { items: true } },
  items: {
    select: listaCompraItemSelect,
    orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    take: 4,
  },
} satisfies Prisma.ListaCompraSelect;

const listaCompraDetalleSelect = {
  id: true,
  usuarioId: true,
  nombre: true,
  tipo: true,
  descripcion: true,
  color: true,
  iconoNenufar: true,
  creadaEn: true,
  actualizadaEn: true,
  items: {
    select: listaCompraItemDetalleSelect,
    orderBy: [{ completado: 'asc' }, { creadoEn: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ListaCompraSelect;

const listaCompraCierreSelect = {
  id: true,
  nombre: true,
  items: {
    select: {
      id: true,
      productoId: true,
      nombreManual: true,
      cantidad: true,
      nota: true,
      producto: {
        select: {
          id: true,
          nombre: true,
          foto: true,
          precio: true,
          activo: true,
          eliminadoEn: true,
          negocioId: true,
          negocio: {
            select: {
              id: true,
              nombre: true,
              duenoId: true,
              categoriaId: true,
              activo: true,
              eliminadoEn: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ListaCompraSelect;

type ProductoListaRecord =
  | Prisma.ProductoGetPayload<{ select: typeof productoListaCompraSelect }>
  | Prisma.ProductoGetPayload<{ select: typeof productoListaDetalleSelect }>;

type ListaCompraItemRecord = Prisma.ListaCompraItemGetPayload<{
  select: typeof listaCompraItemSelect;
}>;

type ListaCompraItemDetalleRecord = Prisma.ListaCompraItemGetPayload<{
  select: typeof listaCompraItemDetalleSelect;
}>;

type ListaCompraRecord = Prisma.ListaCompraGetPayload<{
  select: typeof listaCompraSelect;
}>;

type ListaCompraResumenRecord = Prisma.ListaCompraGetPayload<{
  select: typeof listaCompraResumenSelect;
}>;

type ListaCompraDetalleRecord = Prisma.ListaCompraGetPayload<{
  select: typeof listaCompraDetalleSelect;
}>;

type ListaCompraCierreRecord = Prisma.ListaCompraGetPayload<{
  select: typeof listaCompraCierreSelect;
}>;

type SnapshotItem = {
  productoId: number | null;
  nombreManual: string | null;
  cantidad: number;
  nota: string | null;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    precio: number | null;
    foto: string | null;
    negocio: { id: number; nombre: string; slug: string | null };
  } | null;
};

type ListaSnapshot = {
  nombre: string;
  descripcion: string | null;
  color: string | null;
  iconoNenufar: string | null;
  generadoEn: string;
  items: SnapshotItem[];
};

function normalizeOptionalString(value?: string | null) {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized || null;
}

function invalidQuantityError(message = 'La cantidad mínima es 1') {
  return createFieldError('INVALID_QUANTITY', message, 'cantidad', message);
}

function listNameRequiredError(
  message = 'El nombre de la lista es obligatorio',
) {
  return createFieldError('LIST_NAME_REQUIRED', message, 'nombre', message);
}

function listNameAlreadyExistsError(
  message = 'Ya tienes una lista con ese nombre.',
) {
  return createFieldError(
    'LIST_NAME_ALREADY_EXISTS',
    message,
    'nombre',
    message,
    409,
  );
}

function productAlreadyInListError() {
  return createFieldError(
    'PRODUCT_ALREADY_IN_LIST',
    'Este producto ya está en la lista.',
    'productoId',
    'Este producto ya está en la lista.',
    409,
  );
}

function invalidListCodeError() {
  return createFieldError(
    'INVALID_LIST_CODE',
    'El código de lista no es válido.',
    'codigo',
    'El código de lista no es válido.',
  );
}

@Injectable()
export class ListaCompraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionService,
  ) {}

  private normalizeCantidad(value?: number) {
    const cantidad = value ?? 1;
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw invalidQuantityError();
    }
    return cantidad;
  }

  private mapProducto(producto: ProductoListaRecord | null) {
    if (!producto) {
      return null;
    }

    const { negocio, ...productoCatalogo } = producto;
    return {
      ...mapProductoCatalogo(productoCatalogo),
      negocio,
    };
  }

  private mapItem(item: ListaCompraItemRecord | ListaCompraItemDetalleRecord) {
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

  private mapListaResumen(lista: ListaCompraResumenRecord) {
    const { _count, items, ...resto } = lista;
    return {
      ...resto,
      itemsCount: _count.items,
      productosPreview: items.map((item) => this.mapItem(item)),
    };
  }

  private mapListaDetalle(lista: ListaCompraDetalleRecord) {
    return {
      ...lista,
      items: lista.items.map((item) => this.mapItem(item)),
    };
  }

  private async getOrCreateListaPorTipo<S extends Prisma.ListaCompraSelect>(
    usuarioId: number,
    tipo: ListaTipo,
    nombreDefecto: string,
    select: S,
  ): Promise<Prisma.ListaCompraGetPayload<{ select: S }>> {
    const existente = await this.prisma.listaCompra.findFirst({
      where: { usuarioId, tipo, eliminadaEn: null },
      select,
      orderBy: { creadaEn: 'asc' },
    });

    if (existente) {
      return existente;
    }

    try {
      return await this.prisma.listaCompra.create({
        data: { usuarioId, nombre: nombreDefecto, tipo },
        select,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const conflicto = await this.prisma.listaCompra.findFirst({
          where: { usuarioId, nombre: nombreDefecto },
          select: { id: true, eliminadaEn: true },
        });

        if (conflicto?.eliminadaEn) {
          return this.prisma.listaCompra.update({
            where: { id: conflicto.id },
            data: { eliminadaEn: null, tipo },
            select,
          });
        }

        if (conflicto) {
          return this.prisma.listaCompra.findUniqueOrThrow({
            where: { id: conflicto.id },
            select,
          });
        }
      }
      throw error;
    }
  }

  private getOrCreateListaPorDefecto(usuarioId: number) {
    return this.getOrCreateListaPorTipo(
      usuarioId,
      ListaTipo.COMPRA,
      NOMBRE_LISTA_COMPRA_DEFECTO,
      listaCompraSelect,
    );
  }

  private getOrCreateListaFavoritos(usuarioId: number) {
    return this.getOrCreateListaPorTipo(
      usuarioId,
      ListaTipo.FAVORITOS,
      NOMBRE_LISTA_FAVORITOS,
      { id: true } satisfies Prisma.ListaCompraSelect,
    );
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

  private async assertListaPerteneceAUsuario(
    listaId: number,
    usuarioId: number,
  ) {
    const lista = await this.prisma.listaCompra.findFirst({
      where: { id: listaId, usuarioId, eliminadaEn: null },
      select: { id: true },
    });

    if (!lista) {
      throw new NotFoundException('Lista no encontrada');
    }

    return lista;
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

  private async assertItemPerteneceALista(
    itemId: number,
    listaId: number,
    usuarioId: number,
  ) {
    const item = await this.prisma.listaCompraItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        listaCompraId: true,
        listaCompra: { select: { usuarioId: true } },
      },
    });

    if (!item || item.listaCompraId !== listaId) {
      throw new NotFoundException('Item de lista no encontrado');
    }

    if (item.listaCompra.usuarioId !== usuarioId) {
      throw new ForbiddenException('No puedes modificar este item');
    }

    return item;
  }

  private async upsertItemEnLista(listaId: number, dto: AddListaCompraItemDto) {
    const cantidad = this.normalizeCantidad(dto.cantidad);
    const nota = normalizeOptionalString(dto.nota);

    if (dto.productoId !== undefined && dto.productoId !== null) {
      await this.assertProductoDisponible(dto.productoId);

      const existing = await this.prisma.listaCompraItem.findFirst({
        where: {
          listaCompraId: listaId,
          productoId: dto.productoId,
        },
        select: { id: true },
      });

      if (existing) {
        throw productAlreadyInListError();
      }

      let item: ListaCompraItemRecord;
      try {
        item = await this.prisma.listaCompraItem.create({
          data: {
            listaCompraId: listaId,
            productoId: dto.productoId,
            cantidad,
            nota: nota ?? null,
          },
          select: listaCompraItemSelect,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw productAlreadyInListError();
        }
        throw error;
      }

      return this.mapItem(item);
    }

    const nombreManual = dto.nombreManual?.trim();
    if (!nombreManual) {
      throw createFieldError(
        'REQUIRED_FIELD',
        'nombreManual es obligatorio si no se indica productoId',
        'nombreManual',
        'nombreManual es obligatorio si no se indica productoId',
      );
    }

    const item = await this.prisma.listaCompraItem.create({
      data: {
        listaCompraId: listaId,
        nombreManual,
        cantidad,
        nota: nota ?? null,
      },
      select: listaCompraItemSelect,
    });

    return this.mapItem(item);
  }

  private async actualizarItem(itemId: number, dto: UpdateListaCompraItemDto) {
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

  // ===== API legacy (lista de la compra por defecto, una por usuario) =====

  async getLista(usuarioId: number) {
    const lista = await this.getOrCreateListaPorDefecto(usuarioId);
    return this.mapLista(lista);
  }

  async addItem(usuarioId: number, dto: AddListaCompraItemDto) {
    const lista = await this.getOrCreateListaPorDefecto(usuarioId);
    return this.upsertItemEnLista(lista.id, dto);
  }

  async updateItem(
    usuarioId: number,
    itemId: number,
    dto: UpdateListaCompraItemDto,
  ) {
    await this.assertItemPerteneceAUsuario(itemId, usuarioId);
    return this.actualizarItem(itemId, dto);
  }

  async removeItem(usuarioId: number, itemId: number) {
    await this.assertItemPerteneceAUsuario(itemId, usuarioId);
    await this.prisma.listaCompraItem.delete({ where: { id: itemId } });

    return { ok: true, itemId };
  }

  async removeCompleted(usuarioId: number) {
    const lista = await this.getOrCreateListaPorDefecto(usuarioId);
    const result = await this.prisma.listaCompraItem.deleteMany({
      where: { completado: true, listaCompraId: lista.id },
    });

    return { ok: true, deletedCount: result.count };
  }

  // ===== Mi Nenulista (varias listas por usuario) =====

  async listListas(usuarioId: number) {
    const listas = await this.prisma.listaCompra.findMany({
      where: { usuarioId, eliminadaEn: null },
      select: listaCompraResumenSelect,
      orderBy: [{ tipo: 'asc' }, { creadaEn: 'asc' }],
    });

    return listas.map((lista) => this.mapListaResumen(lista));
  }

  async getListaById(usuarioId: number, listaId: number) {
    const lista = await this.prisma.listaCompra.findFirst({
      where: { id: listaId, usuarioId, eliminadaEn: null },
      select: listaCompraDetalleSelect,
    });

    if (!lista) {
      throw new NotFoundException('Lista no encontrada');
    }

    return this.mapListaDetalle(lista);
  }

  async crearLista(usuarioId: number, dto: CreateListaDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) {
      throw listNameRequiredError();
    }

    try {
      const lista = await this.prisma.listaCompra.create({
        data: {
          usuarioId,
          nombre,
          tipo: dto.tipo ?? ListaTipo.PERSONALIZADA,
          descripcion: normalizeOptionalString(dto.descripcion) ?? null,
          color: normalizeOptionalString(dto.color) ?? null,
          iconoNenufar: normalizeOptionalString(dto.iconoNenufar) ?? null,
        },
        select: listaCompraDetalleSelect,
      });

      return this.mapListaDetalle(lista);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw listNameAlreadyExistsError();
      }
      throw error;
    }
  }

  async actualizarLista(
    usuarioId: number,
    listaId: number,
    dto: UpdateListaDto,
  ) {
    await this.assertListaPerteneceAUsuario(listaId, usuarioId);

    const data: Prisma.ListaCompraUpdateInput = {};

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) {
        throw listNameRequiredError(
          'El nombre de la lista no puede estar vacío',
        );
      }
      data.nombre = nombre;
    }

    if (dto.descripcion !== undefined) {
      data.descripcion = normalizeOptionalString(dto.descripcion);
    }

    if (dto.color !== undefined) {
      data.color = normalizeOptionalString(dto.color);
    }

    if (dto.iconoNenufar !== undefined) {
      data.iconoNenufar = normalizeOptionalString(dto.iconoNenufar);
    }

    if (dto.tipo !== undefined) {
      data.tipo = dto.tipo;
    }

    try {
      const lista = await this.prisma.listaCompra.update({
        where: { id: listaId },
        data,
        select: listaCompraDetalleSelect,
      });

      return this.mapListaDetalle(lista);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw listNameAlreadyExistsError();
      }
      throw error;
    }
  }

  async eliminarLista(usuarioId: number, listaId: number) {
    await this.assertListaPerteneceAUsuario(listaId, usuarioId);

    // Soft delete: no se borran los pedidos históricos generados desde esta lista.
    await this.prisma.listaCompra.update({
      where: { id: listaId },
      data: { eliminadaEn: new Date() },
    });

    return { ok: true, listaId };
  }

  async addItemALista(
    usuarioId: number,
    listaId: number,
    dto: AddListaCompraItemDto,
  ) {
    await this.assertListaPerteneceAUsuario(listaId, usuarioId);
    return this.upsertItemEnLista(listaId, dto);
  }

  async updateItemDeLista(
    usuarioId: number,
    listaId: number,
    itemId: number,
    dto: UpdateListaCompraItemDto,
  ) {
    await this.assertItemPerteneceALista(itemId, listaId, usuarioId);
    return this.actualizarItem(itemId, dto);
  }

  async removeItemDeLista(usuarioId: number, listaId: number, itemId: number) {
    await this.assertItemPerteneceALista(itemId, listaId, usuarioId);
    await this.prisma.listaCompraItem.delete({ where: { id: itemId } });

    return { ok: true, itemId };
  }

  // ===== Cerrar lista -> generar pedidos pendientes por negocio =====

  async cerrarLista(usuarioId: number, listaId: number) {
    const lista = await this.prisma.listaCompra.findFirst({
      where: { id: listaId, usuarioId, eliminadaEn: null },
      select: listaCompraCierreSelect,
    });

    if (!lista) {
      throw new NotFoundException('Lista no encontrada');
    }

    type ItemLista = ListaCompraCierreRecord['items'][number];
    type ItemValido = ItemLista & {
      producto: NonNullable<ItemLista['producto']>;
    };

    const itemsValidos: ItemValido[] = [];
    const avisos: string[] = [];

    for (const item of lista.items) {
      const producto = item.producto;

      if (!item.productoId || !producto) {
        avisos.push(
          `"${item.nombreManual ?? 'Item manual'}" se ignoró: no corresponde a un producto del catálogo`,
        );
        continue;
      }

      if (
        !producto.activo ||
        producto.eliminadoEn ||
        !producto.negocio.activo ||
        producto.negocio.eliminadoEn
      ) {
        avisos.push(`"${producto.nombre}" se ignoró: ya no está disponible`);
        continue;
      }

      if (producto.precio === null) {
        avisos.push(
          `"${producto.nombre}" se ignoró: no tiene precio disponible`,
        );
        continue;
      }

      itemsValidos.push(item as ItemValido);
    }

    if (itemsValidos.length === 0) {
      throw new BadRequestException(
        'La lista no tiene productos disponibles para generar un pedido',
      );
    }

    const porNegocio = new Map<number, ItemValido[]>();
    for (const item of itemsValidos) {
      const negocioId = item.producto.negocioId;
      const grupo = porNegocio.get(negocioId);
      if (grupo) {
        grupo.push(item);
      } else {
        porNegocio.set(negocioId, [item]);
      }
    }

    const pedidosCreados = await this.prisma.$transaction(async (tx) => {
      const resultado: Array<{
        pedidoId: number;
        negocioId: number;
        negocioNombre: string;
        total: number;
        items: number;
      }> = [];

      for (const [negocioId, items] of porNegocio) {
        const negocioNombre = items[0].producto.negocio.nombre;
        const cerradoEn = new Date();

        let total = new Prisma.Decimal(0);
        const pedidoProductosData = items.map((item) => {
          const precioUnitario = new Prisma.Decimal(item.producto.precio!);
          const subtotal = precioUnitario.mul(item.cantidad);
          total = total.plus(subtotal);

          return {
            productoId: item.producto.id,
            cantidad: item.cantidad,
            precioUnitario,
            subtotal,
            categoriaIdSnapshot: item.producto.negocio.categoriaId,
          };
        });

        const snapshotPedido = {
          listaCompraId: lista.id,
          listaNombre: lista.nombre,
          cerradoEn: cerradoEn.toISOString(),
          negocioId,
          items: items.map((item) => ({
            productoId: item.producto.id,
            nombre: item.producto.nombre,
            foto: item.producto.foto,
            cantidad: item.cantidad,
            precioUnitario: Number(item.producto.precio),
            subtotal: Number(item.producto.precio) * item.cantidad,
          })),
        } satisfies Prisma.InputJsonValue;

        const pedido = await tx.pedido.create({
          data: {
            negocioId,
            usuarioId,
            estado: PedidoEstado.PENDIENTE,
            canalVenta: CanalVenta.WEB,
            totalSnapshot: total,
            listaCompraId: lista.id,
            listaCompraSnapshot: snapshotPedido,
            pedidoProductos: { create: pedidoProductosData },
          },
          select: { id: true },
        });

        resultado.push({
          pedidoId: pedido.id,
          negocioId,
          negocioNombre,
          total: Number(total),
          items: items.length,
        });
      }

      return resultado;
    });

    await this.notificarNegociosPedidoCreado(pedidosCreados);

    return { ok: true, pedidosCreados, avisos };
  }

  private async notificarNegociosPedidoCreado(
    pedidos: Array<{
      pedidoId: number;
      negocioId: number;
      negocioNombre: string;
      total: number;
    }>,
  ) {
    for (const pedido of pedidos) {
      try {
        const negocio = await this.prisma.negocio.findUnique({
          where: { id: pedido.negocioId },
          select: {
            duenoId: true,
            miembros: { select: { usuarioId: true } },
          },
        });

        if (!negocio) continue;

        const destinatarios = new Set<number>([
          negocio.duenoId,
          ...negocio.miembros.map((miembro) => miembro.usuarioId),
        ]);

        await Promise.all(
          Array.from(destinatarios).map((usuarioId) =>
            this.notificaciones
              .fanoutUsuario({
                usuarioId,
                tipo: 'SISTEMA',
                negocioId: pedido.negocioId,
                titulo: `Nuevo pedido pendiente en ${pedido.negocioNombre}`,
                contenido: `Se ha generado un pedido de ${pedido.total.toFixed(2)} € desde Mi Nenulista.`,
              })
              .catch(() => undefined),
          ),
        );
      } catch {
        // Best effort: una notificación fallida no debe romper el cierre de la lista.
      }
    }
  }

  // ===== Compartir/importar por código (snapshot fijo, no link vivo) =====

  private generarCodigo() {
    const bytes = randomBytes(CODIGO_LONGITUD);
    let sufijo = '';
    for (let i = 0; i < CODIGO_LONGITUD; i++) {
      sufijo += CODIGO_ALFABETO[bytes[i] % CODIGO_ALFABETO.length];
    }
    return `${CODIGO_PREFIJO}${sufijo}`;
  }

  private buildSnapshot(
    lista: ReturnType<typeof this.mapListaDetalle>,
  ): ListaSnapshot {
    return {
      nombre: lista.nombre,
      descripcion: lista.descripcion,
      color: lista.color,
      iconoNenufar: lista.iconoNenufar,
      generadoEn: new Date().toISOString(),
      items: lista.items.map((item) => ({
        productoId: item.productoId,
        nombreManual: item.nombreManual,
        cantidad: item.cantidad,
        nota: item.nota,
        producto: item.producto
          ? {
              id: item.producto.id,
              nombre: item.producto.nombre,
              descripcion: item.producto.descripcion,
              precio:
                item.producto.precio !== null
                  ? Number(item.producto.precio)
                  : null,
              foto: item.producto.foto,
              negocio: {
                id: item.producto.negocio.id,
                nombre: item.producto.negocio.nombre,
                slug: item.producto.negocio.slug,
              },
            }
          : null,
      })),
    };
  }

  async generarCodigoCompartir(usuarioId: number, listaId: number) {
    const lista = await this.prisma.listaCompra.findFirst({
      where: { id: listaId, usuarioId, eliminadaEn: null },
      select: listaCompraDetalleSelect,
    });

    if (!lista) {
      throw new NotFoundException('Lista no encontrada');
    }

    const snapshot = this.buildSnapshot(this.mapListaDetalle(lista));

    for (let intento = 0; intento < 5; intento++) {
      const codigo = this.generarCodigo();
      try {
        await this.prisma.listaCompraCodigo.create({
          data: {
            codigo,
            listaCompraId: lista.id,
            usuarioOrigenId: usuarioId,
            nombreSnapshot: lista.nombre,
            snapshot,
          },
        });

        return {
          codigo,
          mensaje: 'Comparte este código para que otra persona copie tu lista.',
        };
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

    throw new ConflictException(
      'No se pudo generar un código único, inténtalo de nuevo',
    );
  }

  async previewCodigo(codigo: string) {
    const registro = await this.prisma.listaCompraCodigo.findFirst({
      where: { codigo: codigo.trim(), activo: true },
      select: {
        codigo: true,
        nombreSnapshot: true,
        snapshot: true,
        creadoEn: true,
      },
    });

    if (!registro) {
      throw invalidListCodeError();
    }

    const snapshot = registro.snapshot as unknown as ListaSnapshot;

    return {
      codigo: registro.codigo,
      nombre: registro.nombreSnapshot,
      descripcion: snapshot?.descripcion ?? null,
      color: snapshot?.color ?? null,
      iconoNenufar: snapshot?.iconoNenufar ?? null,
      itemsCount: snapshot?.items?.length ?? 0,
      items: snapshot?.items ?? [],
      generadoEn: snapshot?.generadoEn ?? registro.creadoEn,
    };
  }

  async importarCodigo(usuarioId: number, dto: ImportarCodigoDto) {
    const registro = await this.prisma.listaCompraCodigo.findFirst({
      where: { codigo: dto.codigo.trim(), activo: true },
    });

    if (!registro) {
      throw invalidListCodeError();
    }

    const snapshot = registro.snapshot as unknown as ListaSnapshot;
    const nombre =
      normalizeOptionalString(dto.nombre) ||
      registro.nombreSnapshot ||
      'Lista importada';

    const productosNoDisponibles: string[] = [];

    try {
      const lista = await this.prisma.$transaction(async (tx) => {
        const nuevaLista = await tx.listaCompra.create({
          data: {
            usuarioId,
            nombre,
            tipo: ListaTipo.PERSONALIZADA,
            descripcion: snapshot.descripcion ?? null,
            color: snapshot.color ?? null,
            iconoNenufar: snapshot.iconoNenufar ?? null,
          },
        });

        for (const item of snapshot.items ?? []) {
          let productoId: number | null = null;

          if (item.productoId) {
            const producto = await tx.producto.findFirst({
              where: { id: item.productoId, activo: true, eliminadoEn: null },
              select: { id: true },
            });
            productoId = producto?.id ?? null;
          }

          if (productoId) {
            await tx.listaCompraItem.create({
              data: {
                listaCompraId: nuevaLista.id,
                productoId,
                cantidad: item.cantidad,
                nota: item.nota,
              },
            });
          } else {
            const nombreManual =
              item.producto?.nombre ??
              item.nombreManual ??
              'Producto no disponible';
            productosNoDisponibles.push(nombreManual);

            await tx.listaCompraItem.create({
              data: {
                listaCompraId: nuevaLista.id,
                nombreManual,
                cantidad: item.cantidad,
                nota: item.nota,
              },
            });
          }
        }

        await tx.listaCompraCodigo.update({
          where: { id: registro.id },
          data: { usadoVeces: { increment: 1 } },
        });

        return tx.listaCompra.findUniqueOrThrow({
          where: { id: nuevaLista.id },
          select: listaCompraDetalleSelect,
        });
      });

      return {
        lista: this.mapListaDetalle(lista),
        productosNoDisponibles,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw listNameAlreadyExistsError(
          'Ya tienes una lista con ese nombre; elige otro para importar',
        );
      }
      throw error;
    }
  }

  // ===== Sincronización con ProductoFavorito =====

  async sincronizarFavorito(
    usuarioId: number,
    productoId: number,
    esFavorito: boolean,
  ) {
    if (esFavorito) {
      const lista = await this.getOrCreateListaFavoritos(usuarioId);
      await this.prisma.listaCompraItem.upsert({
        where: {
          listaCompraId_productoId: {
            listaCompraId: lista.id,
            productoId,
          },
        },
        update: {},
        create: { listaCompraId: lista.id, productoId, cantidad: 1 },
      });
      return;
    }

    const lista = await this.prisma.listaCompra.findFirst({
      where: { usuarioId, tipo: ListaTipo.FAVORITOS, eliminadaEn: null },
      select: { id: true },
    });

    if (!lista) {
      return;
    }

    await this.prisma.listaCompraItem.deleteMany({
      where: { listaCompraId: lista.id, productoId },
    });
  }
}
