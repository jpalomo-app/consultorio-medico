"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Slot } from "@/types";

interface TurnoBasico {
  id: string;
  profesional_id: string;
  profesional_nombre: string;
  especialidad_nombre: string;
  fecha_inicio: string;
}

interface Props {
  turno: TurnoBasico;
  onClose: () => void;
  onConfirm: (nuevoInicio: string, nuevoFin: string) => void;
}

function generarFechas(): string[] {
  const fechas: string[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 1; fechas.length < 30; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() !== 0) {
      fechas.push(d.toISOString().split("T")[0]);
    }
  }
  return fechas;
}

function formatFechaCorta(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function ModalReprogramar({ turno, onClose, onConfirm }: Props) {
  const [fechas] = useState<string[]>(generarFechas);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!fechaSeleccionada) return;
    setCargandoSlots(true);
    setSlotSeleccionado(null);
    supabase
      .rpc("obtener_slots_disponibles", {
        p_profesional_id: turno.profesional_id,
        p_fecha: fechaSeleccionada,
      })
      .then(({ data }) => {
        setSlots((data ?? []).filter((s: Slot) => s.disponible));
        setCargandoSlots(false);
      });
  }, [fechaSeleccionada, turno.profesional_id]);

  async function handleConfirmar() {
    if (!slotSeleccionado) return;
    setConfirmando(true);
    onConfirm(slotSeleccionado.slot_inicio, slotSeleccionado.slot_fin);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Reprogramar turno</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Dr/a. {turno.profesional_nombre} · {turno.especialidad_nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Turno actual */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
            <p className="text-amber-700 font-semibold text-xs uppercase tracking-wider mb-1">Turno actual</p>
            <p className="text-amber-900 font-bold">
              {new Date(turno.fecha_inicio).toLocaleDateString("es-AR", {
                weekday: "long", day: "numeric", month: "long",
              })}{" "}
              a las {formatHora(turno.fecha_inicio)}
            </p>
          </div>

          {/* Paso 1: Elegir fecha */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              1. Elegí una nueva fecha
            </p>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {fechas.map((f) => (
                <button
                  key={f}
                  onClick={() => setFechaSeleccionada(f)}
                  className={`text-xs py-2.5 px-2 rounded-xl border font-semibold transition-all ${
                    fechaSeleccionada === f
                      ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30"
                      : "border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  {formatFechaCorta(f)}
                </button>
              ))}
            </div>
          </div>

          {/* Paso 2: Elegir horario */}
          {fechaSeleccionada && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                2. Elegí un horario
              </p>
              {cargandoSlots ? (
                <div className="grid grid-cols-4 gap-2 animate-pulse">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-2xl">
                  <p className="text-gray-400 text-sm">Sin horarios disponibles este día.</p>
                  <p className="text-gray-400 text-xs mt-1">Probá con otra fecha.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.slot_inicio}
                      onClick={() => setSlotSeleccionado(s)}
                      className={`text-sm py-2.5 rounded-xl border font-bold transition-all ${
                        slotSeleccionado?.slot_inicio === s.slot_inicio
                          ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/30"
                          : "border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      {formatHora(s.slot_inicio)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumen + confirmar */}
          {slotSeleccionado && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 space-y-3">
              <div className="text-sm">
                <p className="text-brand-600 font-semibold text-xs uppercase tracking-wider mb-1">Nuevo turno</p>
                <p className="text-brand-900 font-bold">
                  {new Date(fechaSeleccionada! + "T00:00:00").toLocaleDateString("es-AR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}{" "}
                  a las {formatHora(slotSeleccionado.slot_inicio)}
                </p>
              </div>
              <button
                onClick={handleConfirmar}
                disabled={confirmando}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-black py-3 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-60 text-sm"
              >
                {confirmando ? "Guardando..." : "Confirmar reprogramación →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
