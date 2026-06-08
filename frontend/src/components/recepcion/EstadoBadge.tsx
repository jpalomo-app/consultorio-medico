import { cn } from "@/lib/utils";
import type { EstadoTurno } from "@/types/recepcion";

const CONFIG: Record<EstadoTurno, { label: string; clase: string }> = {
  pendiente:   { label: "Pendiente",   clase: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmado:  { label: "Confirmado",  clase: "bg-green-100  text-green-800  border-green-200"  },
  completado:  { label: "Completado",  clase: "bg-blue-100   text-blue-800   border-blue-200"   },
  cancelado:   { label: "Cancelado",   clase: "bg-red-100    text-red-800    border-red-200"    },
  no_asistio:  { label: "No asistió",  clase: "bg-gray-100   text-gray-600   border-gray-200"   },
};

export default function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  const { label, clase } = CONFIG[estado];
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", clase)}>
      {label}
    </span>
  );
}
