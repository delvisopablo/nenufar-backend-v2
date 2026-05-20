export const ACCIONES_LOGRO = [
  'RESENA_PUBLICADA',
  'COMPRA_REALIZADA',
  'RESERVA_HECHA',
  'PROMOCION_CANJEADA',
  'VISITA_NEGOCIO',
  'NEGOCIO_SEGUIDO',
  'VISITA_TODAS_CATEGORIAS',
  'VISITA_TODAS_SUBCATEGORIAS',
  'RESENAS_DIFERENTES_PUNTUACIONES',
  'RESENAS_5_ESTRELLAS',
  'PERFIL_COMPLETADO',
  'HORARIO_NEGOCIO_CONFIGURADO',
  'HITO_NEGOCIO',
  'TODOS_LOGROS_COMPLETADOS',
] as const;

export type AccionLogro = (typeof ACCIONES_LOGRO)[number];

export const ACCION_LOGRO_LABELS: Record<AccionLogro, string> = {
  RESENA_PUBLICADA: 'reseñas publicadas',
  COMPRA_REALIZADA: 'compras realizadas',
  RESERVA_HECHA: 'reservas hechas',
  PROMOCION_CANJEADA: 'promociones canjeadas',
  VISITA_NEGOCIO: 'visitas a negocios',
  NEGOCIO_SEGUIDO: 'negocios seguidos',
  VISITA_TODAS_CATEGORIAS: 'categorías visitadas',
  VISITA_TODAS_SUBCATEGORIAS: 'subcategorías visitadas',
  RESENAS_DIFERENTES_PUNTUACIONES: 'puntuaciones distintas en reseñas',
  RESENAS_5_ESTRELLAS: 'reseñas de 5 estrellas',
  PERFIL_COMPLETADO: 'perfil completado',
  HORARIO_NEGOCIO_CONFIGURADO: 'horarios de negocio configurados',
  HITO_NEGOCIO: 'hitos de negocio',
  TODOS_LOGROS_COMPLETADOS: 'logros completados',
};

export function isAccionLogro(value: string): value is AccionLogro {
  return ACCIONES_LOGRO.includes(value as AccionLogro);
}
