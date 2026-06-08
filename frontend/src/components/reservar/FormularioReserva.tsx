"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import PasoUno from "./PasoUno";
import PasoDos from "./PasoDos";
import PasoTres from "./PasoTres";
import Confirmacion from "./Confirmacion";
import type { ReservaState, ReservaResponse } from "@/types";

const PASOS = ["Especialidad y fecha", "Horario", "Mis datos"];

const estadoInicial: ReservaState = {
  especialidad: null,
  profesional: null,
  fecha: null,
  slot: null,
  paciente: null,
};

export default function FormularioReserva() {
  const [paso, setPaso] = useState(0);
  const [state, setState] = useState<ReservaState>(estadoInicial);
  const [turnoConfirmado, setTurnoConfirmado] = useState<ReservaResponse | null>(null);

  function actualizar(update: Partial<ReservaState>) {
    setState((prev) => ({ ...prev, ...update }));
  }

  function reiniciar() {
    setState(estadoInicial);
    setTurnoConfirmado(null);
    setPaso(0);
  }

  if (turnoConfirmado) {
    return <Confirmacion turno={turnoConfirmado} onNuevoTurno={reiniciar} />;
  }

  return (
    <div>
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between mb-8">
        {PASOS.map((nombre, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  i < paso
                    ? "bg-brand-500 text-white"
                    : i === paso
                    ? "bg-brand-500 text-white ring-4 ring-brand-100"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {i < paso ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  i === paso ? "text-brand-500" : i < paso ? "text-brand-500" : "text-gray-400"
                )}
              >
                {nombre}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all",
                  i < paso ? "bg-brand-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenido del paso */}
      {paso === 0 && (
        <PasoUno
          state={state}
          onChange={actualizar}
          onNext={() => setPaso(1)}
        />
      )}
      {paso === 1 && (
        <PasoDos
          state={state}
          onChange={actualizar}
          onNext={() => setPaso(2)}
          onBack={() => setPaso(0)}
        />
      )}
      {paso === 2 && (
        <PasoTres
          state={state}
          onBack={() => setPaso(1)}
          onSuccess={(turno) => setTurnoConfirmado(turno)}
        />
      )}
    </div>
  );
}
