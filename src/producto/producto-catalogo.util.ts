import { EstadoSolicitudProducto, Prisma } from '@prisma/client';

export const productoCatalogSelect = {
  id: true,
  negocioId: true,
  nombre: true,
  descripcion: true,
  precio: true,
  foto: true,
  codigoProducto: true,
  codigoSKU: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
  eliminadoEn: true,
} satisfies Prisma.ProductoSelect;

export const solicitudProductoSelect = {
  id: true,
  negocioId: true,
  usuarioId: true,
  resenaId: true,
  productoId: true,
  nombre: true,
  descripcion: true,
  precioSugerido: true,
  estado: true,
  motivoRechazo: true,
  creadoEn: true,
  actualizadoEn: true,
} satisfies Prisma.SolicitudProductoCatalogoSelect;

export type ProductoCatalogRecord = Prisma.ProductoGetPayload<{
  select: typeof productoCatalogSelect;
}>;

export type SolicitudProductoRecord = Prisma.SolicitudProductoCatalogoGetPayload<{
  select: typeof solicitudProductoSelect;
}>;

export function buildCodigoProducto(productId: number) {
  return `PROD-${String(productId).padStart(6, '0')}`;
}

export function normalizeCatalogCode(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

export function mapProductoCatalogo(producto: ProductoCatalogRecord) {
  const codigoProducto =
    producto.codigoProducto ??
    producto.codigoSKU ??
    buildCodigoProducto(producto.id);

  return {
    ...producto,
    codigoProducto,
  };
}

export function mapSolicitudProductoCatalogo(
  solicitud: SolicitudProductoRecord,
) {
  return {
    ...solicitud,
    estado:
      solicitud.estado ?? EstadoSolicitudProducto.PENDIENTE,
  };
}
