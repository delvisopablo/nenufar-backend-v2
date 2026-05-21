import { Prisma } from '@prisma/client';
import { normalizeHorarioForRead } from './horario.util';

export const negocioPublicSelect = {
  id: true,
  nombre: true,
  slug: true,
  duenoId: true,
  descripcionCorta: true,
  historia: true,
  direccion: true,
  fotoPerfil: true,
  fotoPortada: true,
  nenufarColor: true,
  nenufarActivo: true,
  nenufarKey: true,
  nenufarAsset: true,
  horario: true,
  intervaloReserva: true,
  reservasActivas: true,
  categoria: {
    select: {
      id: true,
      nombre: true,
    },
  },
  subcategoria: {
    select: {
      id: true,
      nombre: true,
    },
  },
} satisfies Prisma.NegocioSelect;

export type NegocioPublic = Prisma.NegocioGetPayload<{
  select: typeof negocioPublicSelect;
}>;

export function mapNegocioPublic(negocio: NegocioPublic | null | undefined) {
  if (!negocio) {
    return negocio;
  }

  return {
    ...negocio,
    // `slug` es el handle público disponible hoy para negocio.
    nickname: negocio.slug ?? null,
    horario: normalizeHorarioForRead(negocio.horario),
    nenufarActivo:
      negocio.nenufarActivo ??
      negocio.nenufarAsset ??
      negocio.fotoPerfil ??
      null,
  };
}
