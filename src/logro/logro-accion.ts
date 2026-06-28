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
  'NEGOCIO_RECIBIR_RESENAS',
  'NEGOCIO_CREAR_PROMOCIONES',
  'NEGOCIO_RECIBIR_RESERVAS',
  'NEGOCIO_COMPLETAR_PEDIDOS',
  'NEGOCIO_CONSEGUIR_SEGUIDORES',
  'NEGOCIO_TENER_PRODUCTOS',
  'NEGOCIO_RECIBIR_VISITAS',
] as const;

export type AccionLogro = (typeof ACCIONES_LOGRO)[number];

export const ACCIONES_LOGRO_NEGOCIO = [
  'NEGOCIO_RECIBIR_RESENAS',
  'NEGOCIO_CREAR_PROMOCIONES',
  'NEGOCIO_RECIBIR_RESERVAS',
  'NEGOCIO_COMPLETAR_PEDIDOS',
  'NEGOCIO_CONSEGUIR_SEGUIDORES',
  'NEGOCIO_TENER_PRODUCTOS',
  'NEGOCIO_RECIBIR_VISITAS',
] as const;

export type AccionLogroNegocio = (typeof ACCIONES_LOGRO_NEGOCIO)[number];

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
  NEGOCIO_RECIBIR_RESENAS: 'reseñas recibidas',
  NEGOCIO_CREAR_PROMOCIONES: 'promociones creadas',
  NEGOCIO_RECIBIR_RESERVAS: 'reservas recibidas',
  NEGOCIO_COMPLETAR_PEDIDOS: 'pedidos completados',
  NEGOCIO_CONSEGUIR_SEGUIDORES: 'seguidores del negocio',
  NEGOCIO_TENER_PRODUCTOS: 'productos en catálogo',
  NEGOCIO_RECIBIR_VISITAS: 'visitas al negocio',
};

export function isAccionLogro(value: string): value is AccionLogro {
  return ACCIONES_LOGRO.includes(value as AccionLogro);
}

export function isAccionLogroNegocio(
  value: string | null | undefined,
): value is AccionLogroNegocio {
  return ACCIONES_LOGRO_NEGOCIO.includes(value as AccionLogroNegocio);
}
