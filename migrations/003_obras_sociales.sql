-- MIGRACIÓN 003 — Obras sociales y copagos
-- Aplicar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- TABLA: obras_sociales
-- ============================================================

CREATE TABLE public.obras_sociales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  copago_monto NUMERIC(10,2) NOT NULL DEFAULT 0,
  activa       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obras_sociales_activa ON public.obras_sociales(activa);

CREATE TRIGGER trg_obras_sociales_updated_at
  BEFORE UPDATE ON public.obras_sociales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.obras_sociales IS 'Lista de obras sociales aceptadas con su monto de copago';

-- ============================================================
-- ALTER TABLE: turnos — agregar obra_social_id y copago_abonado
-- ============================================================

ALTER TABLE public.turnos
  ADD COLUMN obra_social_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL,
  ADD COLUMN copago_abonado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_turnos_obra_social ON public.turnos(obra_social_id);

COMMENT ON COLUMN public.turnos.obra_social_id IS 'Null = paciente particular. FK a obras_sociales';
COMMENT ON COLUMN public.turnos.copago_abonado IS 'Indica si el copago fue cobrado en recepcion';

-- ============================================================
-- RLS: obras_sociales — lectura pública, escritura autenticada
-- ============================================================

ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica obras_sociales"
  ON public.obras_sociales FOR SELECT
  USING (true);

CREATE POLICY "Escritura autenticada obras_sociales"
  ON public.obras_sociales FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- DATOS INICIALES — obras sociales comunes
-- ============================================================

INSERT INTO public.obras_sociales (nombre, copago_monto) VALUES
  ('OSDE',          1500.00),
  ('Swiss Medical', 1200.00),
  ('IOMA',          800.00),
  ('PAMI',          0.00),
  ('Galeno',        1000.00),
  ('Medicus',       1400.00),
  ('OMINT',         1600.00),
  ('Accord Salud',  900.00),
  ('Sancor Salud',  1100.00);
