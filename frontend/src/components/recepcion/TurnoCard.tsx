"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatHora, cn } from "@/lib/utils";
import EstadoBadge from "./EstadoBadge";
import ModalReprogramar from "./ModalReprogramar";
import type { TurnoCompleto } from "@/types/recepcion";

interface Props {
  turno: TurnoCompleto;
  onActualizado: () => void;
}

function buildWAUrl(turno: TurnoCompleto): string {
  const tel = turno.pacientes.telefono?.replace(/\D/g, "") ?? "";
  const fecha = new Date(turno.fecha_inicio).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const hora = new Date(turno.fecha_inicio).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit",
  });
  const msg =
    "Hola " + turno.pacientes.nombre +
    ", le recordamos su turno en SM Medicina Laboral el " + fecha +
    " a las " + hora + " hs. con " +
    turno.profesionales.nombre + " " + turno.profesionales.apellido +
    " (" + turno.especialidades.nombre + "). Hasta pronto!";
  return "https://wa.me/" + tel + "?text=" + encodeURIComponent(msg);
}

export default function TurnoCard({ turno, onActualizado }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [modalReprogramar, setModalReprogramar] = useState(false);

  async function cambiarEstado(nuevoEstado: TurnoCompleto["estado"]) {
    setProcesando(true);
    setErrorAccion(null);
    const { error } = await supabase
      .from("turnos")
      .update({ estado: nuevoEstado })
      .eq("id", turno.id);
    setProcesando(false);
    if (error) { setErrorAccion("No se pudo actualizar. Intenta de nuevo."); return; }
    onActualizado();
  }

  async function cobrarCopago() {
    setProcesando(true);
    setErrorAccion(null);
    const { error } = await supabase
      .from("turnos")
      .update({ copago_abonado: true })
      .eq("id", turno.id);
    setProcesando(false);
    if (error) { setErrorAccion("No se pudo registrar el pago. Intenta de nuevo."); return; }
    onActualizado();
  }

  const colorEsp = turno.especialidades?.color_agenda ?? "#3B82F6";
  const tieneCopagoPendiente =
    (turno.obras_sociales?.copago_monto ?? 0) > 0 && !turno.copago_abonado;

  return (
    <>
      <div
        className={cn(
          "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all",
          turno.estado === "completado" && "opacity-60"
        )}
      >
        <div className="h-1 w-full" style={{ backgroundColor: colorEsp }} />
        <div className="p-4">
          {/* Fila principal */}
          <div className="flex items-start justify-between gap-3">
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-lg font-bold text-gray-800 leading-none">
                {formatHora(turno.fecha_inicio)}
              </p>
              <p className="text-xs text-gray-400">{formatHora(turno.fecha_fin)}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {turno.pacientes.apellido}, {turno.pacientes.nombre}
              </p>
              <p className="text-xs text-gray-500">
                DNI {turno.pacientes.dni}
                {turno.pacientes.obra_social && " · " + turno.pacientes.obra_social}
              </p>
              <p className="text-xs mt-0.5" style={{ color: colorEsp }}>
                {turno.especialidades.nombre} · Dr/a. {turno.profesionales.apellido}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <EstadoBadge estado={turno.estado} />
              <button
                onClick={() => setExpandido(!expandido)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {expandido ? "menos" : "mas"}
              </button>
            </div>
          </div>

          {/* ─── Acciones rápidas (siempre visibles) ─── */}
          {(turno.estado === "pendiente" || turno.estado === "confirmado") && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {turno.estado === "pendiente" && (
                <BtnRapido
                  label="Llegó"
                  icon="✓"
                  color="green"
                  disabled={procesando}
                  onClick={() => cambiarEstado("confirmado")}
                />
              )}
              {turno.estado === "confirmado" && (
                <>
                  <BtnRapido
                    label="Atendido"
                    icon="✓"
                    color="green"
                    disabled={procesando}
                    onClick={() => cambiarEstado("completado")}
                  />
                  <BtnRapido
                    label="No asistió"
                    icon="✕"
                    color="gray"
                    disabled={procesando}
                    onClick={() => cambiarEstado("no_asistio")}
                  />
                  {tieneCopagoPendiente && (
                    <BtnRapido
                      label={"$ " + turno.obras_sociales!.copago_monto.toLocaleString("es-AR")}
                      icon="$"
                      color="blue"
                      disabled={procesando}
                      onClick={cobrarCopago}
                    />
                  )}
                </>
              )}
              {errorAccion && (
                <p className="w-full text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                  {errorAccion}
                </p>
              )}
            </div>
          )}

          {/* ─── Panel expandido: detalles + acciones secundarias ─── */}
          {expandido && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {turno.pacientes.telefono && (
                  <div className="col-span-2 flex items-center gap-2 flex-wrap">
                    <span>Tel: {turno.pacientes.telefono}</span>
                    <a
                      href={buildWAUrl(turno)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
                {/* Cobertura medica */}
                <div className="col-span-2 flex items-center gap-2 flex-wrap">
                  {turno.obras_sociales ? (
                    <>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {turno.obras_sociales.nombre}
                      </span>
                      {turno.obras_sociales.copago_monto > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          turno.copago_abonado
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          Copago ${turno.obras_sociales.copago_monto.toLocaleString("es-AR")} {turno.copago_abonado ? "abonado" : "pendiente"}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Particular
                    </span>
                  )}
                </div>
                {turno.motivo_consulta && (
                  <p className="col-span-2">Motivo: {turno.motivo_consulta}</p>
                )}
                {turno.notas_recepcion && (
                  <p className="col-span-2 text-blue-600">
                    Nota: {turno.notas_recepcion}
                  </p>
                )}
                <p className="capitalize">Origen: {turno.origen}</p>
              </div>

              {/* Acciones secundarias */}
              <div className="flex flex-wrap gap-2">
                {(turno.estado === "pendiente" || turno.estado === "confirmado") && (
                  <>
                    <Btn label="Reprogramar" color="blue" disabled={procesando} onClick={() => setModalReprogramar(true)} />
                    <Btn label="Cancelar" color="red" disabled={procesando} onClick={() => cambiarEstado("cancelado")} />
                  </>
                )}
                {(turno.estado === "completado" || turno.estado === "no_asistio") && (
                  <p className="text-xs text-gray-400 italic">Turno finalizado.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalReprogramar && (
        <ModalReprogramar
          turno={turno}
          onClose={() => setModalReprogramar(false)}
          onReprogramado={onActualizado}
        />
      )}
    </>
  );
}

interface BtnRapidoProps {
  label: string;
  icon: string;
  color: "green" | "blue" | "gray";
  onClick: () => void;
  disabled: boolean;
}

function BtnRapido({ label, icon, color, onClick, disabled }: BtnRapidoProps) {
  const styles: Record<string, string> = {
    green: "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200",
    blue:  "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200",
    gray:  "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
        styles[color]
      )}
    >
      <span className="text-sm leading-none">{icon}</span>
      {label}
    </button>
  );
}

interface BtnProps {
  label: string;
  color: "green" | "blue" | "red" | "gray";
  onClick: () => void;
  disabled: boolean;
}

function Btn({ label, color, onClick, disabled }: BtnProps) {
  const styles: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    blue:  "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    red:   "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    gray:  "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-50",
        styles[color]
      )}
    >
      {label}
    </button>
  );
}
