"use client";

import { formatFecha } from "@/lib/utils";
import type { ReservaResponse } from "@/types";

interface Props {
  turno: ReservaResponse;
  onNuevoTurno: () => void;
}

export default function Confirmacion({ turno, onNuevoTurno }: Props) {
  return (
    <div className="text-center space-y-6 py-4">
      {/* Ícono de éxito */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800">¡Turno confirmado!</h2>
        <p className="text-gray-500 text-sm mt-1">
          Te enviamos la confirmación por email.
        </p>
      </div>

      {/* Detalles del turno */}
      <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Profesional</span>
          <span className="font-semibold text-gray-800">{turno.profesional}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Especialidad</span>
          <span className="font-semibold text-gray-800">{turno.especialidad}</span>
        </div>
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-400 mb-1">Fecha y hora</p>
          <p className="font-semibold text-gray-800 capitalize">
            {turno.fecha_inicio ? formatFecha(turno.fecha_inicio) : "-"}
          </p>
        </div>
        <div className="bg-brand-50 rounded-xl p-3 text-center">
          <p className="text-xs text-brand-500 mb-1">Número de turno</p>
          <p className="font-mono text-xs text-brand-600 font-bold tracking-wide">
            {turno.turno_id?.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Podés cancelar tu turno hasta 2 horas antes desde tu portal de paciente.
      </p>

      <button
        onClick={onNuevoTurno}
        className="w-full py-3 rounded-xl border-2 border-brand-200 text-brand-500 font-semibold hover:bg-brand-50 transition-all"
      >
        Reservar otro turno
      </button>
    </div>
  );
}
