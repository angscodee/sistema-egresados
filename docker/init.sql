-- =============================================================================
-- init.sql — Ejecutado automáticamente por PostgreSQL al iniciar el contenedor
-- Crea índices adicionales, vistas materializadas y triggers que Prisma
-- no genera por defecto.
-- =============================================================================

-- Habilitar extensión UUID (por si se usa fuera de Prisma)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ÍNDICES ADICIONALES
-- (Prisma ya crea índices para campos @unique y @id)
-- =============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "User"("createdAt");

-- egresados
CREATE INDEX IF NOT EXISTS idx_egresados_carrera ON "Egresado"(carrera);
CREATE INDEX IF NOT EXISTS idx_egresados_anio_egreso ON "Egresado"("anioEgreso");

-- ofertas_laborales
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON "OfertaLaboral"(estado);
CREATE INDEX IF NOT EXISTS idx_ofertas_fecha_publicacion ON "OfertaLaboral"("fechaPublicacion");
CREATE INDEX IF NOT EXISTS idx_ofertas_empresa_id ON "OfertaLaboral"("empresaId");

-- postulaciones
CREATE INDEX IF NOT EXISTS idx_postulaciones_estado ON "Postulacion"(estado);
CREATE INDEX IF NOT EXISTS idx_postulaciones_egresado_id ON "Postulacion"("egresadoId");
CREATE INDEX IF NOT EXISTS idx_postulaciones_oferta_id ON "Postulacion"("ofertaId");
CREATE INDEX IF NOT EXISTS idx_postulaciones_created_at ON "Postulacion"("createdAt");

-- habilidades
CREATE INDEX IF NOT EXISTS idx_habilidades_tipo ON "Habilidad"(tipo);

-- notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON "Notificacion"("usuarioId", leida);

-- historial_estado
CREATE INDEX IF NOT EXISTS idx_historial_postulacion_id ON "HistorialEstado"("postulacionId");

-- =============================================================================
-- FUNCIÓN updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at (Prisma maneja @updatedAt en el cliente, pero los
-- triggers garantizan consistencia en actualizaciones directas a la DB)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_updated_at
      BEFORE UPDATE ON "User"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_oferta_updated_at'
  ) THEN
    CREATE TRIGGER trg_oferta_updated_at
      BEFORE UPDATE ON "OfertaLaboral"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_postulacion_updated_at'
  ) THEN
    CREATE TRIGGER trg_postulacion_updated_at
      BEFORE UPDATE ON "Postulacion"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- TRIGGER: historial automático de cambios de estado en postulaciones
-- Registra en HistorialEstado cuando cambia el campo "estado"
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_postulaciones_historial()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO "HistorialEstado"(
      id,
      "postulacionId",
      "estadoAnterior",
      "estadoNuevo",
      motivo,
      "createdAt"
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      OLD.estado,
      NEW.estado,
      NULL,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'postulaciones_historial_trigger'
  ) THEN
    CREATE TRIGGER postulaciones_historial_trigger
      AFTER UPDATE OF estado ON "Postulacion"
      FOR EACH ROW EXECUTE FUNCTION fn_postulaciones_historial();
  END IF;
END $$;

-- =============================================================================
-- VISTAS MATERIALIZADAS
-- =============================================================================

-- mv_empleabilidad_por_carrera
-- Porcentaje de egresados contratados por carrera y año de egreso
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_empleabilidad_por_carrera AS
SELECT
  e.carrera,
  e."anioEgreso"                                    AS anio,
  COUNT(DISTINCT e.id)                              AS total_egresados,
  COUNT(DISTINCT p."egresadoId")
    FILTER (WHERE p.estado = 'CONTRATADO')          AS empleados
FROM "Egresado" e
LEFT JOIN "Postulacion" p ON p."egresadoId" = e.id
GROUP BY e.carrera, e."anioEgreso";

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_empleabilidad_pk
  ON mv_empleabilidad_por_carrera(carrera, anio);

-- mv_demanda_habilidades
-- Cuántas ofertas activas requieren cada habilidad vs cuántos egresados la poseen
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_demanda_habilidades AS
SELECT
  h.id          AS habilidad_id,
  h.nombre      AS habilidad,
  COUNT(DISTINCT oh."ofertaId")
    FILTER (
      WHERE ol.estado = 'ACTIVA'
    )             AS ofertas_requieren,
  COUNT(DISTINCT eh."egresadoId") AS egresados_poseen
FROM "Habilidad" h
LEFT JOIN "OfertaHabilidad"  oh ON oh."habilidadId" = h.id
LEFT JOIN "OfertaLaboral"    ol ON ol.id = oh."ofertaId"
LEFT JOIN "EgresadoHabilidad" eh ON eh."habilidadId" = h.id
GROUP BY h.id, h.nombre;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_demanda_habilidades_pk
  ON mv_demanda_habilidades(habilidad_id);

-- =============================================================================
-- Función para refrescar las vistas materializadas
-- Llamar periódicamente con: SELECT refresh_materialized_views();
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_empleabilidad_por_carrera;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_demanda_habilidades;
END;
$$ LANGUAGE plpgsql;
