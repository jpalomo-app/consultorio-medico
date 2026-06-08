-- ============================================================
-- MIGRACIÓN 001 — Schema inicial del sistema de turnos médicos
-- Compatible con: Supabase (PostgreSQL 15+)
-- Aplicar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Extensión necesaria para el constraint de exclusión de solapamiento
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
  'paciente',
  'profesional',
  'recepcion',
  'admin'
);

CREATE TYPE estado_turno AS ENUM (
  'pendiente',
  'confirmado',
  'cancelado',
  'completado',
  'no_asistio'
);

CREATE TYPE origen_turno AS ENUM (
  'online',
  'presencial',
  'telefono'
);

CREATE TYPE tipo_notificacion AS ENUM (
  'confirmacion',
  'recordatorio',
  'cancelacion',
  'reprogramacion'
);

CREATE TYPE canal_notificacion AS ENUM (
  'email',
  'sms'
);

CREATE TYPE estado_notificacion AS ENUM (
  'pendiente',
  'enviado',
  'fallido'
);


-- ============================================================
-- TABLA: usuarios
-- Extiende auth.users de Supabase con datos de rol
-- ============================================================

CREATE TABLE public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  rol         rol_usuario NOT NULL DEFAULT 'paciente',
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usuarios IS 'Perfiles de usuarios del sistema, vinculados a auth.users de Supabase';


-- ============================================================
-- TABLA: especialidades
-- ============================================================

CREATE TABLE public.especialidades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  duracion_minutos    INTEGER NOT NULL DEFAULT 30 CHECK (duracion_minutos > 0),
  color_agenda        TEXT NOT NULL DEFAULT '#3B82F6',  -- azul por defecto
  descripcion         TEXT,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.especialidades.duracion_minutos IS 'Duración base de consulta. El motor de reservas usa este valor para generar slots.';

-- Datos semilla de especialidades comunes
INSERT INTO public.especialidades (nombre, duracion_minutos, color_agenda) VALUES
  ('Medicina General',      20, '#10B981'),
  ('Cardiología',           45, '#EF4444'),
  ('Pediatría',             30, '#F59E0B'),
  ('Ginecología',           30, '#EC4899'),
  ('Traumatología',         30, '#6366F1'),
  ('Dermatología',          20, '#F97316'),
  ('Neurología',            45, '#8B5CF6'),
  ('Oftalmología',          30, '#14B8A6'),
  ('Psiquiatría',           60, '#6B7280'),
  ('Clínica Médica',        30, '#0EA5E9');


-- ============================================================
-- TABLA: profesionales
-- ============================================================

CREATE TABLE public.profesionales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  especialidad_id UUID NOT NULL REFERENCES public.especialidades(id),
  nombre          TEXT NOT NULL,
  apellido        TEXT NOT NULL,
  matricula       TEXT NOT NULL UNIQUE,
  foto_url        TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profesionales_especialidad ON public.profesionales(especialidad_id);
CREATE INDEX idx_profesionales_usuario ON public.profesionales(usuario_id);

COMMENT ON TABLE public.profesionales IS 'Médicos y profesionales de salud de la clínica';


-- ============================================================
-- TABLA: agendas_disponibilidad
-- Define la grilla horaria recurrente por profesional
-- ============================================================

CREATE TABLE public.agendas_disponibilidad (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  UUID NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
  dia_semana      INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),  -- 0=Lunes, 6=Domingo
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT horario_valido CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_agenda_profesional_dia ON public.agendas_disponibilidad(profesional_id, dia_semana);

COMMENT ON COLUMN public.agendas_disponibilidad.dia_semana IS '0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo';


-- ============================================================
-- TABLA: bloqueos
-- Períodos de no atención: vacaciones, feriados, licencias
-- ============================================================

CREATE TABLE public.bloqueos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  UUID NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
  fecha_inicio    TIMESTAMPTZ NOT NULL,
  fecha_fin       TIMESTAMPTZ NOT NULL,
  motivo          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloqueo_valido CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX idx_bloqueos_profesional ON public.bloqueos(profesional_id, fecha_inicio, fecha_fin);


-- ============================================================
-- TABLA: pacientes
-- ============================================================

CREATE TABLE public.pacientes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  dni              TEXT NOT NULL UNIQUE,
  nombre           TEXT NOT NULL,
  apellido         TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  email            TEXT NOT NULL,
  telefono         TEXT,
  obra_social      TEXT,
  nro_afiliado     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pacientes_dni   ON public.pacientes(dni);
CREATE INDEX        idx_pacientes_email ON public.pacientes(email);

COMMENT ON COLUMN public.pacientes.usuario_id IS 'Nullable: un paciente puede existir sin cuenta (cargado por recepción)';


-- ============================================================
-- TABLA: turnos  ← CENTRAL DEL SISTEMA
-- ============================================================

CREATE TABLE public.turnos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID NOT NULL REFERENCES public.pacientes(id),
  profesional_id   UUID NOT NULL REFERENCES public.profesionales(id),
  especialidad_id  UUID NOT NULL REFERENCES public.especialidades(id),
  fecha_inicio     TIMESTAMPTZ NOT NULL,
  fecha_fin        TIMESTAMPTZ NOT NULL,
  estado           estado_turno NOT NULL DEFAULT 'pendiente',
  motivo_consulta  TEXT,
  notas_recepcion  TEXT,
  origen           origen_turno NOT NULL DEFAULT 'online',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT turno_duracion_valida CHECK (fecha_fin > fecha_inicio),

  -- CONSTRAINT CLAVE: evita doble reserva en el mismo horario para el mismo profesional
  -- Ignora turnos cancelados al verificar solapamiento
  EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
  ) WHERE (estado <> 'cancelado')
);

-- Índices para queries frecuentes
CREATE INDEX idx_turnos_profesional_fecha  ON public.turnos(profesional_id, fecha_inicio);
CREATE INDEX idx_turnos_paciente           ON public.turnos(paciente_id);
CREATE INDEX idx_turnos_fecha_estado       ON public.turnos(fecha_inicio, estado);
CREATE INDEX idx_turnos_estado             ON public.turnos(estado);

COMMENT ON CONSTRAINT "turnos_profesional_id_tstzrange_excl" ON public.turnos
  IS 'Previene solapamiento de horarios para el mismo profesional. Usa btree_gist.';


-- ============================================================
-- TABLA: notificaciones
-- ============================================================

CREATE TABLE public.notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id    UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  tipo        tipo_notificacion NOT NULL,
  canal       canal_notificacion NOT NULL,
  enviado_at  TIMESTAMPTZ,
  estado      estado_notificacion NOT NULL DEFAULT 'pendiente',
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_turno   ON public.notificaciones(turno_id);
CREATE INDEX idx_notificaciones_estado  ON public.notificaciones(estado);


-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profesionales_updated_at
  BEFORE UPDATE ON public.profesionales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TRIGGER: crear usuario en public.usuarios al registrarse
-- Se ejecuta automáticamente cuando Supabase Auth crea un usuario
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'paciente')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- FUNCIÓN: calcular fecha_fin automáticamente al insertar turno
-- ============================================================

CREATE OR REPLACE FUNCTION public.calcular_fecha_fin_turno()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_duracion INTEGER;
BEGIN
  SELECT duracion_minutos INTO v_duracion
  FROM public.especialidades
  WHERE id = NEW.especialidad_id;

  -- Si fecha_fin no fue provista, calcularla automáticamente
  IF NEW.fecha_fin IS NULL OR NEW.fecha_fin = NEW.fecha_inicio THEN
    NEW.fecha_fin := NEW.fecha_inicio + (v_duracion || ' minutes')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_fecha_fin
  BEFORE INSERT ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_fecha_fin_turno();
