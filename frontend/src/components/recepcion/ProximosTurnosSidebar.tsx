"use client";

import { useTurnosFuturos } from "@/hooks/useTurnosFuturos";

function formatFechaCorta(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  if (sameDay(d, hoy)) return `Hoy ${hora}`;
  if (sameDay(d, manana)) return `Mañana ${hora}`;

  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) + ` ${hora}`;
}

const ESTADO_DOT: Record<string, string> = {
  pendiente:  "bg-yellow-400",
  confirmado: "bg-green-400",
};

interface Props {
  onFechaClick: (fecha: string) => void;
}

export default function ProximosTurnosSidebar({ onFechaClick }: Props) {
  const { turnos, cargando } = useTurnosFuturos();

  return (
    <aside className="w-72 flex-shrink-0">
      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden sticky top-[65px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Próximos turnos</h2>
          <span className="text-xs text-gray-400 font-mono bg-white/10 px-2 py-0.5 rounded-full">
            {turnos.length}
          </span>
        </div>

        {/* Lista */}
        <div className="max-h-[calc(100vh-160px)] overflow-y-auto divide-y divide-white/5">
          {cargando ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : turnos.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-xs text-gray-400">No hay turnos próximos</p>
            </div>
          ) : (
            turnos.map((t) => {
              const fechaStr = t.fecha_inicio.slice(0, 10);
              return (
                <button
                  key={t.id}
                  onClick={() => onFechaClick(fechaStr)}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Dot de estado */}
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${ESTADO_DOT[t.estado] ?? "bg-gray-400"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                        {t.pacientes.apellido}, {t.pacientes.nombre}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {t.especialidades.nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFechaCorta(t.fecha_inicio)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer con indicador realtime */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <p className="text-xs text-gray-600">En tiempo real</p>
        </div>
      </div>
    </aside>
  );
}
