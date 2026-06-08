"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const SELECT = `
  id,
  fecha_inicio,
  estado,
  pacientes ( nombre, apellido, dni, telefono ),
  profesionales ( nombre, apellido ),
  especialidades ( nombre, color_agenda )
`;

export interface TurnoFuturo {
  id: string;
  fecha_inicio: string;
  estado: string;
  pacientes: { nombre: string; apellido: string; dni: string; telefono?: string };
  profesionales: { nombre: string; apellido: string };
  especialidades: { nombre: string; color_agenda: string };
}

export function useTurnosFuturos() {
  const [turnos, setTurnos] = useState<TurnoFuturo[]>([]);
  const [cargando, setCargando] = useState(true);

  async function fetchTurnos() {
    const ahora = new Date().toISOString();
    const { data } = await supabase
      .from("turnos")
      .select(SELECT)
      .in("estado", ["pendiente", "confirmado"])
      .gte("fecha_inicio", ahora)
      .order("fecha_inicio", { ascending: true })
      .limit(50);

    setTurnos((data ?? []) as unknown as TurnoFuturo[]);
    setCargando(false);
  }

  useEffect(() => { fetchTurnos(); }, []);

  return { turnos, cargando, refetch: fetchTurnos };
}
