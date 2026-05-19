import { Prisma } from '@prisma/client';
import {
  mapNegocioPublic,
  negocioPublicSelect,
} from '../negocio/negocio-public.util';
import {
  mapProductoCatalogo,
  mapSolicitudProductoCatalogo,
  productoCatalogSelect,
  solicitudProductoSelect,
} from '../producto/producto-catalogo.util';

export const resenaPublicSelect = {
  id: true,
  contenido: true,
  puntuacion: true,
  estado: true,
  moderadoEn: true,
  motivoModeracion: true,
  selloNenufar: true,
  usuarioId: true,
  negocioId: true,
  creadoEn: true,
  actualizadoEn: true,
  eliminadoEn: true,
  usuario: { select: { id: true, nombre: true, foto: true } },
  negocio: { select: negocioPublicSelect },
  productos: {
    select: {
      producto: {
        select: productoCatalogSelect,
      },
    },
  },
  productosSugeridos: {
    select: solicitudProductoSelect,
  },
  Post: {
    select: {
      id: true,
      _count: {
        select: {
          likes: true,
          comentarios: true,
        },
      },
    },
    where: {
      eliminadoEn: null,
      estado: 'PUBLICADO',
    },
    take: 1,
  },
} satisfies Prisma.ResenaSelect;

export type ResenaPublicRecord = Prisma.ResenaGetPayload<{
  select: typeof resenaPublicSelect;
}>;

export function mapResenaPublic(resena: ResenaPublicRecord) {
  const post = resena.Post?.[0];

  return {
    ...resena,
    negocio: mapNegocioPublic(resena.negocio),
    productos: resena.productos.map((item) =>
      mapProductoCatalogo(item.producto),
    ),
    productosSugeridos: resena.productosSugeridos.map((item) =>
      mapSolicitudProductoCatalogo(item),
    ),
    postId: post?.id ?? null,
    likesCount: post?._count.likes ?? 0,
    comentariosCount: post?._count.comentarios ?? 0,
    comentario: resena.contenido,
    fecha: resena.creadoEn,
  };
}
