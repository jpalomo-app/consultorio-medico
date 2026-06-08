import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const { admin_secret, accion, ...params } = body;

    // Auth
    const expectedSecret = Deno.env.get("ADMIN_SECRET");
    if (!expectedSecret || admin_secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Cliente con service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── ESPECIALIDADES ───────────────────────────────────────

    if (accion === "especialidades_listar") {
      const { data, error } = await supabase
        .from("especialidades")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return ok({ especialidades: data });
    }

    if (accion === "especialidades_crear") {
      const { nombre, duracion_minutos, color_agenda } = params;
      const { data, error } = await supabase
        .from("especialidades")
        .insert({ nombre, duracion_minutos: Number(duracion_minutos), color_agenda })
        .select()
        .single();
      if (error) throw error;
      return ok({ especialidad: data });
    }

    if (accion === "especialidades_actualizar") {
      const { id, nombre, duracion_minutos, color_agenda } = params;
      const { data, error } = await supabase
        .from("especialidades")
        .update({ nombre, duracion_minutos: Number(duracion_minutos), color_agenda })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return ok({ especialidad: data });
    }

    if (accion === "especialidades_eliminar") {
      const { id } = params;
      // Verificar que no tenga profesionales asociados
      const { count } = await supabase
        .from("profesionales")
        .select("id", { count: "exact", head: true })
        .eq("especialidad_id", id);
      if (count && count > 0) {
        return new Response(
          JSON.stringify({ error: "No se puede eliminar: hay profesionales con esta especialidad" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }
      const { error } = await supabase.from("especialidades").delete().eq("id", id);
      if (error) throw error;
      return ok({ ok: true });
    }

    // ── PROFESIONALES ────────────────────────────────────────

    if (accion === "profesionales_listar") {
      const { data, error } = await supabase
        .from("profesionales")
        .select("*, especialidades(id, nombre, color_agenda)")
        .order("apellido");
      if (error) throw error;
      return ok({ profesionales: data });
    }

    if (accion === "profesionales_crear") {
      const { nombre, apellido, matricula, especialidad_id } = params;
      const { data, error } = await supabase
        .from("profesionales")
        .insert({ nombre, apellido, matricula, especialidad_id })
        .select("*, especialidades(id, nombre, color_agenda)")
        .single();
      if (error) throw error;
      return ok({ profesional: data });
    }

    if (accion === "profesionales_actualizar") {
      const { id, nombre, apellido, matricula, especialidad_id } = params;
      const { data, error } = await supabase
        .from("profesionales")
        .update({ nombre, apellido, matricula, especialidad_id })
        .eq("id", id)
        .select("*, especialidades(id, nombre, color_agenda)")
        .single();
      if (error) throw error;
      return ok({ profesional: data });
    }

    if (accion === "profesionales_eliminar") {
      const { id } = params;
      // Verificar turnos futuros
      const { count } = await supabase
        .from("turnos")
        .select("id", { count: "exact", head: true })
        .eq("profesional_id", id)
        .gte("fecha_inicio", new Date().toISOString())
        .neq("estado", "cancelado");
      if (count && count > 0) {
        return new Response(
          JSON.stringify({ error: `No se puede eliminar: tiene ${count} turno(s) futuro(s) activo(s)` }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }
      // Eliminar agendas primero
      await supabase.from("agendas_disponibilidad").delete().eq("profesional_id", id);
      const { error } = await supabase.from("profesionales").delete().eq("id", id);
      if (error) throw error;
      return ok({ ok: true });
    }

    // ── AGENDAS ──────────────────────────────────────────────

    if (accion === "agendas_listar") {
      const { profesional_id } = params;
      const { data, error } = await supabase
        .from("agendas_disponibilidad")
        .select("*")
        .eq("profesional_id", profesional_id)
        .order("dia_semana");
      if (error) throw error;
      return ok({ agendas: data ?? [] });
    }

    if (accion === "agendas_guardar") {
      const { profesional_id, dias } = params;
      const rows = (dias as Array<{
        dia_semana: number;
        hora_inicio: string;
        hora_fin: string;
        activo: boolean;
      }>).map((d) => ({
        profesional_id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
        activo: d.activo,
      }));
      const { error } = await supabase
        .from("agendas_disponibilidad")
        .upsert(rows, { onConflict: "profesional_id,dia_semana" });
      if (error) throw error;
      return ok({ ok: true });
    }

    // ── SISTEMA ──────────────────────────────────────────────

    if (accion === "sistema_estado") {
      const { data, error } = await supabase
        .from("configuracion_sistema")
        .select("*")
        .eq("id", "singleton")
        .single();
      if (error) throw error;
      return ok({ sistema: data });
    }

    if (accion === "sistema_actualizar") {
      const { bloqueado, mensaje_bloqueo } = params;
      const update: Record<string, unknown> = {
        bloqueado,
        mensaje_bloqueo,
        updated_at: new Date().toISOString(),
      };
      if (bloqueado) update.bloqueado_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("configuracion_sistema")
        .update(update)
        .eq("id", "singleton")
        .select()
        .single();
      if (error) throw error;
      return ok({ sistema: data });
    }

    return new Response(
      JSON.stringify({ error: `Acción desconocida: ${accion}` }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});

function ok(data: object) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
