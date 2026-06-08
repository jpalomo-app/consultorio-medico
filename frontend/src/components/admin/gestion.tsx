"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Especialidad {
  id: string;
  nombre: string;
  duracion_minutos: number;
  color_agenda: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  matricula: string;
  especialidad_id: string;
  especialidades: { id: string; nombre: string; color_agenda: string };
}

export interface AgendaDia {
  profesional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface ObraSocial {
  id: string;
  nombre: string;
  copago_monto: number;
  activa: boolean;
}

const DIAS = ["Dom","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6];
const COLORES_PRESET = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
];

function CardDark({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden border-white/10 bg-gray-900">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <span className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-400 text-sm">{icon}</span>
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CardLight({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden border-gray-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-500 text-sm">{icon}</span>
        <h2 className="text-gray-800 font-bold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Msg({ msg }: { msg: { tipo: "ok" | "error"; texto: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`text-xs rounded-xl px-4 py-2.5 ${msg.tipo === "ok" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
      {msg.texto}
    </div>
  );
}

// ─── GestionEspecialidades ───────────────────────────────────────────────────

export function GestionEspecialidades({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Especialidad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", duracion_minutos: "30", color_agenda: "#3B82F6" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const inp = `w-full border ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const C = dark ? CardDark : CardLight;
  const txt = dark ? "text-gray-400" : "text-gray-600";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("especialidades").select("*").order("nombre");
    setLista(data ?? []);
    setCargando(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null);
    try {
      if (editandoId) {
        const { data } = await supabase.from("especialidades").update({ nombre: form.nombre, duracion_minutos: Number(form.duracion_minutos), color_agenda: form.color_agenda }).eq("id", editandoId).select().single();
        setLista(p => p.map(x => x.id === editandoId ? data! : x));
        setMsg({ tipo: "ok", texto: "Especialidad actualizada." });
      } else {
        const { data } = await supabase.from("especialidades").insert({ nombre: form.nombre, duracion_minutos: Number(form.duracion_minutos), color_agenda: form.color_agenda }).select().single();
        setLista(p => [...p, data!]);
        setMsg({ tipo: "ok", texto: "Especialidad creada." });
      }
      setForm({ nombre: "", duracion_minutos: "30", color_agenda: "#3B82F6" }); setEditandoId(null);
    } catch (e: unknown) { setMsg({ tipo: "error", texto: String(e) }); }
    finally { setGuardando(false); }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`Eliminar "${nombre}"?`)) return;
    setEliminando(id);
    const { error } = await supabase.from("especialidades").delete().eq("id", id);
    if (error) alert(error.message); else setLista(p => p.filter(x => x.id !== id));
    setEliminando(null);
  }

  return (
    <div className="space-y-5">
      <C title="Especialidades activas" icon={<span>🩺</span>}>
        {cargando ? (
          <p className={`text-xs ${txt}`}>Cargando...</p>
        ) : lista.length === 0 ? (
          <p className={`text-xs ${txt}`}>No hay especialidades. Crea la primera.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map(esp => (
              <li key={esp.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${dark ? "bg-white/5" : "bg-gray-50"}`}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: esp.color_agenda }} />
                <span className={`flex-1 text-sm font-medium ${dark ? "text-white" : "text-gray-800"}`}>{esp.nombre}</span>
                <span className={`text-xs ${txt}`}>{esp.duracion_minutos} min</span>
                <button onClick={() => { setEditandoId(esp.id); setForm({ nombre: esp.nombre, duracion_minutos: String(esp.duracion_minutos), color_agenda: esp.color_agenda }); setMsg(null); }} className="text-xs text-brand-400 hover:text-brand-300">Editar</button>
                <button onClick={() => eliminar(esp.id, esp.nombre)} disabled={eliminando === esp.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Eliminar</button>
              </li>
            ))}
          </ul>
        )}
      </C>
      <C title={editandoId ? "Editar especialidad" : "Nueva especialidad"} icon={<span>{editandoId ? "✏️" : "➕"}</span>}>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`text-xs mb-1 block ${txt}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Medicina del Trabajo" required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Duración (min)</label>
              <input type="number" value={form.duracion_minutos} onChange={e => setForm({ ...form, duracion_minutos: e.target.value })} min="10" max="120" step="5" required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_agenda} onChange={e => setForm({ ...form, color_agenda: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                <div className="flex flex-wrap gap-1.5">
                  {COLORES_PRESET.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color_agenda: c })} className={`w-5 h-5 rounded-full transition-transform ${form.color_agenda === c ? "ring-2 ring-white scale-125" : "hover:scale-110"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            {editandoId && (
              <button type="button" onClick={() => { setEditandoId(null); setForm({ nombre: "", duracion_minutos: "30", color_agenda: "#3B82F6" }); setMsg(null); }} className={`px-4 py-2.5 rounded-xl text-sm border ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardando} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar especialidad"}
            </button>
          </div>
        </form>
      </C>
    </div>
  );
}

// ─── GestionProfesionales ────────────────────────────────────────────────────

export function GestionProfesionales({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Profesional[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", matricula: "", especialidad_id: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const inp = `w-full border ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const C = dark ? CardDark : CardLight;
  const txt = dark ? "text-gray-400" : "text-gray-600";

  useEffect(() => {
    cargar();
    supabase.from("especialidades").select("*").order("nombre").then(({ data }) => setEspecialidades(data ?? []));
  }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("profesionales").select("*, especialidades(id, nombre, color_agenda)").order("apellido");
    setLista(data ?? []);
    setCargando(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null);
    try {
      if (editandoId) {
        await supabase.from("profesionales").update({ nombre: form.nombre, apellido: form.apellido, matricula: form.matricula, especialidad_id: form.especialidad_id }).eq("id", editandoId);
        setMsg({ tipo: "ok", texto: "Profesional actualizado." });
      } else {
        await supabase.from("profesionales").insert({ nombre: form.nombre, apellido: form.apellido, matricula: form.matricula, especialidad_id: form.especialidad_id });
        setMsg({ tipo: "ok", texto: "Profesional agregado." });
      }
      setForm({ nombre: "", apellido: "", matricula: "", especialidad_id: "" }); setEditandoId(null);
      cargar();
    } catch (e: unknown) { setMsg({ tipo: "error", texto: String(e) }); }
    finally { setGuardando(false); }
  }

  return (
    <div className="space-y-5">
      <C title="Profesionales" icon={<span>👨‍⚕️</span>}>
        {cargando ? (
          <p className={`text-xs ${txt}`}>Cargando...</p>
        ) : lista.length === 0 ? (
          <p className={`text-xs ${txt}`}>No hay profesionales registrados.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map(p => (
              <li key={p.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${dark ? "bg-white/5" : "bg-gray-50"}`}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.especialidades?.color_agenda ?? "#6B7280" }} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-800"}`}>Dr/a. {p.apellido}, {p.nombre}</p>
                  <p className={`text-xs truncate ${txt}`}>{p.especialidades?.nombre} · Mat. {p.matricula}</p>
                </div>
                <button onClick={() => { setEditandoId(p.id); setForm({ nombre: p.nombre, apellido: p.apellido, matricula: p.matricula, especialidad_id: p.especialidad_id }); setMsg(null); }} className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">Editar</button>
              </li>
            ))}
          </ul>
        )}
      </C>
      <C title={editandoId ? "Editar profesional" : "Nuevo profesional"} icon={<span>{editandoId ? "✏️" : "➕"}</span>}>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Apellido</label>
              <input type="text" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Matrícula</label>
              <input type="text" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${txt}`}>Especialidad</label>
              <select value={form.especialidad_id} onChange={e => setForm({ ...form, especialidad_id: e.target.value })} required className={inp}>
                <option value="">Seleccionar...</option>
                {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            {editandoId && (
              <button type="button" onClick={() => { setEditandoId(null); setForm({ nombre: "", apellido: "", matricula: "", especialidad_id: "" }); setMsg(null); }} className={`px-4 py-2.5 rounded-xl text-sm border ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardando} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar profesional"}
            </button>
          </div>
        </form>
      </C>
    </div>
  );
}

// ─── GestionAgendas ──────────────────────────────────────────────────────────

export function GestionAgendas({ dark = true }: { dark?: boolean }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profSeleccionado, setProfSeleccionado] = useState<string>("");
  const [agendas, setAgendas] = useState<AgendaDia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const inp = `border ${dark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const C = dark ? CardDark : CardLight;
  const txt = dark ? "text-gray-400" : "text-gray-600";

  useEffect(() => {
    supabase.from("profesionales").select("*, especialidades(id, nombre, color_agenda)").order("apellido")
      .then(({ data }) => setProfesionales(data ?? []));
  }, []);

  useEffect(() => {
    if (!profSeleccionado) { setAgendas([]); return; }
    setCargando(true);
    supabase.from("agendas_disponibilidad").select("*").eq("profesional_id", profSeleccionado)
      .then(({ data }) => {
        const base = DIAS_SEMANA.map(d => {
          const existing = (data ?? []).find(a => a.dia_semana === d);
          return existing ?? { profesional_id: profSeleccionado, dia_semana: d, hora_inicio: "08:00", hora_fin: "17:00", activo: false };
        });
        setAgendas(base);
        setCargando(false);
      });
  }, [profSeleccionado]);

  async function guardarAgendas() {
    if (!profSeleccionado) return;
    setGuardando(true); setMsg(null);
    try {
      for (const a of agendas) {
        await supabase.from("agendas_disponibilidad").upsert({ profesional_id: profSeleccionado, dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fin: a.hora_fin, activo: a.activo }, { onConflict: "profesional_id,dia_semana" });
      }
      setMsg({ tipo: "ok", texto: "Agenda guardada correctamente." });
    } catch (e: unknown) { setMsg({ tipo: "error", texto: String(e) }); }
    finally { setGuardando(false); }
  }

  function updateDia(idx: number, field: keyof AgendaDia, value: string | boolean) {
    setAgendas(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }

  return (
    <div className="space-y-5">
      <C title="Seleccionar profesional" icon={<span>📅</span>}>
        <select value={profSeleccionado} onChange={e => setProfSeleccionado(e.target.value)} className={`w-full ${inp}`}>
          <option value="">Seleccionar profesional...</option>
          {profesionales.map(p => <option key={p.id} value={p.id}>Dr/a. {p.apellido}, {p.nombre} — {p.especialidades?.nombre}</option>)}
        </select>
      </C>
      {profSeleccionado && (
        <C title="Horarios por día" icon={<span>🕐</span>}>
          {cargando ? (
            <p className={`text-xs ${txt}`}>Cargando agenda...</p>
          ) : (
            <div className="space-y-3">
              {agendas.map((a, idx) => (
                <div key={a.dia_semana} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${dark ? "bg-white/5" : "bg-gray-50"}`}>
                  <input type="checkbox" checked={a.activo} onChange={e => updateDia(idx, "activo", e.target.checked)} className="w-4 h-4 accent-brand-500" />
                  <span className={`w-20 text-sm font-medium ${dark ? "text-white" : "text-gray-800"}`}>{DIAS[a.dia_semana]}</span>
                  <input type="time" value={a.hora_inicio} onChange={e => updateDia(idx, "hora_inicio", e.target.value)} disabled={!a.activo} className={`${inp} w-28 disabled:opacity-40`} />
                  <span className={`text-xs ${txt}`}>a</span>
                  <input type="time" value={a.hora_fin} onChange={e => updateDia(idx, "hora_fin", e.target.value)} disabled={!a.activo} className={`${inp} w-28 disabled:opacity-40`} />
                </div>
              ))}
              <Msg msg={msg} />
              <button onClick={guardarAgendas} disabled={guardando} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm mt-2">
                {guardando ? "Guardando..." : "Guardar agenda"}
              </button>
            </div>
          )}
        </C>
      )}
    </div>
  );
}

// ─── GestionObrasSociales ────────────────────────────────────────────────────

export function GestionObrasSociales({ dark = false }: { dark?: boolean }) {
  const [lista, setLista] = useState<ObraSocial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", copago_monto: "0" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const inp = `w-full border ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const C = dark ? CardDark : CardLight;
  const txt = dark ? "text-gray-400" : "text-gray-600";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("obras_sociales").select("*").order("nombre");
    setLista(data ?? []);
    setCargando(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null);
    try {
      if (editId) {
        const { data } = await supabase.from("obras_sociales").update({ nombre: form.nombre, copago_monto: Number(form.copago_monto) }).eq("id", editId).select().single();
        setLista(p => p.map(x => x.id === editId ? data! : x));
        setMsg({ tipo: "ok", texto: "Obra social actualizada." });
      } else {
        const { data } = await supabase.from("obras_sociales").insert({ nombre: form.nombre, copago_monto: Number(form.copago_monto), activa: true }).select().single();
        setLista(p => [...p, data!]);
        setMsg({ tipo: "ok", texto: "Obra social agregada." });
      }
      setForm({ nombre: "", copago_monto: "0" }); setEditId(null);
    } catch (e: unknown) { setMsg({ tipo: "error", texto: String(e) }); }
    finally { setGuardando(false); }
  }

  async function toggleActiva(os: ObraSocial) {
    setToggling(os.id);
    const { data } = await supabase.from("obras_sociales").update({ activa: !os.activa }).eq("id", os.id).select().single();
    if (data) setLista(p => p.map(x => x.id === os.id ? data : x));
    setToggling(null);
  }

  return (
    <div className="space-y-5">
      <C title="Obras sociales aceptadas" icon={<span>🏥</span>}>
        {cargando ? (
          <p className={`text-xs ${txt}`}>Cargando...</p>
        ) : lista.length === 0 ? (
          <p className={`text-xs ${txt}`}>No hay obras sociales registradas.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map(os => (
              <li key={os.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${dark ? "bg-white/5" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${os.activa ? "bg-green-500" : "bg-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-800"}`}>{os.nombre}</p>
                  <p className={`text-xs ${txt}`}>{os.copago_monto > 0 ? `Copago $${os.copago_monto.toLocaleString("es-AR")}` : "Sin copago"}</p>
                </div>
                <button onClick={() => { setEditId(os.id); setForm({ nombre: os.nombre, copago_monto: String(os.copago_monto) }); setMsg(null); }} className="text-xs text-brand-500 hover:text-brand-600">Editar</button>
                <button onClick={() => toggleActiva(os)} disabled={toggling === os.id} className={`text-xs font-semibold disabled:opacity-50 ${os.activa ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`}>
                  {toggling === os.id ? "..." : os.activa ? "Desactivar" : "Activar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </C>
      <C title={editId ? "Editar obra social" : "Agregar obra social"} icon={<span>{editId ? "✏️" : "➕"}</span>}>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`text-xs mb-1 block ${txt}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: OSDE" required className={inp} />
            </div>
            <div className="col-span-2">
              <label className={`text-xs mb-1 block ${txt}`}>Copago ($) — 0 si no tiene</label>
              <input type="number" value={form.copago_monto} onChange={e => setForm({ ...form, copago_monto: e.target.value })} min="0" step="50" required className={inp} />
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nombre: "", copago_monto: "0" }); setMsg(null); }} className={`px-4 py-2.5 rounded-xl text-sm border ${dark ? "border-white/10 text-gray-400 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={guardando} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      </C>
    </div>
  );
}
