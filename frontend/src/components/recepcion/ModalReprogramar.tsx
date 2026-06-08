"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn, formatHora } from "@/lib/utils";
import type { TurnoCompleto } from "@/types/recepcion";
import type { Slot } from "@/types";

interface Props {
  turno: TurnoCompleto;
  onClose: () => void;
  onReprogramado: () => void;
}

function generarFechas(): string[] {
  const fechas: string[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 0; fechas.length < 14; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() !== 0) fechas.push(d.toISOString().slice(0, 10));
  }
  return fechas;
}

export default function ModalReprogramar({ turno, onClose, onReprogramado }: Props) {
  const [fecha, setFecha] = useState(turno.fecha_inicio.slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotElegido, setSlotElegido] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fechas = generarFechas();

  useEffect(() => {
    setCargando(true);
    setSlotElegido(null);
    supabase
      .rpc("obtener_slots_disponibles", {
        p_profesional_id: turno.profesionales
          ? (turno as any).profesional_id
          : null,
        p_fecha: fecha,
      })
      .then(({ data }) => {
        // Filtrar el slot actual del turno (no considerarlo ocupado)
        const filtrados = (data ?? []).map((s: Slot) =>
          s.slot_inicio === turno.fecha_inicio ? { ...s, disponible: true } : s
        );
        setSlots(filtrados);
        setCargando(false);
      });
  }, [fecha, turno]);

  async function confirmarReprogramacion() {
    if (!slotElegido) return;
    setGuardando(true);

    // Obtener duración de la especialidad
    const { data: esp } = await supabase
      .from("especialidades")
      .select("duracion_minutos")
      .eq("nombre", turno.especialidades.nombre)
      .single();

    const inicio = new Date(slotElegido);
    const fin = new Date(inicio.getTime() + (esp?.duracion_minutos ?? 30) * 60000);

    const { error } = await supabase
      .from("turnos")
      .update({
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        estado: "pendiente",
        notas_recepcion: `Reprogramado desde ${turno.fecha_inicio.slice(0, 16).replace("T", " ")}`,
      })
      .eq("id", turno.id);

    setGuardando(false);
    if (!error) {
      onReprogramado();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Reprogramar turno</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <p className="text-sm text-gray-500">
          Paciente: <span className="font-medium text-gray-800">
            {turno.pacientes.nombre} {turno.pacientes.apellido}
          </span>
        </p>

        {/* Selector de fecha */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Nueva fecha</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fechas.map((f) => {
              const d = new Date(f + "T00:00:00");
              return (
                <button key={f} onClick={() => setFecha(f)}
                  className={cn(
                    "flex-shrink-0 w-12 p-1.5 rounded-lg border-2 text-center text-xs transition-all",
                    fecha === f
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  <p className="capitalize">{d.toLocaleDateString("es-AR", { weekday: "short" })}</p>
                  <p className="font-bold text-sm">{d.getDate()}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Nuevo horario</p>
          {cargando ? (
            <p className="text-sm text-gray-400">Cargando slots...</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {slots.filter(s => s.disponible).map((s) => (
                <button key={s.slot_inicio} onClick={() => setSlotElegido(s.slot_inicio)}
                  className={cn(
                    "py-2 rounded-lg border-2 text-xs font-semibold transition-all",
                    slotElegido === s.slot_inicio
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-green-200 bg-green-50 text-green-700 hover:border-green-400"
                  )}
                >
                  {formatHora(s.slot_inicio)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmarReprogramacion} disabled={!slotElegido || guardando}
            className={cn(
              "flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all",
              slotElegido ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}>
            {guardando ? "Guardando..." : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
}
