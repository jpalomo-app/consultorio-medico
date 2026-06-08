"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/ui/Logo";
import ModalReprogramar from "@/components/portal/ModalReprogramar";

// ── Tipos ────────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  obra_social: string | null;
}

interface Turno {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  motivo_consulta: string | null;
  created_at: string;
  profesional_id: string;
  profesionales: {
    id: string;
    nombre: string;
    apellido: string;
    matricula: string;
    especialidades: {
      nombre: string;
      color_agenda: string;
    };
  };
}

// ── Helpers ──────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function esFuturo(iso: string) {
  return new Date(iso) > new Date();
}

const ESTADO_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  pendiente:  { label: "Pendiente",  classes: "bg-amber-100 text-amber-700 border-amber-200",    dot: "bg-amber-400" },
  confirmado: { label: "Confirmado", classes: "bg-green-100 text-green-700 border-green-200",    dot: "bg-green-400" },
  cancelado:  { label: "Cancelado",  classes: "bg-red-100 text-red-600 border-red-200",          dot: "bg-red-400" },
  atendido:   { label: "Atendido",   classes: "bg-gray-100 text-gray-500 border-gray-200",       dot: "bg-gray-400" },
  ausente:    { label: "Ausente",    classes: "bg-orange-100 text-orange-600 border-orange-200", dot: "bg-orange-400" },
};

// ── TurnoCard ────────────────────────────────────────────────

function TurnoCard({
  turno, onCancelar, onReprogramar,
}: {
  turno: Turno;
  onCancelar: (id: string) => void;
  onReprogramar: (turno: Turno) => void;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const futuro = esFuturo(turno.fecha_inicio);
  const accionable = futuro && (turno.estado === "pendiente" || turno.estado === "confirmado");
  const estadoConf = ESTADO_CONFIG[turno.estado] ?? ESTADO_CONFIG.pendiente;
  const color = turno.profesionales?.especialidades?.color_agenda ?? '#6B7280';

  async function handleCancelar() {
    if (!confirmandoCancelar) { setConfirmandoCancelar(true); return; }
    setCancelando(true);
    const { error } = await supabase.from("turnos").update({ estado: "cancelado" }).eq("id", turno.id);
    if (!error) onCancelar(turno.id);
    setCancelando(false);
    setConfirmandoCancelar(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${estadoConf.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${estadoConf.dot}`} />
            {estadoConf.label}
          </span>
          {!futuro && turno.estado !== "cancelado" && (
            <span className="text-xs text-gray-400 font-medium">Pasado</span>
          )}
        </div>

        <p className="font-black text-gray-900 text-base">
          Dr/a. {turno.profesionales?.nombre ?? '—'} {turno.profesionales?.apellido ?? ''}
        </p>
        <p className="text-sm font-semibold mb-3" style={{ color }}>
          {turno.profesionales?.especialidades?.nombre ?? 'Especialidad no disponible'}
        </p>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="capitalize">{formatFecha(turno.fecha_inicio)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatHora(turno.fecha_inicio)} – {formatHora(turno.fecha_fin)}</span>
          </div>
          {turno.motivo_consulta && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="italic">{turno.motivo_consulta}</span>
            </div>
          )}
        </div>

        {accionable && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            {!confirmandoCancelar && (
              <button
                onClick={() => onReprogramar(turno)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-50 py-2.5 rounded-xl transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reprogramar
              </button>
            )}
            <button
              onClick={handleCancelar}
              disabled={cancelando}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all ${
                confirmandoCancelar
                  ? "bg-red-500 text-white border border-red-500 hover:bg-red-600"
                  : "text-red-500 border border-red-200 hover:bg-red-50"
              } disabled:opacity-50`}
            >
              {cancelando ? "Cancelando..." : confirmandoCancelar ? "¿Confirmar cancelación?" : "Cancelar turno"}
            </button>
            {confirmandoCancelar && (
              <button
                onClick={() => setConfirmandoCancelar(false)}
                className="px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                No
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────

export default function MisTurnosPage() {
  const [dni, setDni] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoAReprogramar, setTurnoAReprogramar] = useState<Turno | null>(null);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    setPaciente(null);
    setTurnos([]);

    const { data: pac, error: errPac } = await supabase
      .from("pacientes")
      .select("id, nombre, apellido, dni, email, telefono, obra_social")
      .eq("dni", dni.trim())
      .eq("fecha_nacimiento", fechaNac)
      .single();

    if (errPac || !pac) {
      setError("Los datos ingresados no coinciden con ningún paciente registrado. Verificá tu DNI y fecha de nacimiento.");
      setBuscando(false);
      return;
    }

    const { data: tData } = await supabase
      .from("turnos")
      .select(`
        id, fecha_inicio, fecha_fin, estado, motivo_consulta, created_at, profesional_id,
        profesionales ( id, nombre, apellido, matricula, especialidades ( nombre, color_agenda ) )
      `)
      .eq("paciente_id", pac.id)
      .order("fecha_inicio", { ascending: false });

    setPaciente(pac);
    setTurnos((tData as unknown as Turno[]) ?? []);
    setBuscando(false);
  }

  function handleCancelarTurno(id: string) {
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "cancelado" } : t)));
  }

  async function handleReprogramar(nuevoInicio: string, nuevoFin: string) {
    if (!turnoAReprogramar) return;
    const { error } = await supabase
      .from("turnos")
      .update({ fecha_inicio: nuevoInicio, fecha_fin: nuevoFin, estado: "pendiente" })
      .eq("id", turnoAReprogramar.id);
    if (!error) {
      setTurnos((prev) =>
        prev.map((t) =>
          t.id === turnoAReprogramar.id
            ? { ...t, fecha_inicio: nuevoInicio, fecha_fin: nuevoFin, estado: "pendiente" }
            : t
        )
      );
    }
    setTurnoAReprogramar(null);
  }

  const proximos = turnos.filter((t) => esFuturo(t.fecha_inicio) && t.estado !== "cancelado");
  const historial = turnos.filter((t) => !esFuturo(t.fecha_inicio) || t.estado === "cancelado");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/"><Logo size="sm" /></Link>
          <Link href="/reservar" className="text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-all">
            + Nuevo turno
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-bold px-4 py-1.5 rounded-full mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Portal del paciente
          </div>
          <h1 className="text-3xl font-black text-gray-900">Mis turnos</h1>
          {!paciente && (
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Ingresá tu DNI y fecha de nacimiento para ver y gestionar tus turnos.
            </p>
          )}
        </div>

        {/* Formulario */}
        {!paciente && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto">
            <form onSubmit={handleBuscar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Número de DNI
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 35123456"
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={fechaNac}
                  onChange={(e) => setFechaNac(e.target.value)}
                  required
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={buscando || dni.length < 6 || !fechaNac}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buscando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Buscando...
                  </span>
                ) : "Ver mis turnos →"}
              </button>
            </form>
          </div>
        )}

        {/* Resultados */}
        {paciente && (
          <>
            {/* Info paciente */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-brand-600 font-black text-lg">
                  {paciente.nombre[0]}{paciente.apellido[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900">{paciente.nombre} {paciente.apellido}</p>
                <p className="text-sm text-gray-400">DNI {paciente.dni}</p>
                {paciente.obra_social && <p className="text-xs text-gray-400">{paciente.obra_social}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-brand-500">{turnos.length}</p>
                <p className="text-xs text-gray-400">{turnos.length === 1 ? "turno" : "turnos"}</p>
              </div>
            </div>

            {/* Próximos */}
            {proximos.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-black text-gray-900 text-lg">Próximos turnos</h2>
                  <span className="bg-brand-100 text-brand-600 text-xs font-bold px-2.5 py-1 rounded-full">{proximos.length}</span>
                </div>
                <div className="space-y-3">
                  {proximos.map((t) => (
                    <TurnoCard key={t.id} turno={t} onCancelar={handleCancelarTurno} onReprogramar={setTurnoAReprogramar} />
                  ))}
                </div>
              </section>
            )}

            {proximos.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-gray-500 font-semibold">No tenés turnos próximos</p>
                <Link href="/reservar" className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                  Reservar turno →
                </Link>
              </div>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <section>
                <h2 className="font-black text-gray-400 text-base mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial
                </h2>
                <div className="space-y-3 opacity-75">
                  {historial.map((t) => (
                    <TurnoCard key={t.id} turno={t} onCancelar={handleCancelarTurno} onReprogramar={setTurnoAReprogramar} />
                  ))}
                </div>
              </section>
            )}

            <div className="text-center pt-4">
              <button
                onClick={() => { setPaciente(null); setTurnos([]); setDni(""); setFechaNac(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Salir
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal reprogramar */}
      {turnoAReprogramar && (
        <ModalReprogramar
          turno={{
            id: turnoAReprogramar.id,
            profesional_id: turnoAReprogramar.profesionales?.id ?? '',
            profesional_nombre: `${turnoAReprogramar.profesionales?.nombre ?? ''} ${turnoAReprogramar.profesionales?.apellido ?? ''}`.trim(),
            especialidad_nombre: turnoAReprogramar.profesionales?.especialidades?.nombre ?? 'Sin especialidad',
            fecha_inicio: turnoAReprogramar.fecha_inicio,
          }}
          onClose={() => setTurnoAReprogramar(null)}
          onConfirm={handleReprogramar}
        />
      )}
    </div>
  );
}
