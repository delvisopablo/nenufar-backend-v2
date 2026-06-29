-- Seed idempotente de logros base de negocio.
-- Evita que /negocios/:id/logros devuelva una lista vacia por falta de datos iniciales.
WITH seed(titulo, descripcion, tipo, accion, umbral, dificultad, recompensa_puntos) AS (
  VALUES
    (
      'Primer aplauso recibido',
      'Recibe la primera reseña publicada en tu negocio.',
      'RESENA',
      'NEGOCIO_RECIBIR_RESENAS',
      1,
      'FACIL',
      30
    ),
    (
      'Cinco voces locales',
      'Recibe 5 reseñas publicadas en tu negocio.',
      'RESENA',
      'NEGOCIO_RECIBIR_RESENAS',
      5,
      'MEDIA',
      70
    ),
    (
      'Diez reseñas en flor',
      'Recibe 10 reseñas publicadas en tu negocio.',
      'RESENA',
      'NEGOCIO_RECIBIR_RESENAS',
      10,
      'DURA',
      120
    ),
    (
      'Escaparate con oferta',
      'Crea tu primera promoción para clientes locales.',
      'PROMOCION',
      'NEGOCIO_CREAR_PROMOCIONES',
      1,
      'FACIL',
      25
    ),
    (
      'Promociones constantes',
      'Crea 5 promociones para clientes locales.',
      'PROMOCION',
      'NEGOCIO_CREAR_PROMOCIONES',
      5,
      'MEDIA',
      75
    ),
    (
      'Agenda estrenada',
      'Recibe la primera reserva de tu negocio.',
      'RESERVA',
      'NEGOCIO_RECIBIR_RESERVAS',
      1,
      'FACIL',
      30
    ),
    (
      'Agenda en marcha',
      'Recibe 5 reservas de tu negocio.',
      'RESERVA',
      'NEGOCIO_RECIBIR_RESERVAS',
      5,
      'MEDIA',
      75
    ),
    (
      'Primer pedido servido',
      'Completa el primer pedido de tu negocio.',
      'COMPRA',
      'NEGOCIO_COMPLETAR_PEDIDOS',
      1,
      'FACIL',
      35
    ),
    (
      'Cinco pedidos completados',
      'Completa 5 pedidos de tu negocio.',
      'COMPRA',
      'NEGOCIO_COMPLETAR_PEDIDOS',
      5,
      'MEDIA',
      90
    ),
    (
      'Catálogo vivo',
      'Mantén 5 productos activos en el catálogo del negocio.',
      'OTRO',
      'NEGOCIO_TENER_PRODUCTOS',
      5,
      'MEDIA',
      80
    ),
    (
      'Comunidad en brote',
      'Consigue 5 seguidores para tu negocio.',
      'OTRO',
      'NEGOCIO_CONSEGUIR_SEGUIDORES',
      5,
      'MEDIA',
      80
    )
)
INSERT INTO "Logro" (
  "titulo",
  "descripcion",
  "tipo",
  "categoriaLogro",
  "oculto",
  "esFinal",
  "accion",
  "dificultad",
  "umbral",
  "recompensaPuntos",
  "creadoEn",
  "actualizadoEn"
)
SELECT
  seed.titulo,
  seed.descripcion,
  seed.tipo::"LogroTipo",
  'NEGOCIO'::"LogroCategoria",
  false,
  false,
  seed.accion,
  seed.dificultad::"Dificultad",
  seed.umbral,
  seed.recompensa_puntos,
  NOW(),
  NOW()
FROM seed
WHERE NOT EXISTS (
  SELECT 1
  FROM "Logro" existing
  WHERE existing."categoriaLogro" = 'NEGOCIO'::"LogroCategoria"
    AND existing."accion" = seed.accion
    AND existing."umbral" = seed.umbral
);
