export const ACCIONES_LOGRO = [
  'RESENA_PUBLICADA',
  'COMPRA_REALIZADA',
  'RESERVA_HECHA',
  'PROMOCION_CANJEADA',
  'VISITA_NEGOCIO',
  'NEGOCIO_SEGUIDO',
] as const;

export type AccionLogro = (typeof ACCIONES_LOGRO)[number];

export const ACCION_LOGRO_LABELS: Record<AccionLogro, string> = {
  RESENA_PUBLICADA: 'reseñas publicadas',
  COMPRA_REALIZADA: 'compras realizadas',
  RESERVA_HECHA: 'reservas hechas',
  PROMOCION_CANJEADA: 'promociones canjeadas',
  VISITA_NEGOCIO: 'visitas a negocios',
  NEGOCIO_SEGUIDO: 'negocios seguidos',
};

export function isAccionLogro(value: string): value is AccionLogro {
  return ACCIONES_LOGRO.includes(value as AccionLogro);
}
