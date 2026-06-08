"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Especialidad, Profesional, ReservaState } from "@/types";

interface Props {
  state: ReservaState;
  onChange: (update: Partial<ReservaState>) => void;
  onNext: () => void;
}

// Genera los próximos 30 días disponibles (excluye domingos por defecto)
function generarFechas(): string[] {
  const fechas: string[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 1; fechas.length < 30; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() !== 0) { // 0 = domingo
      fechas.push(d.toISOString().slice(0, 10));
    }
  }
  return fechas;
}

export default function PasoUno({ state, onChange, onNext }: Props) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [cargando, setCargando] = useState(false);
  const fechas = generarFechas();

  // Cargar especialidades al montar
  useEffect(() => {
    supabase
      .from("especialidades")
      .select("id, nombre, duracion_minutos, color_agenda")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setEspecialidades(data ?? []));
  }, []);

  // Cargar profesionales cuando cambia la especialidad
  useEffect(() => {
    if (!state.especialidad) {
      setProfesionales([]);
      return;
    }
    setCargando(true);
    supabase
      .from("profesionales")
      .select("id, nombre, apellido, matricula, foto_url, especialidad_id")
      .eq("especialidad_id", state.especialidad.id)
      .eq("activo", true)
      .order("apellido")
      .then(({ data }) => {
        setProfesionales(data ?? []);
        setCargando(false);
      });
  }, [state.especialidad]);

  const puedeAvanzar = !!(state.especialidad && state.profesional && state.fecha);

  return (
    <div className="space-y-6">
      {/* Especialidad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Especialidad
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {especialidades.map((esp) => (
            <button
              key={esp.id}
              onClick={() => onChange({ especialidad: esp, profesional: null, slot: null })}
              className={cn(
                "p-3 rounded-lg border-2 text-left text-sm font-medium transition-all",
                state.especialidad?.id === esp.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
              )}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: esp.color_agenda }}
              />
              {esp.nombre}
              <span className="block text-xs text-gray-400 mt-0.5">
                {esp.duracion_minutos} min
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Profesional */}
      {state.especialidad && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profesional
          </label>
          {cargando ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : profesionales.length === 0 ? (
            <p className="text-sm text-gray-400">
              No hay profesionales disponibles para esta especialidad.
            </p>
          ) : (
            <div className="space-y-2">
              {profesionales.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => onChange({ profesional: prof, slot: null })}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                    state.profesional?.id === prof.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                    {prof.nombre[0]}{prof.apellido[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      Dr/a. {prof.nombre} {prof.apellido}
                    </p>
                    <p className="text-xs text-gray-400">Mat. {prof.matricula}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fecha */}
      {state.profesional && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {fechas.slice(0, 14).map((f) => {
              const d = new Date(f + "T00:00:00");
              return (
                <button
                  key={f}
                  onClick={() => onChange({ fecha: f, slot: null })}
                  className={cn(
                    "flex-shrink-0 w-14 p-2 rounded-lg border-2 text-center transition-all",
                    state.fecha === f
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  )}
                >
                  <p className="text-xs text-gray-400 capitalize">
                    {d.toLocaleDateString("es-AR", { weekday: "short" })}
                  </p>
                  <p className="text-lg font-bold leading-tight">{d.getDate()}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {d.toLocaleDateString("es-AR", { month: "short" })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!puedeAvanzar}
        className={cn(
          "w-full py-3 rounded-xl font-semibold text-white transition-all",
          puedeAvanzar
            ? "bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/25"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
      >
        Ver horarios disponibles →
      </button>
    </div>
  );
}
