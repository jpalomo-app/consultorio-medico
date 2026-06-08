"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { cn, formatFecha } from "@/lib/utils";
import type { DatosPaciente, ObraSocial, ReservaState, ReservaResponse } from "@/types";

interface Props {
  state: ReservaState;
  onBack: () => void;
  onSuccess: (turno: ReservaResponse) => void;
}

const schemaNuevo = z.object({
  dni:              z.string().min(7, "DNI invalido").max(10),
  nombre:           z.string().min(2, "Ingresa tu nombre"),
  apellido:         z.string().min(2, "Ingresa tu apellido"),
  fecha_nacimiento: z.string().min(1, "Ingresa tu fecha de nacimiento"),
  email:            z.string().email("Email invalido"),
  telefono:         z.string().optional(),
  obra_social:      z.string().optional(),
});

type FormNuevo = z.infer<typeof schemaNuevo>;

export default function PasoTres({ state, onBack, onSuccess }: Props) {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pacienteEncontrado, setPacienteEncontrado] = useState<DatosPaciente | null>(null);
  const [esNuevo, setEsNuevo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);

  // Obras sociales
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [obraSocialId, setObraSocialId] = useState<string>("");   // "" = particular

  const obraSeleccionada = obrasSociales.find(os => os.id === obraSocialId) ?? null;

  useEffect(() => {
    supabase
      .from("obras_sociales")
      .select("id, nombre, copago_monto, activa")
      .eq("activa", true)
      .order("nombre")
      .then(({ data }) => setObrasSociales((data as ObraSocial[]) ?? []));
  }, []);

  const form = useForm<FormNuevo>({
    resolver: zodResolver(schemaNuevo),
    defaultValues: { dni },
  });

  async function buscarPorDni() {
    if (dni.trim().length < 7) return;
    setBuscando(true);
    setPacienteEncontrado(null);
    setEsNuevo(false);

    const { data } = await supabase
      .from("pacientes")
      .select("dni, nombre, apellido, fecha_nacimiento, email, telefono, obra_social")
      .eq("dni", dni.trim())
      .maybeSingle();

    if (data) {
      setPacienteEncontrado({ ...data, esNuevo: false });
    } else {
      setEsNuevo(true);
      form.setValue("dni", dni.trim());
    }
    setBuscando(false);
  }

  async function confirmarTurno(datosPaciente: DatosPaciente) {
    setEnviando(true);
    setErrorReserva(null);

    try {
      const { data, error } = await supabase.functions.invoke("reservar-turno", {
        body: {
          profesional_id:  state.profesional!.id,
          especialidad_id: state.especialidad!.id,
          fecha_inicio:    state.slot!.slot_inicio,
          paciente:        datosPaciente,
          obra_social_id:  obraSocialId || null,
        },
      });

      if (error) {
        setErrorReserva("Error al conectar con el servidor. Intenta de nuevo.");
        return;
      }

      const resultado = data as ReservaResponse;
      if (resultado.ok) {
        supabase.functions.invoke("enviar-confirmacion", {
          body: {
            email:        datosPaciente.email,
            nombre:       datosPaciente.nombre,
            apellido:     datosPaciente.apellido,
            fecha_inicio: state.slot!.slot_inicio,
            profesional:  `${state.profesional?.nombre} ${state.profesional?.apellido}`,
            especialidad: state.especialidad?.nombre,
            turno_id:     resultado.turno_id,
          },
        }).catch((err) => console.warn("Email no enviado:", err));

        onSuccess(resultado);
      } else {
        setErrorReserva(resultado.error ?? "Error al reservar el turno.");
      }
    } catch (e) {
      console.error("Error inesperado:", e);
      setErrorReserva("Error de conexion. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function onSubmitNuevo(values: FormNuevo) {
    confirmarTurno({ ...values, obra_social_id: obraSocialId || null, esNuevo: true });
  }

  function confirmarExistente() {
    if (pacienteEncontrado) confirmarTurno({ ...pacienteEncontrado, obra_social_id: obraSocialId || null });
  }

  return (
    <div className="space-y-5">
      {/* Resumen del turno */}
      <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-800 space-y-1">
        <p className="font-semibold text-base">Resumen del turno</p>
        <p>Dr/a. {state.profesional?.nombre} {state.profesional?.apellido}</p>
        <p>{state.especialidad?.nombre}</p>
        <p>{formatFecha(state.slot!.slot_inicio)}</p>
        <p className="text-xs text-brand-500">Duracion: {state.especialidad?.duracion_minutos} minutos</p>
      </div>

      {/* Selector de obra social */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Cobertura medica</p>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Obra social</label>
          <select
            value={obraSocialId}
            onChange={e => setObraSocialId(e.target.value)}
            className={inputClass}
          >
            <option value="">Particular (sin obra social)</option>
            {obrasSociales.map(os => (
              <option key={os.id} value={os.id}>{os.nombre}</option>
            ))}
          </select>
        </div>

        {/* Info de copago */}
        {obraSocialId === "" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <strong>Consulta particular.</strong> El valor de la consulta se informa en recepcion al momento de atenderse.
          </div>
        ) : obraSeleccionada ? (
          <div className={
            obraSeleccionada.copago_monto > 0
              ? "bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800"
              : "bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800"
          }>
            {obraSeleccionada.copago_monto > 0 ? (
              <>
                <strong>Copago: ${obraSeleccionada.copago_monto.toLocaleString("es-AR")}</strong>
                {" "}— Abonar en recepcion al momento de la consulta.
              </>
            ) : (
              <><strong>Sin copago</strong> para {obraSeleccionada.nombre}. Presentar credencial al llegar.</>
            )}
          </div>
        ) : null}
      </div>

      {/* Busqueda por DNI */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Documento</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={dni}
            onChange={(e) => { setDni(e.target.value); setPacienteEncontrado(null); setEsNuevo(false); }}
            placeholder="Ingresa tu DNI"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => e.key === "Enter" && buscarPorDni()}
          />
          <button
            onClick={buscarPorDni}
            disabled={buscando || dni.length < 7}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              dni.length >= 7 ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {buscando ? "..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Paciente encontrado */}
      {pacienteEncontrado && (
        <div className="border-2 border-green-400 rounded-xl p-4 bg-green-50">
          <p className="text-green-700 font-semibold text-sm mb-1">Paciente encontrado</p>
          <p className="text-gray-800 font-medium">{pacienteEncontrado.nombre} {pacienteEncontrado.apellido}</p>
          <p className="text-sm text-gray-500">{pacienteEncontrado.email}</p>
          {errorReserva && (
            <p className="mt-2 text-red-600 text-sm bg-red-50 rounded p-2">{errorReserva}</p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 text-sm hover:bg-gray-50">
              Volver
            </button>
            <button onClick={confirmarExistente} disabled={enviando} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm shadow-md disabled:opacity-60">
              {enviando ? "Reservando..." : "Confirmar turno"}
            </button>
          </div>
        </div>
      )}

      {/* Formulario paciente nuevo */}
      {esNuevo && (
        <form onSubmit={form.handleSubmit(onSubmitNuevo)} className="space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            DNI no encontrado. Completa tus datos para registrarte.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Nombre" error={form.formState.errors.nombre?.message}>
              <input {...form.register("nombre")} placeholder="Juan" className={inputClass} />
            </Campo>
            <Campo label="Apellido" error={form.formState.errors.apellido?.message}>
              <input {...form.register("apellido")} placeholder="Perez" className={inputClass} />
            </Campo>
          </div>
          <Campo label="Fecha de nacimiento" error={form.formState.errors.fecha_nacimiento?.message}>
            <input {...form.register("fecha_nacimiento")} type="date" className={inputClass} />
          </Campo>
          <Campo label="Email" error={form.formState.errors.email?.message}>
            <input {...form.register("email")} type="email" placeholder="juan@email.com" className={inputClass} />
          </Campo>
          <Campo label="Telefono (opcional)">
            <input {...form.register("telefono")} placeholder="+54 9 11..." className={inputClass} />
          </Campo>
          {errorReserva && (
            <p className="text-red-600 text-sm bg-red-50 rounded p-2">{errorReserva}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50">
              Volver
            </button>
            <button type="submit" disabled={enviando} className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-md disabled:opacity-60">
              {enviando ? "Reservando..." : "Confirmar turno"}
            </button>
          </div>
        </form>
      )}

      {!pacienteEncontrado && !esNuevo && (
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            Volver
          </button>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all";

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
