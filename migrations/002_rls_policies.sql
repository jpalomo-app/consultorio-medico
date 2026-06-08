-- ============================================================
-- MIGRACIÓN 002 — Row Level Security (RLS)
-- Aplicar DESPUÉS de 001_initial_schema.sql
-- ============================================================


-- ============================================================
-- Habilitar RLS en todas las tablas públicas
-- ============================================================

ALTER TABLE public.usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesionales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendas_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones        ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- FUNCIÓN auxiliar: obtener rol del usuario autenticado
-- ============================================================

CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.es_admin_o_recepcion()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol IN ('admin', 'recepcion')
  )
$$;


-- ============================================================
-- POLICIES: usuarios
-- ============================================================

-- Cada usuario ve y edita sólo su propio perfil
CREATE POLICY "usuario_ver_propio" ON public.usuarios
  FOR SELECT USING (id = auth.uid() OR public.es_admin_o_recepcion());

CREATE POLICY "usuario_actualizar_propio" ON public.usuarios
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Solo admin puede cambiar roles
CREATE POLICY "admin_gestionar_usuarios" ON public.usuarios
  FOR ALL USING (public.mi_rol() = 'admin');


-- ============================================================
-- POLICIES: especialidades (lectura pública, escritura admin)
-- ============================================================

CREATE POLICY "especialidades_lectura_publica" ON public.especialidades
  FOR SELECT USING (true);  -- Cualquiera puede ver especialidades (para el formulario de reserva)

CREATE POLICY "admin_gestionar_especialidades" ON public.especialidades
  FOR ALL USING (public.mi_rol() = 'admin');


-- ============================================================
-- POLICIES: profesionales (lectura pública, escritura admin)
-- ============================================================

CREATE POLICY "profesionales_lectura_publica" ON public.profesionales
  FOR SELECT USING (activo = true);  -- Sólo activos son visibles al público

CREATE POLICY "profesional_editar_propio" ON public.profesionales
  FOR UPDATE USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "admin_gestionar_profesionales" ON public.profesionales
  FOR ALL USING (public.mi_rol() = 'admin');


-- ============================================================
-- POLICIES: agendas_disponibilidad
-- ============================================================

-- Lectura pública (necesaria para mostrar slots disponibles)
CREATE POLICY "agenda_lectura_publica" ON public.agendas_disponibilidad
  FOR SELECT USING (true);

-- Profesional gestiona su propia agenda
CREATE POLICY "profesional_gestionar_agenda_propia" ON public.agendas_disponibilidad
  FOR ALL USING (
    profesional_id IN (
      SELECT id FROM public.profesionales WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "admin_gestionar_agendas" ON public.agendas_disponibilidad
  FOR ALL USING (public.es_admin_o_recepcion());


-- ============================================================
-- POLICIES: bloqueos
-- ============================================================

CREATE POLICY "bloqueos_lectura_publica" ON public.bloqueos
  FOR SELECT USING (true);  -- Necesario para calcular disponibilidad

CREATE POLICY "profesional_gestionar_bloqueos_propios" ON public.bloqueos
  FOR ALL USING (
    profesional_id IN (
      SELECT id FROM public.profesionales WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "admin_gestionar_bloqueos" ON public.bloqueos
  FOR ALL USING (public.es_admin_o_recepcion());


-- ============================================================
-- POLICIES: pacientes
-- ============================================================

-- Paciente ve y edita su propio registro
CREATE POLICY "paciente_ver_propio" ON public.pacientes
  FOR SELECT USING (usuario_id = auth.uid() OR public.es_admin_o_recepcion());

CREATE POLICY "paciente_actualizar_propio" ON public.pacientes
  FOR UPDATE USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Cualquier usuario autenticado puede crear su registro de paciente
CREATE POLICY "paciente_crear_propio" ON public.pacientes
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid() OR public.es_admin_o_recepcion()
  );

-- Recepción y admin ven todos los pacientes
CREATE POLICY "recepcion_ver_pacientes" ON public.pacientes
  FOR SELECT USING (public.es_admin_o_recepcion());

CREATE POLICY "recepcion_gestionar_pacientes" ON public.pacientes
  FOR ALL USING (public.es_admin_o_recepcion());


-- ============================================================
-- POLICIES: turnos  ← LAS MÁS IMPORTANTES
-- ============================================================

-- Paciente: ve sólo sus propios turnos
CREATE POLICY "paciente_ver_sus_turnos" ON public.turnos
  FOR SELECT USING (
    paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
  );

-- Paciente: puede crear turnos para sí mismo
CREATE POLICY "paciente_crear_turno" ON public.turnos
  FOR INSERT WITH CHECK (
    paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
    AND estado = 'pendiente'   -- Sólo puede crear en estado pendiente
    AND origen = 'online'
  );

-- Paciente: puede cancelar sólo sus propios turnos pendientes/confirmados
CREATE POLICY "paciente_cancelar_turno_propio" ON public.turnos
  FOR UPDATE USING (
    paciente_id IN (
      SELECT id FROM public.pacientes WHERE usuario_id = auth.uid()
    )
    AND estado IN ('pendiente', 'confirmado')
  )
  WITH CHECK (
    estado = 'cancelado'  -- Sólo puede cambiar a cancelado
  );

-- Profesional: ve los turnos de su propia agenda
CREATE POLICY "profesional_ver_su_agenda" ON public.turnos
  FOR SELECT USING (
    profesional_id IN (
      SELECT id FROM public.profesionales WHERE usuario_id = auth.uid()
    )
  );

-- Recepción y Admin: acceso total
CREATE POLICY "recepcion_acceso_total_turnos" ON public.turnos
  FOR ALL USING (public.es_admin_o_recepcion());


-- ============================================================
-- POLICIES: notificaciones
-- ============================================================

-- Paciente ve las notificaciones de sus turnos
CREATE POLICY "paciente_ver_sus_notificaciones" ON public.notificaciones
  FOR SELECT USING (
    turno_id IN (
      SELECT t.id FROM public.turnos t
      JOIN public.pacientes p ON p.id = t.paciente_id
      WHERE p.usuario_id = auth.uid()
    )
  );

-- Admin gestiona todas las notificaciones
CREATE POLICY "admin_gestionar_notificaciones" ON public.notificaciones
  FOR ALL USING (public.es_admin_o_recepcion());


-- ============================================================
-- FUNCIÓN: obtener slots disponibles para un profesional y fecha
-- Llamada desde el frontend vía RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.obtener_slots_disponibles(
  p_profesional_id  UUID,
  p_fecha           DATE
)
RETURNS TABLE (
  slot_inicio   TIMESTAMPTZ,
  slot_fin      TIMESTAMPTZ,
  disponible    BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_dia_semana        INTEGER;
  v_duracion          INTEGER;
  v_hora_inicio       TIME;
  v_hora_fin          TIME;
  v_slot              TIMESTAMPTZ;
  v_slot_fin          TIMESTAMPTZ;
BEGIN
  -- Calcular día de la semana (0=Lunes, 6=Domingo)
  v_dia_semana := EXTRACT(DOW FROM p_fecha)::INTEGER;
  -- Postgres: 0=Sunday, ajustar a 0=Lunes
  v_dia_semana := CASE WHEN v_dia_semana = 0 THEN 6 ELSE v_dia_semana - 1 END;

  -- Obtener duración de la especialidad del profesional
  SELECT e.duracion_minutos INTO v_duracion
  FROM public.profesionales pr
  JOIN public.especialidades e ON e.id = pr.especialidad_id
  WHERE pr.id = p_profesional_id;

  -- Iterar sobre los bloques de agenda del profesional para ese día
  FOR v_hora_inicio, v_hora_fin IN
    SELECT hora_inicio, hora_fin
    FROM public.agendas_disponibilidad
    WHERE profesional_id = p_profesional_id
      AND dia_semana = v_dia_semana
      AND activo = true
  LOOP
    v_slot := (p_fecha + v_hora_inicio)::TIMESTAMPTZ;

    WHILE v_slot + (v_duracion || ' minutes')::INTERVAL <= (p_fecha + v_hora_fin)::TIMESTAMPTZ
    LOOP
      v_slot_fin := v_slot + (v_duracion || ' minutes')::INTERVAL;

      RETURN QUERY SELECT
        v_slot,
        v_slot_fin,
        NOT EXISTS (
          -- ¿Hay un turno activo que colisione?
          SELECT 1 FROM public.turnos t
          WHERE t.profesional_id = p_profesional_id
            AND t.estado <> 'cancelado'
            AND tstzrange(t.fecha_inicio, t.fecha_fin, '[)') &&
                tstzrange(v_slot, v_slot_fin, '[)')
        ) AND NOT EXISTS (
          -- ¿Hay un bloqueo que cubra este slot?
          SELECT 1 FROM public.bloqueos b
          WHERE b.profesional_id = p_profesional_id
            AND tstzrange(b.fecha_inicio, b.fecha_fin, '[)') &&
                tstzrange(v_slot, v_slot_fin, '[)')
        );

      v_slot := v_slot_fin;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.obtener_slots_disponibles IS
  'Retorna todos los slots (disponibles y ocupados) para un profesional en una fecha dada. Llamar con: SELECT * FROM obtener_slots_disponibles(''uuid'', ''2026-06-10'')';
