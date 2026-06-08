"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserClient } from "@supabase/ssr";

// ─── Supabase client ────────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helpers ────────────────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Especialidad {
  id: string;
  nombre: string;
  duracion_minutos: number;
  color_agenda: string;
}

interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  matricula: string;
  foto_url: string | null;
  especialidad_id: string;
}

interface Slot {
  slot_inicio: string;
  slot_fin: string;
  disponible: boolean;
}

interface ObraSocial {
  id: string;
  nombre: string;
  copago_monto: string;
}

type TipoCobertura = "particular" | "obra_social" | "otro";

interface BookingState {
  especialidad: Especialidad | null;
  profesional: Profesional | null;
  fecha: string | null;
  slot: Slot | null;
}

// ─── STEP 1 – Especialidad, Profesional, Fecha ───────────────────────────────
function Step1({
  state,
  onChange,
  onNext,
}: {
  state: BookingState;
  onChange: (s: Partial<BookingState>) => void;
  onNext: () => void;
}) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loadingProf, setLoadingProf] = useState(false);

  // Próximos 30 días hábiles (sin domingos)
  const fechas = (() => {
    const arr: string[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let r = 1; arr.length < 30; r++) {
      const d = new Date(base);
      d.setDate(base.getDate() + r);
      if (d.getDay() !== 0) arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  })();

  useEffect(() => {
    supabase
      .from("especialidades")
      .select("id, nombre, duracion_minutos, color_agenda")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setEspecialidades(data ?? []));
  }, []);

  useEffect(() => {
    if (!state.especialidad) { setProfesionales([]); return; }
    setLoadingProf(true);
    supabase
      .from("profesionales")
      .select("id, nombre, apellido, matricula, foto_url, especialidad_id")
      .eq("especialidad_id", state.especialidad.id)
      .eq("activo", true)
      .order("apellido")
      .then(({ data }) => { setProfesionales(data ?? []); setLoadingProf(false); });
  }, [state.especialidad]);

  const canNext = !!(state.especialidad && state.profesional && state.fecha);

  return (
    <div className="space-y-6">
      {/* Especialidad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {especialidades.map((e) => (
            <button
              key={e.id}
              onClick={() => onChange({ especialidad: e, profesional: null, slot: null })}
              className={cn(
                "p-3 rounded-lg border-2 text-left text-sm font-medium transition-all",
                state.especialidad?.id === e.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
              )}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: e.color_agenda }}
              />
              {e.nombre}
              <span className="block text-xs text-gray-400 mt-0.5">{e.duracion_minutos} min</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profesional */}
      {state.especialidad && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profesional</label>
          {loadingProf ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : profesionales.length === 0 ? (
            <p className="text-sm text-gray-400">No hay profesionales disponibles para esta especialidad.</p>
          ) : (
            <div className="space-y-2">
              {profesionales.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ profesional: p, slot: null })}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                    state.profesional?.id === p.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Dr/a. {p.nombre} {p.apellido}</p>
                    <p className="text-xs text-gray-400">Mat. {p.matricula}</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
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
                      ? "border-blue-500 bg-blue-50 text-blue-700"
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
        disabled={!canNext}
        className={cn(
          "w-full py-3 rounded-xl font-semibold text-white transition-all",
          canNext
            ? "bg-blue-500 hover:bg-blue-600 shadow-md"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
      >
        Ver horarios disponibles →
      </button>
    </div>
  );
}

// ─── STEP 2 – Selección de horario ───────────────────────────────────────────
function Step2({
  state,
  onChange,
  onNext,
  onBack,
}: {
  state: BookingState;
  onChange: (s: Partial<BookingState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.profesional || !state.fecha) return;
    setLoading(true);
    supabase
      .rpc("obtener_slots_disponibles", {
        p_profesional_id: state.profesional.id,
        p_fecha: state.fecha,
      })
      .then(({ data }) => { setSlots(data ?? []); setLoading(false); });
  }, [state.profesional, state.fecha]);

  const disponibles = slots.filter((s) => s.disponible);
  const ocupados = slots.filter((s) => !s.disponible);

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold">
          Dr/a. {state.profesional?.nombre} {state.profesional?.apellido}
        </p>
        <p className="text-blue-600">
          {state.especialidad?.nombre} ·{" "}
          {new Date(state.fecha + "T00:00:00").toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 text-sm">Este profesional no tiene agenda configurada para ese día.</p>
          <button onClick={onBack} className="mt-3 text-blue-600 text-sm underline">
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
                {disponibles.map((s) => (
                  <button
                    key={s.slot_inicio}
                    onClick={() => onChange({ slot: s })}
                    className={cn(
                      "py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                      state.slot?.slot_inicio === s.slot_inicio
                        ? "border-blue-500 bg-blue-500 text-white shadow-md scale-105"
                        : "border-green-200 bg-green-50 text-green-700 hover:border-green-400"
                    )}
                  >
                    {formatHora(s.slot_inicio)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {ocupados.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Ocupados ({ocupados.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {ocupados.map((s) => (
                  <div
                    key={s.slot_inicio}
                    className="py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-semibold text-gray-300 text-center line-through"
                  >
                    {formatHora(s.slot_inicio)}
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
              ? "bg-blue-500 hover:bg-blue-600 shadow-md"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          Confirmar horario →
        </button>
      </div>
    </div>
  );
}

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  dni: z.string().min(7, "DNI inválido").max(10),
  nombre: z.string().min(2, "Ingresá tu nombre"),
  apellido: z.string().min(2, "Ingresá tu apellido"),
  fecha_nacimiento: z.string().min(1, "Ingresá tu fecha de nacimiento"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── STEP 3 – Datos del paciente + cobertura ─────────────────────────────────
function Step3({
  state,
  onBack,
  onSuccess,
}: {
  state: BookingState;
  onBack: () => void;
  onSuccess: (turno: Record<string, string>) => void;
}) {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pacienteExistente, setPacienteExistente] = useState<Record<string, unknown> | null>(null);
  const [esNuevo, setEsNuevo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cobertura
  const [tipoCobertura, setTipoCobertura] = useState<TipoCobertura>("particular");
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [obraSocialId, setObraSocialId] = useState<string>("");

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { dni, nombre: "", apellido: "", fecha_nacimiento: "", email: "", telefono: "" } });

  useEffect(() => {
    supabase
      .from("obras_sociales")
      .select("id, nombre, copago_monto")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => setObrasSociales(data ?? []));
  }, []);

  async function buscarPaciente() {
    if (dni.trim().length < 7) return;
    setBuscando(true);
    setError(null);
    setEsNuevo(false);
    const { data } = await supabase
      .from("pacientes")
      .select("dni, nombre, apellido, fecha_nacimiento, email, telefono, obra_social")
      .eq("dni", dni.trim())
      .maybeSingle();
    if (data) {
      setPacienteExistente({ ...data, esNuevo: false });
    } else {
      setEsNuevo(true);
      form.setValue("dni", dni.trim());
    }
    setBuscando(false);
  }

  async function reservar(paciente: Record<string, unknown>) {
    setEnviando(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("reservar-turno", {
        body: {
          profesional_id: state.profesional!.id,
          especialidad_id: state.especialidad!.id,
          fecha_inicio: state.slot!.slot_inicio,
          tipo_cobertura: tipoCobertura,
          obra_social_id: tipoCobertura === "obra_social" && obraSocialId ? obraSocialId : null,
          paciente,
        },
      });

      if (fnErr) {
        setError("Error al conectar con el servidor. Intentá de nuevo.");
        return;
      }

      if (!data) {
        setError("Respuesta vacía del servidor. Intentá de nuevo.");
        return;
      }

      if (data.ok) {
        supabase.functions.invoke("enviar-confirmacion", {
          body: {
            email: paciente.email,
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            fecha_inicio: state.slot!.slot_inicio,
            profesional: `${state.profesional?.nombre} ${state.profesional?.apellido}`,
            especialidad: state.especialidad?.nombre,
            turno_id: data.turno_id,
          },
        }).catch((e) => console.warn("Email no enviado:", e));
        onSuccess(data);
      } else {
        setError(data.error ?? "Error al reservar el turno.");
      }
    } catch (e) {
      console.error(e);
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Selector de cobertura (siempre visible)
  const coberturaSection = (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Tipo de cobertura</label>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { value: "particular", label: "Particular" },
            { value: "obra_social", label: "Obra Social" },
            { value: "otro", label: "Otro" },
          ] as { value: TipoCobertura; label: string }[]
        ).map((op) => (
          <button
            key={op.value}
            type="button"
            onClick={() => { setTipoCobertura(op.value); setObraSocialId(""); }}
            className={cn(
              "py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
              tipoCobertura === op.value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            {op.label}
          </button>
        ))}
      </div>

      {tipoCobertura === "obra_social" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seleccioná tu obra social
          </label>
          <select
            value={obraSocialId}
            onChange={(e) => setObraSocialId(e.target.value)}
            className={inputCls}
          >
            <option value="">-- Elegí una opción --</option>
            {obrasSociales.map((os) => (
              <option key={os.id} value={os.id}>
                {os.nombre}
                {parseFloat(os.copago_monto) > 0
                  ? ` (copago $${parseFloat(os.copago_monto).toLocaleString("es-AR")})`
                  : " (sin copago)"}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold text-base">Resumen del turno</p>
        <p>👨‍⚕️ Dr/a. {state.profesional?.nombre} {state.profesional?.apellido}</p>
        <p>🏥 {state.especialidad?.nombre}</p>
        <p>📅 {state.slot ? formatFechaHora(state.slot.slot_inicio) : "-"}</p>
        <p className="text-xs text-blue-500">
          Duración: {state.especialidad?.duracion_minutos} minutos
        </p>
      </div>

      {/* DNI */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Documento</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={dni}
            onChange={(e) => { setDni(e.target.value); setPacienteExistente(null); setEsNuevo(false); }}
            placeholder="Ingresá tu DNI"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && buscarPaciente()}
          />
          <button
            onClick={buscarPaciente}
            disabled={buscando || dni.length < 7}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              dni.length >= 7
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {buscando ? "..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Paciente encontrado */}
      {pacienteExistente && (
        <div className="border-2 border-green-400 rounded-xl p-4 bg-green-50 space-y-3">
          <p className="text-green-700 font-semibold text-sm">✓ Paciente encontrado</p>
          <p className="text-gray-800 font-medium">
            {String(pacienteExistente.nombre ?? "")} {String(pacienteExistente.apellido ?? "")}
          </p>
          <p className="text-sm text-gray-500">{String(pacienteExistente.email ?? "")}</p>

          {coberturaSection}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded p-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onBack}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 text-sm hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              onClick={() => reservar(pacienteExistente)}
              disabled={enviando || (tipoCobertura === "obra_social" && !obraSocialId)}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm shadow-md disabled:opacity-60"
            >
              {enviando ? "Reservando..." : "✓ Confirmar turno"}
            </button>
          </div>
        </div>
      )}

      {/* Paciente nuevo */}
      {esNuevo && (
        <form
          onSubmit={form.handleSubmit((d) => reservar({ ...d, esNuevo: true }))}
          className="space-y-3"
        >
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            DNI no encontrado. Completá tus datos para registrarte.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" error={form.formState.errors.nombre?.message}>
              <input {...form.register("nombre")} placeholder="Juan" className={inputCls} />
            </Field>
            <Field label="Apellido" error={form.formState.errors.apellido?.message}>
              <input {...form.register("apellido")} placeholder="Pérez" className={inputCls} />
            </Field>
          </div>

          <Field label="Fecha de nacimiento" error={form.formState.errors.fecha_nacimiento?.message}>
            <input {...form.register("fecha_nacimiento")} type="date" className={inputCls} />
          </Field>

          <Field label="Email" error={form.formState.errors.email?.message}>
            <input
              {...form.register("email")}
              type="email"
              placeholder="juan@email.com"
              className={inputCls}
            />
          </Field>

          <Field label="Teléfono (opcional)">
            <input
              {...form.register("telefono")}
              placeholder="+54 9 11..."
              className={inputCls}
            />
          </Field>

          {coberturaSection}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded p-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              type="submit"
              disabled={enviando || (tipoCobertura === "obra_social" && !obraSocialId)}
              className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-md disabled:opacity-60"
            >
              {enviando ? "Reservando..." : "Confirmar turno →"}
            </button>
          </div>
        </form>
      )}

      {!pacienteExistente && !esNuevo && (
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-all"
        >
          ← Volver
        </button>
      )}
    </div>
  );
}

// ─── STEP 4 – Confirmación ────────────────────────────────────────────────────
function Confirmacion({
  turno,
  onNuevoTurno,
}: {
  turno: Record<string, string>;
  onNuevoTurno: () => void;
}) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800">¡Turno confirmado!</h2>
        <p className="text-gray-500 text-sm mt-1">Te enviamos la confirmación por email.</p>
      </div>

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
            {turno.fecha_inicio ? formatFechaHora(turno.fecha_inicio) : "-"}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-500 mb-1">Número de turno</p>
          <p className="font-mono text-xs text-blue-600 font-bold tracking-wide">
            {turno.turno_id?.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Podés cancelar tu turno hasta 2 horas antes desde tu portal de paciente.
      </p>

      <button
        onClick={onNuevoTurno}
        className="w-full py-3 rounded-xl border-2 border-blue-200 text-blue-500 font-semibold hover:bg-blue-50 transition-all"
      >
        Reservar otro turno
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const STEPS = ["Especialidad y fecha", "Horario", "Mis datos"];
const INITIAL: BookingState = { especialidad: null, profesional: null, fecha: null, slot: null };

export default function ReservarPage() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingState>(INITIAL);
  const [turnoConfirmado, setTurnoConfirmado] = useState<Record<string, string> | null>(null);

  function update(partial: Partial<BookingState>) {
    setBooking((prev) => ({ ...prev, ...partial }));
  }

  if (turnoConfirmado) {
    return (
      <Confirmacion
        turno={turnoConfirmado}
        onNuevoTurno={() => { setBooking(INITIAL); setTurnoConfirmado(null); setStep(0); }}
      />
    );
  }

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  i < step
                    ? "bg-blue-500 text-white"
                    : i === step
                    ? "bg-blue-500 text-white ring-4 ring-blue-100"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  i === step ? "text-blue-500" : i < step ? "text-blue-500" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all",
                  i < step ? "bg-blue-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Step1 state={booking} onChange={update} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <Step2 state={booking} onChange={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />
      )}
      {step === 2 && (
        <Step3 state={booking} onBack={() => setStep(1)} onSuccess={setTurnoConfirmado} />
      )}
    </div>
  );
}
