"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/ui/Logo";

// ── Tipos ─────────────────────────────────────────────────────

interface Usuario {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

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
  especialidad_id: string;
  especialidades: { id: string; nombre: string; color_agenda: string };
}

interface AgendaDia {
  profesional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

interface SistemaConfig {
  bloqueado: boolean;
  mensaje_bloqueo: string;
  bloqueado_at: string | null;
  updated_at: string;
}

const DIAS = ["Dom", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6];
const COLORES_PRESET = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#6366F1"];
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

// ── Helpers ───────────────────────────────────────────────────

function callAdmin(body: object) {
  return supabase.functions.invoke("admin-usuarios", { body })
    .then(({ data, error }) => { if (error) throw error; return data; });
}

function callClinica(body: object) {
  return supabase.functions.invoke("admin-clinica", { body })
    .then(({ data, error }) => { if (error) throw error; return data; });
}

function toEmail(n: string) { return `${n.toLowerCase().replace(/\s+/g,".")}@recepcion.local`; }
function toNombre(e: string) { return e.replace("@recepcion.local","").replace(/\./g," "); }
function formatFecha(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" });
}

// ── UI helpers ────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <span className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-400 text-sm">{icon}</span>
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Msg({ msg }: { msg: { tipo:"ok"|"error"; texto:string } | null }) {
  if (!msg) return null;
  return (
    <div className={`text-xs rounded-xl px-4 py-2.5 ${msg.tipo==="ok" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
      {msg.tipo==="ok" ? "✓ " : "✗ "}{msg.texto}
    </div>
  );
}

// ── PIN ───────────────────────────────────────────────────────

function PantallaPin({ pin, setPin, onSubmit, error }: { pin:string; setPin:(v:string)=>void; onSubmit:(e:React.FormEvent)=>void; error:boolean }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className={`bg-gray-900 border rounded-2xl p-8 transition-all ${error ? "border-red-500 animate-pulse" : "border-white/10"}`}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-lg">Área restringida</h1>
            <p className="text-gray-500 text-xs mt-1">Solo para administradores</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="password" value={pin} onChange={(e)=>setPin(e.target.value)} placeholder="Contraseña de admin" autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center tracking-widest" />
            {error && <p className="text-red-400 text-xs text-center">Contraseña incorrecta</p>}
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all">Ingresar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [visible, setVisible] = useState(false);
  const [nombre, setNombre] = useState(""); const [pass, setPass] = useState("");
  const [creando, setCreando] = useState(false);
  const [msg, setMsg] = useState<{ tipo:"ok"|"error"; texto:string }|null>(null);
  const [eliminando, setEliminando] = useState<string|null>(null);

  async function cargar() {
    setCargando(true);
    try { const d = await callAdmin({ admin_secret:ADMIN_SECRET, accion:"listar" }); setUsuarios(d.usuarios??[]); setVisible(true); }
    finally { setCargando(false); }
  }

  async function crear(e:React.FormEvent) {
    e.preventDefault(); setCreando(true); setMsg(null);
    try {
      await callAdmin({ admin_secret:ADMIN_SECRET, accion:"crear", email:toEmail(nombre), password:pass });
      setMsg({ tipo:"ok", texto:`Usuario "${nombre}" creado.` }); setNombre(""); setPass("");
      if (visible) cargar();
    } catch(e:unknown) { setMsg({ tipo:"error", texto:String(e) }); }
    finally { setCreando(false); }
  }

  async function eliminar(id:string, email:string) {
    if (!confirm(`¿Eliminar a "${toNombre(email)}"?`)) return;
    setEliminando(id);
    try { await callAdmin({ admin_secret:ADMIN_SECRET, accion:"eliminar", user_id:id }); setUsuarios(p=>p.filter(u=>u.id!==id)); }
    catch(e) { alert(String(e)); }
    finally { setEliminando(null); }
  }

  return (
    <div className="space-y-5">
      <Card title="Crear usuario de recepción" icon="+">
        <form onSubmit={crear} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Maria García" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <Msg msg={msg} />
          <button type="submit" disabled={creando} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
            {creando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      </Card>
      <Card title="Usuarios existentes" icon="≡">
        <div className="flex justify-end mb-4">
          <button onClick={cargar} disabled={cargando} className="text-xs text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg transition-all hover:text-brand-300">
            {cargando ? "Cargando..." : visible ? "↺ Actualizar" : "Ver usuarios"}
          </button>
        </div>
        {visible && (
          <div className="space-y-2">
            {usuarios.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">Sin usuarios.</p>
              : usuarios.map(u=>(
                <div key={u.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{toNombre(u.email??'')}</p>
                    <p className="text-gray-500 text-xs">Creado: {formatFecha(u.created_at)} · Último: {formatFecha(u.last_sign_in_at)}</p>
                  </div>
                  <button onClick={()=>eliminar(u.id,u.email!)} disabled={eliminando===u.id}
                    className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                    {eliminando===u.id ? "..." : "Eliminar"}
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Sistema ──────────────────────────────────────────────

function TabSistema() {
  const [sistema, setSistema] = useState<SistemaConfig|null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [msg, setMsg] = useState<{ tipo:"ok"|"error"; texto:string }|null>(null);
  const [confirmandoBloqueo, setConfirmandoBloqueo] = useState(false);

  useEffect(()=>{
    callClinica({ admin_secret:ADMIN_SECRET, accion:"sistema_estado" })
      .then(d=>{ setSistema(d.sistema); setMensaje(d.sistema.mensaje_bloqueo); })
      .then(() => setCargando(false), () => setCargando(false));
  },[]);

  async function toggleBloqueo() {
    if (!sistema) return;
    const nuevoBloqueado = !sistema.bloqueado;
    if (nuevoBloqueado && !confirmandoBloqueo) { setConfirmandoBloqueo(true); return; }
    setGuardando(true); setMsg(null); setConfirmandoBloqueo(false);
    try {
      const d = await callClinica({ admin_secret:ADMIN_SECRET, accion:"sistema_actualizar", bloqueado:nuevoBloqueado, mensaje_bloqueo:mensaje });
      setSistema(d.sistema);
      setMsg({ tipo:"ok", texto: nuevoBloqueado ? "Sistema BLOQUEADO. Los pacientes no pueden reservar." : "Sistema DESBLOQUEADO. Todo funciona normalmente." });
    } catch(e:unknown) { setMsg({ tipo:"error", texto:String(e) }); }
    finally { setGuardando(false); }
  }

  async function guardarMensaje() {
    if (!sistema) return;
    setGuardando(true); setMsg(null);
    try {
      const d = await callClinica({ admin_secret:ADMIN_SECRET, accion:"sistema_actualizar", bloqueado:sistema.bloqueado, mensaje_bloqueo:mensaje });
      setSistema(d.sistema);
      setMsg({ tipo:"ok", texto:"Mensaje actualizado." });
    } catch(e:unknown) { setMsg({ tipo:"error", texto:String(e) }); }
    finally { setGuardando(false); }
  }

  if (cargando) return <p className="text-gray-500 text-sm text-center py-10">Cargando...</p>;
  if (!sistema) return null;

  return (
    <div className="space-y-5">
      {/* Estado actual */}
      <div className={`rounded-2xl border-2 p-6 transition-all ${sistema.bloqueado ? "bg-red-500/10 border-red-500/50" : "bg-green-500/10 border-green-500/30"}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${sistema.bloqueado ? "bg-red-500/20" : "bg-green-500/20"}`}>
              {sistema.bloqueado ? "🔒" : "🟢"}
            </div>
            <div>
              <p className={`text-xl font-black ${sistema.bloqueado ? "text-red-300" : "text-green-300"}`}>
                Sistema {sistema.bloqueado ? "BLOQUEADO" : "ACTIVO"}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {sistema.bloqueado
                  ? `Bloqueado el ${formatFecha(sistema.bloqueado_at)} — los pacientes NO pueden reservar`
                  : "Los pacientes pueden reservar turnos con normalidad"}
              </p>
            </div>
          </div>

          {/* Toggle principal */}
          <button
            onClick={toggleBloqueo}
            disabled={guardando}
            className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-60 ${
              sistema.bloqueado
                ? "bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30"
                : confirmandoBloqueo
                  ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 animate-pulse"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
            }`}
          >
            {guardando ? "..." : sistema.bloqueado ? "✓ Desbloquear sistema" : confirmandoBloqueo ? "¿Confirmar bloqueo?" : "🔒 Bloquear sistema"}
          </button>
        </div>
        {confirmandoBloqueo && !sistema.bloqueado && (
          <div className="mt-3 flex items-center gap-2">
            <p className="text-red-300 text-xs flex-1">⚠ Esto impedirá que cualquier paciente reserve un turno hasta que lo desbloquees.</p>
            <button onClick={()=>setConfirmandoBloqueo(false)} className="text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5">Cancelar</button>
          </div>
        )}
      </div>

      {/* Mensaje de bloqueo */}
      <Card title="Mensaje para pacientes cuando está bloqueado" icon="💬">
        <div className="space-y-3">
          <textarea
            value={mensaje}
            onChange={e=>setMensaje(e.target.value)}
            rows={3}
            placeholder="Ej: El sistema está fuera de servicio por mantenimiento..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <Msg msg={msg} />
          <button onClick={guardarMensaje} disabled={guardando}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
            {guardando ? "Guardando..." : "Guardar mensaje"}
          </button>
        </div>
      </Card>

      {/* Info */}
      <Card title="¿Qué hace el bloqueo?" icon="ℹ">
        <div className="space-y-2 text-xs text-gray-400">
          <p>• Los pacientes que visiten <strong className="text-gray-300">/reservar</strong> verán el mensaje configurado arriba en lugar del formulario.</p>
          <p>• El portal <strong className="text-gray-300">/mis-turnos</strong> sigue funcionando (los pacientes pueden ver y cancelar sus turnos existentes).</p>
          <p>• El <strong className="text-gray-300">panel de recepción</strong> sigue funcionando sin restricciones.</p>
          <p>• El bloqueo es instantáneo. Para reactivar, presioná "Desbloquear sistema".</p>
        </div>
      </Card>

      {/* Última actualización */}
      <p className="text-center text-xs text-gray-700">
        Última actualización de configuración: {formatFecha(sistema.updated_at)}
      </p>
    </div>
  );
}

// ── Gestión compartida: Especialidades ───────────────────────

function GestionEspecialidades({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Especialidad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre:"", duracion_minutos:"30", color_agenda:"#3B82F6" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo:"ok"|"error"; texto:string }|null>(null);
  const [editandoId, setEditandoId] = useState<string|null>(null);
  const [eliminando, setEliminando] = useState<string|null>(null);

  const inp = `w-full border ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;

  useEffect(()=>{ cargar(); },[]);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase.from("especialidades").select("*").order("nombre");
    setLista(data ?? []);
    setCargando(false);
  }

  async function guardar(e:React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null);
    try {
      if (editandoId) {
        const { data } = await supabase.from("especialidades").update({ nombre:form.nombre, duracion_minutos:Number(form.duracion_minutos), color_agenda:form.color_agenda }).eq("id",editandoId).select().single();
        setLista(p=>p.map(x=>x.id===editandoId?data!:x));
        setMsg({ tipo:"ok", texto:"Especialidad actualizada." });
      } else {
        const { data } = await supabase.from("especialidades").insert({ nombre:form.nombre, duracion_minutos:Number(form.duracion_minutos), color_agenda:form.color_agenda }).select().single();
        setLista(p=>[...p, data!]);
        setMsg({ tipo:"ok", texto:"Especialidad creada." });
      }
      setForm({ nombre:"", duracion_minutos:"30", color_agenda:"#3B82F6" }); setEditandoId(null);
    } catch(e:unknown) { setMsg({ tipo:"error", texto:String(e) }); }
    finally { setGuardando(false); }
  }

  async function eliminar(id:string, nombre:string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    setEliminando(id);
    const { error } = await supabase.from("especialidades").delete().eq("id",id);
    if (error) { alert(error.message); } else { setLista(p=>p.filter(x=>x.id!==id)); }
    setEliminando(null);
  }

  return (
    <div className="space-y-5">
      <Card title={editandoId ? "Editar especialidad" : "Nueva especialidad"} icon={editandoId?"✎":"+"}>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Medicina del Trabajo" required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Duración (min)</label>
              <input type="number" value={form.duracion_minutos} onChange={e=>setForm({...form,duracion_minutos:e.target.value})} min="10" max="120" step="5" required className={inp} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_agenda} onChange={e=>setForm({...form,color_agenda:e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                <div className="flex flex-wrap gap-1.5">
                  {COLORES_PRESET.map(c=>(
                    <button key={c} type="button" onClick={()=>setForm({...form,color_agenda:c})}
                      className={`w-5 h-5 rounded-full transition-transform ${form.color_agenda===c?"ring-2 ring-white scale-125":"hover:scale-110"}`}
                      style={{backgroundColor:c}} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Crear especialidad"}
            </button>
            {editandoId && (
              <button type="button" onClick={()=>{ setEditandoId(null); setForm({nombre:"",duracion_minutos:"30",color_agenda:"#3B82F6"}); setMsg(null); }}
                className={`px-4 text-sm border rounded-xl transition-all ${dark?"text-gray-400 border-white/10 hover:bg-white/5":"text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </Card>
      <Card title="Especialidades registradas" icon="⚕">
        {cargando ? <p className={`text-sm text-center py-4 ${dark?"text-gray-500":"text-gray-400"}`}>Cargando...</p>
          : lista.length===0 ? <p className={`text-sm text-center py-4 ${dark?"text-gray-500":"text-gray-400"}`}>Sin especialidades aún.</p>
          : (
            <div className="space-y-2">
              {lista.map(e=>(
                <div key={e.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${dark?"bg-white/5 border-white/5":"bg-gray-50 border-gray-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:e.color_agenda}} />
                    <div>
                      <p className={`text-sm font-semibold ${dark?"text-white":"text-gray-900"}`}>{e.nombre}</p>
                      <p className={`text-xs ${dark?"text-gray-500":"text-gray-400"}`}>{e.duracion_minutos} min</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{ setEditandoId(e.id); setForm({nombre:e.nombre,duracion_minutos:String(e.duracion_minutos),color_agenda:e.color_agenda}); setMsg(null); }}
                      className="text-xs text-brand-400 border border-brand-500/20 hover:border-brand-500/50 px-3 py-1.5 rounded-lg transition-all">Editar</button>
                    <button onClick={()=>eliminar(e.id,e.nombre)} disabled={eliminando===e.id}
                      className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {eliminando===e.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

// ── Gestión compartida: Profesionales ────────────────────────

function GestionProfesionales({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Profesional[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre:"", apellido:"", matricula:"", especialidad_id:"" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo:"ok"|"error"; texto:string }|null>(null);
  const [editandoId, setEditandoId] = useState<string|null>(null);
  const [eliminando, setEliminando] = useState<string|null>(null);

  const inp = `w-full border ${dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const sel = `w-full border ${dark ? "bg-gray-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;

  useEffect(()=>{ cargar(); },[]);

  async function cargar() {
    setCargando(true);
    const [{ data: profs }, { data: esps }] = await Promise.all([
      supabase.from("profesionales").select("*, especialidades(id,nombre,color_agenda)").order("apellido"),
      supabase.from("especialidades").select("*").order("nombre"),
    ]);
    setLista((profs as unknown as Profesional[]) ?? []);
    setEspecialidades(esps ?? []);
    if (esps && esps.length > 0) setForm(f=>f.especialidad_id ? f : { ...f, especialidad_id:esps[0].id });
    setCargando(false);
  }

  async function guardar(e:React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null);
    try {
      if (editandoId) {
        const { data } = await supabase.from("profesionales").update({ nombre:form.nombre, apellido:form.apellido, matricula:form.matricula, especialidad_id:form.especialidad_id }).eq("id",editandoId).select("*, especialidades(id,nombre,color_agenda)").single();
        setLista(p=>p.map(x=>x.id===editandoId?(data as unknown as Profesional):x));
        setMsg({ tipo:"ok", texto:"Profesional actualizado." });
      } else {
        const { data } = await supabase.from("profesionales").insert({ nombre:form.nombre, apellido:form.apellido, matricula:form.matricula, especialidad_id:form.especialidad_id }).select("*, especialidades(id,nombre,color_agenda)").single();
        setLista(p=>[...p, data as unknown as Profesional]);
        setMsg({ tipo:"ok", texto:"Profesional creado." });
      }
      setForm({ nombre:"", apellido:"", matricula:"", especialidad_id:especialidades[0]?.id??"" }); setEditandoId(null);
    } catch(e:unknown) { setMsg({ tipo:"error", texto:String(e) }); }
    finally { setGuardando(false); }
  }

  async function eliminar(id:string, nombre:string) {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    setEliminando(id);
    await supabase.from("agendas_disponibilidad").delete().eq("profesional_id",id);
    const { error } = await supabase.from("profesionales").delete().eq("id",id);
    if (error) alert(error.message); else setLista(p=>p.filter(x=>x.id!==id));
    setEliminando(null);
  }

  if (especialidades.length===0 && !cargando) {
    return <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center"><p className="text-gray-400 text-sm">Primero creá al menos una especialidad.</p></div>;
  }

  return (
    <div className="space-y-5">
      <Card title={editandoId ? "Editar profesional" : "Nuevo profesional"} icon={editandoId?"✎":"+"}>
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Nombre</label><input type="text" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej: Carlos" required className={inp} /></div>
            <div><label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Apellido</label><input type="text" value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})} placeholder="Ej: García" required className={inp} /></div>
            <div><label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Matrícula</label><input type="text" value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value})} placeholder="M.N. 12345" required className={inp} /></div>
            <div>
              <label className={`text-xs mb-1 block ${dark?"text-gray-400":"text-gray-600"}`}>Especialidad</label>
              <select value={form.especialidad_id} onChange={e=>setForm({...form,especialidad_id:e.target.value})} required className={sel}>
                {especialidades.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Crear profesional"}
            </button>
            {editandoId && (
              <button type="button" onClick={()=>{ setEditandoId(null); setForm({nombre:"",apellido:"",matricula:"",especialidad_id:especialidades[0]?.id??""}); setMsg(null); }}
                className={`px-4 text-sm border rounded-xl transition-all ${dark?"text-gray-400 border-white/10 hover:bg-white/5":"text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </Card>
      <Card title="Profesionales registrados" icon="👤">
        {cargando ? <p className="text-gray-500 text-sm text-center py-4">Cargando...</p>
          : lista.length===0 ? <p className="text-gray-500 text-sm text-center py-4">Sin profesionales aún.</p>
          : (
            <div className="space-y-2">
              {lista.map(p=>(
                <div key={p.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${dark?"bg-white/5 border-white/5":"bg-gray-50 border-gray-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{backgroundColor:p.especialidades?.color_agenda??"#6B7280"}}>
                      {p.nombre[0]}{p.apellido[0]}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${dark?"text-white":"text-gray-900"}`}>Dr/a. {p.nombre} {p.apellido}</p>
                      <p className={`text-xs ${dark?"text-gray-400":"text-gray-500"}`}>{p.especialidades?.nombre} · {p.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{ setEditandoId(p.id); setForm({nombre:p.nombre,apellido:p.apellido,matricula:p.matricula,especialidad_id:p.especialidad_id}); setMsg(null); }}
                      className="text-xs text-brand-400 border border-brand-500/20 hover:border-brand-500/50 px-3 py-1.5 rounded-lg transition-all">Editar</button>
                    <button onClick={()=>eliminar(p.id,`${p.nombre} ${p.apellido}`)} disabled={eliminando===p.id}
                      className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {eliminando===p.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

// ── Gestión compartida: Agendas ───────────────────────────────

function GestionAgendas({ dark = true }: { dark?: boolean }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profId, setProfId] = useState("");
  const [dias, setDias] = useState<AgendaDia[]>(
    DIAS_SEMANA.map(d=>({ profesional_id:"", dia_semana:d, hora_inicio:"08:00", hora_fin:"17:00", activo:false }))
  );
  const [cargandoProfs, setCargandoProfs] = useState(false);
  const [cargandoAgenda, setCargandoAgenda] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo:"ok"|"error"; texto:string }|null>(null);

  const sel = `w-full border ${dark ? "bg-gray-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`;
  const tInp = `border ${dark ? "bg-gray-800 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500`;

  useEffect(()=>{
    setCargandoProfs(true);
    supabase.from("profesionales").select("*, especialidades(id,nombre,color_agenda)").order("apellido")
      .then(({ data })=>{ const p=(data as unknown as Profesional[])??[]; setProfesionales(p); if(p.length>0) setProfId(p[0].id); })
      .then(() => setCargandoProfs(false), () => setCargandoProfs(false));
  },[]);

  useEffect(()=>{ if(profId) cargarAgenda(profId); },[profId]);

  async function cargarAgenda(pid:string) {
    setCargandoAgenda(true);
    const { data } = await supabase.from("agendas_disponibilidad").select("*").eq("profesional_id",pid).order("dia_semana");
    const agendas:(AgendaDia[])=data??[];
    setDias(DIAS_SEMANA.map(d=>{
      const ex=agendas.find(a=>a.dia_semana===d);
      return ex??{ profesional_id:pid, dia_semana:d, hora_inicio:"08:00", hora_fin:"17:00", activo:false };
    }));
    setCargandoAgenda(false);
  }

  function updateDia(dia:number, campo:Partial<AgendaDia>) {
    setDias(p=>p.map(d=>d.dia_semana===dia?{...d,...campo}:d));
  }

  async function guardar() {
    setGuardando(true); setMsg(null);
    const rows = dias.map(({ dia_semana, hora_inicio, hora_fin, activo })=>({
      profesional_id:profId, dia_semana, hora_inicio, hora_fin, activo
    }));
    const { error } = await supabase.from("agendas_disponibilidad").upsert(rows,{ onConflict:"profesional_id,dia_semana" });
    if (error) setMsg({ tipo:"error", texto:error.message });
    else setMsg({ tipo:"ok", texto:"Agenda guardada." });
    setGuardando(false);
  }

  if (cargandoProfs) return <p className="text-gray-500 text-sm text-center py-8">Cargando...</p>;
  if (profesionales.length===0) return <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center"><p className="text-gray-400 text-sm">Primero creá al menos un profesional.</p></div>;

  const prof=profesionales.find(p=>p.id===profId);

  return (
    <div className="space-y-5">
      <Card title="Horarios de atención por profesional" icon="📅">
        <div className="mb-5">
          <label className={`text-xs mb-2 block ${dark?"text-gray-400":"text-gray-600"}`}>Profesional</label>
          <select value={profId} onChange={e=>setProfId(e.target.value)} className={sel}>
            {profesionales.map(p=><option key={p.id} value={p.id}>Dr/a. {p.nombre} {p.apellido} — {p.especialidades?.nombre}</option>)}
          </select>
        </div>

        {cargandoAgenda ? <p className="text-gray-500 text-sm text-center py-4">Cargando agenda...</p> : (
          <>
            <p className={`text-xs uppercase tracking-wider font-bold mb-3 ${dark?"text-gray-500":"text-gray-400"}`}>Días y horarios</p>
            <div className="space-y-2">
              {dias.map(dia=>(
                <div key={dia.dia_semana}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                    dia.activo
                      ? dark ? "bg-brand-500/10 border-brand-500/30" : "bg-brand-50 border-brand-200"
                      : dark ? "bg-white/3 border-white/5 opacity-60" : "bg-gray-50 border-gray-100 opacity-70"
                  }`}>
                  <button type="button" onClick={()=>updateDia(dia.dia_semana,{activo:!dia.activo})}
                    className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${dia.activo?"bg-brand-500":"bg-gray-600"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${dia.activo?"left-5":"left-0.5"}`} />
                  </button>
                  <span className={`w-24 text-sm font-semibold ${dia.activo ? dark?"text-white":"text-gray-900" : dark?"text-gray-500":"text-gray-400"}`}>
                    {DIAS[dia.dia_semana]}
                  </span>
                  {dia.activo ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={dia.hora_inicio} onChange={e=>updateDia(dia.dia_semana,{hora_inicio:e.target.value})} className={tInp} />
                      <span className={`text-xs ${dark?"text-gray-500":"text-gray-400"}`}>a</span>
                      <input type="time" value={dia.hora_fin} onChange={e=>updateDia(dia.dia_semana,{hora_fin:e.target.value})} className={tInp} />
                    </div>
                  ) : <span className={`text-xs ${dark?"text-gray-600":"text-gray-400"}`}>No atiende</span>}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <Msg msg={msg} />
              <button onClick={guardar} disabled={guardando}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 text-sm">
                {guardando ? "Guardando..." : `Guardar agenda de Dr/a. ${prof?.apellido}`}
              </button>
            </div>
          </>
        )}
      </Card>
      <div className={`border rounded-xl px-4 py-3 text-xs ${dark?"bg-blue-500/10 border-blue-500/20 text-blue-300":"bg-blue-50 border-blue-200 text-blue-700"}`}>
        <strong>Tip:</strong> Los horarios definidos acá generan los slots disponibles en el formulario de reserva.
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────

type Tab = "sistema" | "usuarios" | "especialidades" | "profesionales" | "agendas";

const TABS: { id:Tab; label:string; icon:string }[] = [
  { id:"sistema",        label:"Sistema",        icon:"🔒" },
  { id:"usuarios",       label:"Usuarios",        icon:"👤" },
  { id:"especialidades", label:"Especialidades",  icon:"⚕️" },
  { id:"profesionales",  label:"Profesionales",   icon:"🩺" },
  { id:"agendas",        label:"Agendas",         icon:"📅" },
];

function PanelAdmin() {
  const [tab, setTab] = useState<Tab>("sistema");

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h1 className="text-white font-black text-xl">Administración</h1>
            <p className="text-gray-500 text-xs">SM Medicina Laboral · Control total del sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-gray-900 border border-white/10 rounded-2xl p-1.5">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-bold py-2.5 rounded-xl transition-all ${
                tab===t.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "text-gray-500 hover:text-gray-300"
              }`}>
              <span className="text-base">{t.icon}</span>
              <span className="hidden sm:block text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>

        {tab==="sistema"        && <TabSistema />}
        {tab==="usuarios"       && <TabUsuarios />}
        {tab==="especialidades" && <GestionEspecialidades dark={true} />}
        {tab==="profesionales"  && <GestionProfesionales dark={true} />}
        {tab==="agendas"        && <GestionAgendas dark={true} />}

        <p className="text-center text-xs text-gray-700">Esta página no está linkeada. Guardá la URL.</p>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [errorPin, setErrorPin] = useState(false);

  function verificarPin(e:React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_SECRET) { setAutorizado(true); }
    else { setErrorPin(true); setPin(""); setTimeout(()=>setErrorPin(false),2000); }
  }

  if (!autorizado) return <PantallaPin pin={pin} setPin={setPin} onSubmit={verificarPin} error={errorPin} />;
  return <PanelAdmin />;
}
