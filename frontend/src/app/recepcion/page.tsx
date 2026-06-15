"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTurnosRealtime } from "@/hooks/useTurnosRealtime";
import TurnoCard from "@/components/recepcion/TurnoCard";
import ProximosTurnosSidebar from "@/components/recepcion/ProximosTurnosSidebar";
import type { EstadoTurno } from "@/types/recepcion";
import { GestionEspecialidades, GestionProfesionales, GestionAgendas, GestionObrasSociales } from "@/components/admin/gestion";

function hoy(): string { return new Date().toISOString().slice(0, 10); }

function formatFechaTitulo(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  const esHoy = fecha === hoy();
  return d.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" }) + (esHoy ? " — hoy" : "");
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const FILTROS_ESTADO: { label:string; valor:EstadoTurno|"todos"; color:string }[] = [
  { label:"Todos",       valor:"todos",      color:"bg-white/10 text-white border-white/20" },
  { label:"Pendientes",  valor:"pendiente",  color:"bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { label:"Confirmados", valor:"confirmado", color:"bg-green-500/20 text-green-300 border-green-500/30" },
  { label:"Completados", valor:"completado", color:"bg-brand-500/20 text-brand-300 border-brand-500/30" },
  { label:"No asistio",  valor:"no_asistio", color:"bg-gray-500/20 text-gray-400 border-gray-500/30" },
];

type ConfigTab = "especialidades" | "profesionales" | "agendas" | "obras_sociales";

const CONFIG_TABS: { id:ConfigTab; label:string; icon:string }[] = [
  { id:"especialidades",  label:"Especialidades", icon:"⚕️" },
  { id:"profesionales",   label:"Profesionales",  icon:"🩺" },
  { id:"agendas",         label:"Agendas",        icon:"📅" },
  { id:"obras_sociales",  label:"Obras sociales", icon:"🏥" },
];

function VistaConfiguracion() {
  const [tab, setTab] = useState<ConfigTab>("especialidades");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5">
        {CONFIG_TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center justify-center gap-1 text-xs font-bold py-2.5 rounded-xl transition-all ${
              tab===t.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "text-gray-400 hover:text-gray-200"
            }`}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline truncate">{t.label}</span>
          </button>
        ))}
      </div>
      {tab==="especialidades" && <GestionEspecialidades dark={true} />}
      {tab==="profesionales"  && <GestionProfesionales dark={true} />}
      {tab==="agendas"        && <GestionAgendas dark={true} />}
      {tab==="obras_sociales" && <GestionObrasSociales dark={true} />}
    </div>
  );
}

interface RowReporte {
  id: string;
  fecha_inicio: string;
  estado: string;
  obras_sociales: { nombre: string; copago_monto: number } | null;
  copago_abonado: boolean;
  pacientes: { nombre: string; apellido: string; dni: string };
  profesionales: { nombre: string; apellido: string };
  especialidades: { nombre: string };
}

function VistaReporte() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<RowReporte[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setCargando(true);
    const inicio = `${mes}-01T00:00:00`;
    const fin    = `${mes}-31T23:59:59`;
    supabase
      .from("turnos")
      .select(`id, fecha_inicio, estado, copago_abonado,
        obras_sociales ( nombre, copago_monto ),
        pacientes ( nombre, apellido, dni ),
        profesionales ( nombre, apellido ),
        especialidades ( nombre )`)
      .gte("fecha_inicio", inicio)
      .lte("fecha_inicio", fin)
      .in("estado", ["completado", "no_asistio", "confirmado"])
      .order("fecha_inicio")
      .then(({ data }) => { setRows((data as unknown as RowReporte[]) ?? []); setCargando(false); });
  }, [mes]);

  const stats = {
    total:            rows.length,
    obraSocial:       rows.filter(r => r.obras_sociales !== null).length,
    particular:       rows.filter(r => r.obras_sociales === null).length,
    copagoPendiente:  rows.filter(r => r.obras_sociales && r.obras_sociales.copago_monto > 0 && !r.copago_abonado).length,
    copagoTotal:      rows.reduce((a, r) => a + (r.obras_sociales?.copago_monto ?? 0), 0),
    copagoAbonado:    rows.filter(r => r.copago_abonado).reduce((a, r) => a + (r.obras_sociales?.copago_monto ?? 0), 0),
  };

  const porOS: Record<string, { count: number; copago: number }> = {};
  rows.forEach(r => {
    const key = r.obras_sociales?.nombre ?? "Particular";
    if (!porOS[key]) porOS[key] = { count: 0, copago: 0 };
    porOS[key].count++;
    porOS[key].copago += r.obras_sociales?.copago_monto ?? 0;
  });

  async function toggleCopago(id: string, actual: boolean) {
    await supabase.from("turnos").update({ copago_abonado: !actual }).eq("id", id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, copago_abonado: !actual } : r));
  }

  const sc = "rounded-2xl border border-white/10 bg-white/5 p-4 text-center";
  const td = "px-3 py-2.5 text-xs text-gray-300";
  const th = "px-3 py-2.5 text-xs font-semibold text-gray-400 text-left uppercase tracking-wide";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Mes</label>
        <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-400 [color-scheme:dark]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={sc}><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-xs text-gray-400 mt-0.5">Turnos atendidos</p></div>
        <div className={sc}><p className="text-2xl font-bold text-blue-300">{stats.obraSocial}</p><p className="text-xs text-gray-400 mt-0.5">Obra social</p></div>
        <div className={sc}><p className="text-2xl font-bold text-amber-300">{stats.particular}</p><p className="text-xs text-gray-400 mt-0.5">Particulares</p></div>
        <div className={sc}><p className="text-2xl font-bold text-green-300">$ {stats.copagoAbonado.toLocaleString("es-AR")}</p><p className="text-xs text-gray-400 mt-0.5">Copago cobrado</p></div>
        <div className={sc}><p className="text-2xl font-bold text-red-300">{stats.copagoPendiente}</p><p className="text-xs text-gray-400 mt-0.5">Copagos pendientes</p></div>
        <div className={sc}><p className="text-2xl font-bold text-gray-300">$ {stats.copagoTotal.toLocaleString("es-AR")}</p><p className="text-xs text-gray-400 mt-0.5">Total copagos</p></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10"><p className="text-sm font-bold text-white">Resumen por cobertura</p></div>
        <div className="divide-y divide-white/5">
          {Object.entries(porOS).sort((a,b)=>b[1].count-a[1].count).map(([nombre, { count, copago }]) => (
            <div key={nombre} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-gray-200 font-medium">{nombre}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-xs">{count} paciente{count !== 1 ? "s" : ""}</span>
                {copago > 0 && <span className="text-green-400 text-xs font-semibold">$ {copago.toLocaleString("es-AR")}</span>}
              </div>
            </div>
          ))}
          {Object.keys(porOS).length === 0 && !cargando && (
            <p className="text-sm text-gray-500 text-center py-6">Sin turnos en este mes.</p>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10"><p className="text-sm font-bold text-white">Detalle de pacientes</p></div>
        {cargando ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr><th className={th}>Fecha</th><th className={th}>Paciente</th><th className={th}>Profesional</th><th className={th}>Cobertura</th><th className={th}>Copago</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className={td}>{new Date(r.fecha_inicio).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit" })}</td>
                    <td className={td}>
                      <p className="font-medium text-gray-200">{r.pacientes.apellido}, {r.pacientes.nombre}</p>
                      <p className="text-gray-500 text-[11px]">DNI {r.pacientes.dni}</p>
                    </td>
                    <td className={td}>Dr/a. {r.profesionales.apellido}</td>
                    <td className={td}>
                      {r.obras_sociales
                        ? <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[11px] font-semibold">{r.obras_sociales.nombre}</span>
                        : <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-semibold">Particular</span>}
                    </td>
                    <td className={td}>
                      {r.obras_sociales && r.obras_sociales.copago_monto > 0 ? (
                        <button onClick={() => toggleCopago(r.id, r.copago_abonado)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                            r.copago_abonado
                              ? "bg-green-500/20 text-green-300 border-green-500/30"
                              : "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"}`}>
                          {r.copago_abonado ? "✓" : "✗"} $ {r.obras_sociales.copago_monto.toLocaleString("es-AR")}
                        </button>
                      ) : <span className="text-gray-600 text-[11px]">—</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 text-sm py-8">Sin turnos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DatePicker personalizado (reemplaza input[type=date] nativo) ────────────

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA_LABELS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(value + "T00:00:00"));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  // Primer día del mes (ajustado: lunes = 0)
  const primerDia = (new Date(year, month, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const display = new Date(value + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

  function selectDia(dia: number) {
    const d = new Date(year, month, dia);
    onChange(d.toISOString().slice(0, 10));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-white hover:bg-white/20 transition-all flex items-center gap-1.5"
      >
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {display}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-3 w-60">
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">‹</button>
            <span className="text-xs font-bold text-white">{MESES[month]} {year}</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">›</button>
          </div>

          {/* Headers días */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-500 font-semibold py-0.5">{d}</div>
            ))}
          </div>

          {/* Grilla días */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: primerDia }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const diaStr = new Date(year, month, dia).toISOString().slice(0, 10);
              const isSelected = diaStr === value;
              const isToday = diaStr === todayStr;
              return (
                <button key={dia} type="button" onClick={() => selectDia(dia)}
                  className={`w-full aspect-square flex items-center justify-center text-[11px] rounded-lg transition-all font-medium
                    ${isSelected
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                      : isToday
                        ? "bg-white/10 text-brand-400 ring-1 ring-brand-500/40"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}>
                  {dia}
                </button>
              );
            })}
          </div>

          {/* Ir a hoy */}
          <button type="button" onClick={() => { onChange(todayStr); setOpen(false); }}
            className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold text-brand-400 hover:bg-white/5 transition-all">
            Ir a hoy
          </button>
        </div>
      )}
    </div>
  );
}

type PanelVista = "turnos" | "configuracion" | "reporte";

export default function RecepcionPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [vista, setVista] = useState<PanelVista>("turnos");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/recepcion/login");
      else setAutenticado(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/recepcion/login");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const [fecha, setFecha] = useState(hoy());
  const [filtroEstado, setFiltroEstado] = useState<EstadoTurno | "todos">("todos");
  const [filtroProfesional, setFiltroProfesional] = useState("todos");
  const [buscarDNI, setBuscarDNI] = useState("");

  const { turnos, cargando, refetch } = useTurnosRealtime(fecha);

  const profesionales = useMemo(() => {
    const mapa = new Map<string, string>();
    turnos.forEach(t => { const n = `${t.profesionales.apellido}, ${t.profesionales.nombre}`; mapa.set(n, n); });
    return Array.from(mapa.keys()).sort();
  }, [turnos]);

  const turnosFiltrados = useMemo(() =>
    turnos.filter(t => {
      const pasaEstado = filtroEstado === "todos" || t.estado === filtroEstado;
      const pasaProf = filtroProfesional === "todos" || `${t.profesionales.apellido}, ${t.profesionales.nombre}` === filtroProfesional;
      const pasaDNI = buscarDNI === "" || t.pacientes.dni.includes(buscarDNI);
      return pasaEstado && pasaProf && pasaDNI;
    }), [turnos, filtroEstado, filtroProfesional, buscarDNI]);

  const contadores = useMemo(() => ({
    total:       turnos.length,
    pendientes:  turnos.filter(t => t.estado === "pendiente").length,
    confirmados: turnos.filter(t => t.estado === "confirmado").length,
    completados: turnos.filter(t => t.estado === "completado").length,
  }), [turnos]);

  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/" title="Volver al inicio" className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0 hover:bg-brand-400 transition-colors">
              <span className="text-sm font-black text-white tracking-tight">SM</span>
            </Link>
            <div className="w-px h-6 bg-white/20" />
            <div>
              <h1 className="font-bold text-white text-sm">Panel de Recepcion</h1>
              <p className="text-xs text-gray-400 capitalize">
                {vista === "turnos" ? formatFechaTitulo(fecha) : vista === "reporte" ? "Reporte mensual" : "Configuracion del consultorio"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
              <button onClick={() => setVista("turnos")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vista === "turnos" ? "bg-brand-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Turnos
              </button>
              <button onClick={() => setVista("reporte")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vista === "reporte" ? "bg-brand-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reporte
              </button>
              <button onClick={() => setVista("configuracion")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vista === "configuracion" ? "bg-brand-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Config
              </button>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
            {vista === "turnos" && (
              <div className="flex items-center gap-1">
                <button onClick={()=>setFecha(sumarDias(fecha,-1))} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all">‹</button>
                <button onClick={()=>setFecha(hoy())} className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-white transition-all">Hoy</button>
                <DatePicker value={fecha} onChange={setFecha} />
                <button onClick={()=>setFecha(sumarDias(fecha,1))} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all">›</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {vista === "reporte" && (
          <div className="max-w-4xl mx-auto"><VistaReporte /></div>
        )}
        {vista === "configuracion" && (
          <div className="max-w-2xl mx-auto"><VistaConfiguracion /></div>
        )}
        {vista === "turnos" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label:"Total",       valor:contadores.total,       color:"from-white/10 to-white/5",           text:"text-white"       },
                  { label:"Pendientes",  valor:contadores.pendientes,  color:"from-yellow-500/20 to-yellow-500/5", text:"text-yellow-300"  },
                  { label:"Confirmados", valor:contadores.confirmados, color:"from-green-500/20 to-green-500/5",   text:"text-green-300"   },
                  { label:"Completados", valor:contadores.completados, color:"from-brand-500/20 to-brand-500/5",   text:"text-brand-300"   },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${c.color} p-4`}>
                    <p className={`text-2xl font-bold ${c.text}`}>{c.valor}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Buscador rápido por DNI */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={buscarDNI}
                    onChange={e => setBuscarDNI(e.target.value.replace(/\D/g, ""))}
                    placeholder="Buscar por DNI..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
                  />
                  {buscarDNI && (
                    <button onClick={() => setBuscarDNI("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
                  )}
                </div>
                {FILTROS_ESTADO.map(f => (
                  <button key={f.valor} onClick={()=>setFiltroEstado(f.valor)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${filtroEstado===f.valor ? f.color+" ring-2 ring-white/20" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"}`}>
                    {f.label}
                  </button>
                ))}
                {profesionales.length > 1 && (
                  <select value={filtroProfesional} onChange={e=>setFiltroProfesional(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]">
                    <option value="todos">Todos los profesionales</option>
                    {profesionales.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                <button onClick={refetch} className="ml-auto px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                  Actualizar
                </button>
              </div>

              {cargando ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : turnosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-4xl mb-3">📅</p>
                  <p className="font-semibold text-gray-400">Sin turnos para este filtro</p>
                  <p className="text-sm mt-1">Proba con otro estado o fecha.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {turnosFiltrados.map(t => (
                    <TurnoCard key={t.id} turno={t} onActualizado={refetch} />
                  ))}
                </div>
              )}
            </div>
            <div className="hidden lg:block w-72 flex-shrink-0">
              <ProximosTurnosSidebar onFechaClick={setFecha} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
