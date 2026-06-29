-- Seed idempotente del logro de negocio "recibir visitas" (faltaba en la
-- migración de seed base aunque el motor y los hooks ya lo soportan).
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
  'Escaparate concurrido',
  'Recibe 50 visitas en el perfil del negocio.',
  'OTRO'::"LogroTipo",
  'NEGOCIO'::"LogroCategoria",
  false,
  false,
  'NEGOCIO_RECIBIR_VISITAS',
  'MEDIA'::"Dificultad",
  50,
  75,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "Logro" existing
  WHERE existing."categoriaLogro" = 'NEGOCIO'::"LogroCategoria"
    AND existing."accion" = 'NEGOCIO_RECIBIR_VISITAS'
    AND existing."umbral" = 50
);
