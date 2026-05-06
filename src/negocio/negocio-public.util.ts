import { Prisma } from '@prisma/client';

export const negocioPublicSelect = {
  id: true,
  nombre: true,
  slug: true,
  fotoPerfil: true,
  fotoPortada: true,
  nenufarColor: true,
  nenufarKey: true,
  nenufarAsset: true,
  categoria: {
    select: {
      id: true,
      nombre: true,
    },
  },
} satisfies Prisma.NegocioSelect;

export type NegocioPublic = Prisma.NegocioGetPayload<{
  select: typeof negocioPublicSelect;
}>;

export function mapNegocioPublic(
  negocio: NegocioPublic | null | undefined,
) {
  if (!negocio) {
    return negocio;
  }

  return {
    ...negocio,
    // `slug` es el handle público disponible hoy para negocio.
    nickname: negocio.slug ?? null,
    // `nenufarAsset` es el campo persistido; mantenemos alias para clientes.
    nenufarActivo: negocio.nenufarAsset ?? negocio.fotoPerfil ?? null,
  };
}
