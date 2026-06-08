"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { TurnoCompleto } from "@/types/recepcion";

export function useTurnosRealtime(fecha: string) {
  const [turnos, setTurnos] = useState<TurnoCompleto[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchTurnos = useCallback(async () => {
    const inicio = `${fecha}T00:00:00`;
    const fin    = `${fecha}T23:59:59`;

    const { data } = await supabase
      .from("turnos")
      .select(`
        id, fecha_inicio, fecha_fin, estado,
        motivo_consulta, notas_recepcion, origen,
        obra_social_id, copago_abonado,
        pacientes ( nombre, apellido, dni, telefono, obra_social ),
        profesionales ( nombre, apellido ),
        especialidades ( nombre, color_agenda, duracion_minutos ),
        obras_sociales ( nombre, copago_monto )
      `)
      .gte("fecha_inicio", inicio)
      .lte("fecha_inicio", fin)
      .neq("estado", "cancelado")
      .order("fecha_inicio");

    setTurnos((data as unknown as TurnoCompleto[]) ?? []);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    setCargando(true);
    fetchTurnos();

    const channel = supabase
      .channel(`turnos-${fecha}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "turnos" },
        () => fetchTurnos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fecha, fetchTurnos]);

  return { turnos, cargando, refetch: fetchTurnos };
}
