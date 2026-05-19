DO $$
DECLARE
  constraint_name TEXT;
  index_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class tbl ON tbl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = current_schema()
      AND tbl.relname = 'Resena'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname ORDER BY arr.ord)
        FROM unnest(con.conkey) WITH ORDINALITY AS arr(attnum, ord)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = arr.attnum
      )::text[] = ARRAY['usuarioId', 'negocioId']
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      current_schema(),
      'Resena',
      constraint_name
    );
  END LOOP;

  FOR index_name IN
    SELECT idx_cls.relname
    FROM pg_index idx
    JOIN pg_class idx_cls ON idx_cls.oid = idx.indexrelid
    JOIN pg_class tbl ON tbl.oid = idx.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = current_schema()
      AND tbl.relname = 'Resena'
      AND idx.indisunique
      AND (
        SELECT array_agg(att.attname ORDER BY arr.ord)
        FROM unnest(idx.indkey) WITH ORDINALITY AS arr(attnum, ord)
        JOIN pg_attribute att
          ON att.attrelid = idx.indrelid
         AND att.attnum = arr.attnum
      )::text[] = ARRAY['usuarioId', 'negocioId']
  LOOP
    EXECUTE format(
      'DROP INDEX IF EXISTS %I.%I',
      current_schema(),
      index_name
    );
  END LOOP;
END $$;

DROP INDEX IF EXISTS "Resena_usuarioId_negocioId_key";
DROP INDEX IF EXISTS "public"."Resena_usuarioId_negocioId_key";
