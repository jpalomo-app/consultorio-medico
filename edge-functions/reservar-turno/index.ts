// ============================================================
// EDGE FUNCTION: reservar-turno
// Ruta: POST /functions/v1/reservar-turno
// Descripción: Motor de reservas con protección anti-colisión
//              y cálculo automático de fecha_fin
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Tipos ────────────────────────────────────────────────────

interface ReservaRequest {
  profesional_id: string;
  especialidad_id: string;
  fecha_inicio: string;   // ISO 8601, e.g. "2026-06-10T09:00:00Z"
  paciente: {
    dni: string;
    nombre?: string;
    apellido?: string;
    fecha_nacimiento?: string;  // "YYYY-MM-DD"
    email?: string;
    telefono?: string;
    obra_social?: string;
  };
  obra_social_id?: string | null;   // null = particular
  motivo_consulta?: string;
}

interface ReservaResponse {
  ok: boolean;
  turno_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  profesional?: string;
  especialidad?: string;
  error?: string;
  code?: string;
}

// ── CORS headers ─────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Handler principal ────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Responder al preflight de CORS (el navegador lo envía antes del POST)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Solo aceptar POST
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método no permitido", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  // Parsear body
  let body: ReservaRequest;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Body inválido", code: "INVALID_BODY" }, 400);
  }

  // Validar campos obligatorios
  const validacion = validarRequest(body);
  if (!validacion.ok) {
    return json({ ok: false, error: validacion.error, code: "VALIDATION_ERROR" }, 400);
  }

  // Cliente con service_role para operaciones privilegiadas dentro de la función
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── PASO 1: Verificar que el profesional y especialidad existen y están activos
    const { data: profesional, error: errProf } = await supabase
      .from("profesionales")
      .select("id, nombre, apellido, especialidad_id, activo")
      .eq("id", body.profesional_id)
      .eq("activo", true)
      .single();

    if (errProf || !profesional) {
      return json({ ok: false, error: "Profesional no encontrado o inactivo", code: "PROFESIONAL_NOT_FOUND" }, 404);
    }

    // ── PASO 2: Obtener duración de la especialidad
    const { data: especialidad, error: errEsp } = await supabase
      .from("especialidades")
      .select("id, nombre, duracion_minutos")
      .eq("id", body.especialidad_id)
      .eq("activo", true)
      .single();

    if (errEsp || !especialidad) {
      return json({ ok: false, error: "Especialidad no encontrada", code: "ESPECIALIDAD_NOT_FOUND" }, 404);
    }

    // ── PASO 3: Calcular fecha_fin
    const fechaInicio = new Date(body.fecha_inicio);
    const fechaFin = new Date(fechaInicio.getTime() + especialidad.duracion_minutos * 60 * 1000);

    // Validar que fecha_inicio sea futura
    if (fechaInicio <= new Date()) {
      return json({ ok: false, error: "La fecha del turno debe ser futura", code: "FECHA_PASADA" }, 400);
    }

    // ── PASO 4: Verificar que el slot cae dentro de la agenda del profesional
    const dentroDeAgenda = await verificarAgenda(supabase, body.profesional_id, fechaInicio, fechaFin);
    if (!dentroDeAgenda) {
      return json({ ok: false, error: "El horario no está dentro de la agenda del profesional", code: "FUERA_DE_AGENDA" }, 409);
    }

    // ── PASO 5: Verificar que no hay bloqueo activo
    const hayBloqueo = await verificarBloqueo(supabase, body.profesional_id, fechaInicio, fechaFin);
    if (hayBloqueo) {
      return json({ ok: false, error: "El profesional no está disponible en esa fecha", code: "PROFESIONAL_BLOQUEADO" }, 409);
    }

    // ── PASO 6: Obtener o crear paciente por DNI
    const pacienteId = await obtenerOCrearPaciente(supabase, body.paciente);
    if (!pacienteId) {
      return json({ ok: false, error: "No se pudo registrar el paciente", code: "PACIENTE_ERROR" }, 500);
    }

    // ── PASO 7: Insertar turno (el constraint EXCLUDE en DB es la última defensa)
    // Si hay colisión, Postgres lanza un error que capturamos abajo
    const { data: turno, error: errTurno } = await supabase
      .from("turnos")
      .insert({
        paciente_id:      pacienteId,
        profesional_id:   body.profesional_id,
        especialidad_id:  body.especialidad_id,
        fecha_inicio:     fechaInicio.toISOString(),
        fecha_fin:        fechaFin.toISOString(),
        estado:           "pendiente",
        motivo_consulta:  body.motivo_consulta ?? null,
        origen:           "online",
        obra_social_id:   body.obra_social_id ?? null,
      })
      .select("id, fecha_inicio, fecha_fin")
      .single();

    if (errTurno) {
      // El constraint EXCLUDE de Postgres genera este código cuando hay solapamiento
      if (errTurno.code === "23P01") {
        return json({
          ok: false,
          error: "Ese horario ya fue reservado. Por favor elegí otro.",
          code: "SLOT_OCUPADO"
        }, 409);
      }
      throw errTurno;
    }

    // ── PASO 8: Encolar notificación de confirmación
    await supabase.from("notificaciones").insert([
      { turno_id: turno.id, tipo: "confirmacion", canal: "email" },
      { turno_id: turno.id, tipo: "confirmacion", canal: "sms"   },
    ]);

    // ── RESPUESTA EXITOSA
    return json({
      ok: true,
      turno_id:    turno.id,
      fecha_inicio: turno.fecha_inicio,
      fecha_fin:    turno.fecha_fin,
      profesional:  `${profesional.nombre} ${profesional.apellido}`,
      especialidad: especialidad.nombre,
    }, 201);

  } catch (err) {
    console.error("[reservar-turno] Error inesperado:", err);
    return json({ ok: false, error: "Error interno del servidor", code: "INTERNAL_ERROR" }, 500);
  }
});


// ── Helpers ──────────────────────────────────────────────────

function json(data: ReservaResponse, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function validarRequest(body: ReservaRequest): { ok: boolean; error?: string } {
  if (!body.profesional_id) return { ok: false, error: "profesional_id es requerido" };
  if (!body.especialidad_id) return { ok: false, error: "especialidad_id es requerido" };
  if (!body.fecha_inicio) return { ok: false, error: "fecha_inicio es requerido" };
  if (!body.paciente?.dni) return { ok: false, error: "El DNI del paciente es requerido" };

  // Validar formato fecha ISO
  if (isNaN(new Date(body.fecha_inicio).getTime())) {
    return { ok: false, error: "fecha_inicio no tiene formato válido (ISO 8601)" };
  }

  return { ok: true };
}

async function verificarAgenda(
  supabase: ReturnType<typeof createClient>,
  profesionalId: string,
  inicio: Date,
  fin: Date
): Promise<boolean> {
  // Calcular día de semana (0=Lunes)
  const diaSemana = inicio.getDay() === 0 ? 6 : inicio.getDay() - 1;

  const horaInicio = inicio.toTimeString().slice(0, 8);  // "HH:MM:SS"
  const horaFin    = fin.toTimeString().slice(0, 8);

  const { data } = await supabase
    .from("agendas_disponibilidad")
    .select("id")
    .eq("profesional_id", profesionalId)
    .eq("dia_semana", diaSemana)
    .eq("activo", true)
    .lte("hora_inicio", horaInicio)
    .gte("hora_fin", horaFin)
    .maybeSingle();

  return !!data;
}

async function verificarBloqueo(
  supabase: ReturnType<typeof createClient>,
  profesionalId: string,
  inicio: Date,
  fin: Date
): Promise<boolean> {
  const { data } = await supabase
    .from("bloqueos")
    .select("id")
    .eq("profesional_id", profesionalId)
    .lt("fecha_inicio", fin.toISOString())
    .gt("fecha_fin", inicio.toISOString())
    .maybeSingle();

  return !!data;
}

async function obtenerOCrearPaciente(
  supabase: ReturnType<typeof createClient>,
  pacienteData: ReservaRequest["paciente"]
): Promise<string | null> {
  // Buscar paciente existente por DNI
  const { data: existente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("dni", pacienteData.dni)
    .maybeSingle();

  if (existente) return existente.id;

  // Si no existe, requiere datos mínimos para crear
  if (!pacienteData.nombre || !pacienteData.apellido || !pacienteData.email || !pacienteData.fecha_nacimiento) {
    return null;  // El frontend debería haber validado esto en el Paso 3
  }

  const { data: nuevo, error } = await supabase
    .from("pacientes")
    .insert({
      dni:              pacienteData.dni,
      nombre:           pacienteData.nombre,
      apellido:         pacienteData.apellido,
      fecha_nacimiento: pacienteData.fecha_nacimiento,
      email:            pacienteData.email,
      telefono:         pacienteData.telefono ?? null,
      obra_social:      pacienteData.obra_social ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[obtenerOCrearPaciente] Error:", error);
    return null;
  }

  return nuevo.id;
}
