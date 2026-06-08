"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn, formatHora } from "@/lib/utils";
import type { ReservaState, Slot } from "@/types";

interface Props {
  state: ReservaState;
  onChange: (update: Partial<ReservaState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PasoDos({ state, onChange, onNext, onBack }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!state.profesional || !state.fecha) return;

    setCargando(true);
    supabase
      .rpc("obtener_slots_disponibles", {
        p_profesional_id: state.profesional.id,
        p_fecha: state.fecha,
      })
      .then(({ data }) => {
        setSlots(data ?? []);
        setCargando(false);
      });
  }, [state.profesional, state.fecha]);

  const disponibles = slots.filter((s) => s.disponible);
  const ocupados    = slots.filter((s) => !s.disponible);

  return (
    <div className="space-y-5">
      {/* Resumen del paso anterior */}
      <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-800">
        <p className="font-semibold">
          Dr/a. {state.profesional?.nombre} {state.profesional?.apellido}
        </p>
        <p className="text-blue-600">
          {state.especialidad?.nombre} ·{" "}
          {new Date(state.fecha! + "T00:00:00").toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {cargando ? (
        <div className="grid grid-cols-4 gap-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 text-sm">
            Este profesional no tiene agenda configurada para ese día.
          </p>
          <button
            onClick={onBack}
            className="mt-3 text-blue-600 text-sm underline"
          >
            Elegir otra fecha
          </button>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">
              Horarios disponibles ({disponibles.length})
            </p>
            {disponibles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No hay turnos disponibles para este día.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {disponibles.map((slot) => (
                  <button
                    key={slot.slot_inicio}
                    onClick={() => onChange({ slot })}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                      state.slot?.slot_inicio === slot.slot_inicio
                        ? "border-brand-500 bg-brand-500 text-white shadow-md scale-105"
                        : "border-green-200 bg-green-50 text-green-700 hover:border-green-400"
                    )}
                  >
                    {formatHora(slot.slot_inicio)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {ocupados.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">
                Ocupados ({ocupados.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ocupados.map((slot) => (
                  <div
                    key={slot.slot_inicio}
                    className="py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-semibold text-gray-300 text-center line-through"
                  >
                    {formatHora(slot.slot_inicio)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-all"
        >
          ← Volver
        </button>
        <button
          onClick={onNext}
          disabled={!state.slot}
          className={cn(
            "flex-1 py-3 rounded-xl font-semibold text-white transition-all",
            state.slot
              ? "bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/25"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          Confirmar horario →
        </button>
      </div>
    </div>
  );
}
