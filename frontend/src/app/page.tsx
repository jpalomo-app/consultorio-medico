'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ─── Config ───────────────────────────────────────────────────────────────────
// Mover la contraseña a variable de entorno en Vercel: NEXT_PUBLIC_ADMIN_SECRET
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Edge function helpers ────────────────────────────────────────────────────
async function adminClinica(accion: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-clinica', {
    body: { admin_secret: ADMIN_SECRET, accion, ...params },
  })
  if (error) throw error
  return data
}

async function adminUsuarios(accion: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', {
    body: { admin_secret: ADMIN_SECRET, accion, ...params },
  })
  if (error) throw error
  return data
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIAS = ['Dom', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_LAB = [1, 2, 3, 4, 5, 6]
const COLORES = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1']

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Msg = { tipo: 'ok' | 'error'; texto: string } | null

interface Especialidad {
  id: string; nombre: string; duracion_minutos: number; color_agenda: string; activo: boolean
}
interface Profesional {
  id: string; nombre: string; apellido: string; matricula: string
  especialidad_id: string; especialidades: Especialidad | null
}
interface Agenda {
  profesional_id: string; dia_semana: number
  hora_inicio: string; hora_fin: string; activo: boolean
}

// ─── Shared components ────────────────────────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <span className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-400 text-sm">{icon}</span>
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Alert({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <div className={`text-xs rounded-xl px-4 py-2.5 ${msg.tipo === 'ok' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
      {msg.tipo === 'ok' ? '✓ ' : '✗ '}{msg.texto}
    </div>
  )
}

function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: { box: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' }, md: { box: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' }, lg: { box: 'w-20 h-20', text: 'text-4xl', sub: 'text-sm' } }[size]
  return (
    <div className="flex items-center gap-3">
      <div className={`${s.box} bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0`}>
        <span className={`${s.text} font-black text-white tracking-tight`}>SM</span>
      </div>
      <div>
        <p className={`font-black text-gray-900 leading-none ${ size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm'}`}>Medicina Laboral</p>
        <p className={`${s.sub} text-brand-500 font-semibold tracking-wider uppercase`}>Turnos Online</p>
      </div>
    </div>
  )
}

function formatDate(d: string | null) {
  if (!d) return 'Nunca'
  return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nombreFromEmail(email: string) {
  return email.replace('@recepcion.local', '').replace(/\./g, ' ')
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPanel({ pin, setPin, onSubmit, error }: {
  pin: string; setPin: (v: string) => void; onSubmit: (e: React.FormEvent) => void; error: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className={`bg-gray-900 border rounded-2xl p-8 transition-all ${error ? 'border-red-500 animate-pulse' : 'border-white/10'}`}>
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
            <input
              type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="Contraseña de admin" autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center tracking-widest"
            />
            {error && <p className="text-red-400 text-xs text-center">Contraseña incorrecta</p>}
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Sistema ──────────────────────────────────────────────────────────────────
function SistemaPanel() {
  const [sistema, setSistema] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [msg, setMsg] = useState<Msg>(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    adminClinica('sistema_estado').then(d => {
      setSistema(d.sistema); setMensaje(d.sistema.mensaje_bloqueo)
    }).finally(() => setLoading(false))
  }, [])

  async function toggleBloqueo() {
    if (!sistema) return
    const bloqueado = !sistema.bloqueado
    if (bloqueado && !confirmar) { setConfirmar(true); return }
    setGuardando(true); setMsg(null); setConfirmar(false)
    try {
      const d = await adminClinica('sistema_actualizar', { bloqueado, mensaje_bloqueo: mensaje })
      setSistema(d.sistema)
      setMsg({ tipo: 'ok', texto: bloqueado ? 'Sistema BLOQUEADO.' : 'Sistema DESBLOQUEADO.' })
    } catch (e) { setMsg({ tipo: 'error', texto: String(e) }) }
    finally { setGuardando(false) }
  }

  async function guardarMensaje() {
    if (!sistema) return
    setGuardando(true); setMsg(null)
    try {
      const d = await adminClinica('sistema_actualizar', { bloqueado: sistema.bloqueado, mensaje_bloqueo: mensaje })
      setSistema(d.sistema); setMsg({ tipo: 'ok', texto: 'Mensaje actualizado.' })
    } catch (e) { setMsg({ tipo: 'error', texto: String(e) }) }
    finally { setGuardando(false) }
  }

  if (loading) return <p className="text-gray-500 text-sm text-center py-10">Cargando...</p>
  if (!sistema) return null
  const bloqueado = !!sistema.bloqueado

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border-2 p-6 transition-all ${bloqueado ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${bloqueado ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {bloqueado ? '🔒' : '🟢'}
            </div>
            <div>
              <p className={`text-xl font-black ${bloqueado ? 'text-red-300' : 'text-green-300'}`}>
                Sistema {bloqueado ? 'BLOQUEADO' : 'ACTIVO'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {bloqueado ? `Bloqueado el ${formatDate(sistema.bloqueado_at as string)} — los pacientes NO pueden reservar` : 'Los pacientes pueden reservar turnos con normalidad'}
              </p>
            </div>
          </div>
          <button onClick={toggleBloqueo} disabled={guardando}
            className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-60 ${
              bloqueado ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
              : confirmar ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 animate-pulse'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
            }`}>
            {guardando ? '...' : bloqueado ? '✓ Desbloquear sistema' : confirmar ? '¿Confirmar bloqueo?' : '🔒 Bloquear sistema'}
          </button>
        </div>
        {confirmar && !bloqueado && (
          <div className="mt-3 flex items-center gap-2">
            <p className="text-red-300 text-xs flex-1">⚠ Esto impedirá que cualquier paciente reserve un turno hasta que lo desbloquees.</p>
            <button onClick={() => setConfirmar(false)} className="text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5">Cancelar</button>
          </div>
        )}
      </div>

      <Card title="Mensaje para pacientes cuando está bloqueado" icon="💬">
        <div className="space-y-3">
          <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3}
            placeholder="Ej: El sistema está fuera de servicio por mantenimiento..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <Alert msg={msg} />
          <button onClick={guardarMensaje} disabled={guardando}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
            {guardando ? 'Guardando...' : 'Guardar mensaje'}
          </button>
        </div>
      </Card>

      <Card title="¿Qué hace el bloqueo?" icon="ℹ">
        <div className="space-y-2 text-xs text-gray-400">
          <p>• Los pacientes que visiten <strong className="text-gray-300">/reservar</strong> verán el mensaje configurado arriba en lugar del formulario.</p>
          <p>• El portal <strong className="text-gray-300">/mis-turnos</strong> sigue funcionando.</p>
          <p>• El <strong className="text-gray-300">panel de recepción</strong> sigue funcionando sin restricciones.</p>
          <p>• El bloqueo es instantáneo. Para reactivar, presioná &quot;Desbloquear sistema&quot;.</p>
        </div>
      </Card>
      <p className="text-center text-xs text-gray-700">Última actualización: {formatDate(sistema.updated_at as string)}</p>
    </div>
  )
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────
function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<Record<string, string>[]>([])
  const [cargando, setCargando] = useState(false)
  const [listado, setListado] = useState(false)
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    try {
      const d = await adminUsuarios('listar')
      setUsuarios(d.usuarios ?? [])
      setListado(true)
    } finally { setCargando(false) }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setCreando(true); setMsg(null)
    try {
      await adminUsuarios('crear', {
        email: `${nombre.toLowerCase().replace(/\s+/g, '.')}@recepcion.local`,
        password,
      })
      setMsg({ tipo: 'ok', texto: `Usuario "${nombre}" creado.` })
      setNombre(''); setPassword('')
      if (listado) cargar()
    } catch (err) { setMsg({ tipo: 'error', texto: String(err) }) }
    finally { setCreando(false) }
  }

  async function eliminar(id: string, email: string) {
    if (!confirm(`¿Eliminar a "${nombreFromEmail(email)}"?`)) return
    setEliminando(id)
    try {
      await adminUsuarios('eliminar', { user_id: id })
      setUsuarios(u => u.filter(u => u.id !== id))
    } catch (err) { alert(String(err)) }
    finally { setEliminando(null) }
  }

  return (
    <div className="space-y-5">
      <Card title="Crear usuario de recepción" icon="+">
        <form onSubmit={crear} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Maria García" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <Alert msg={msg} />
          <button type="submit" disabled={creando}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
            {creando ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </Card>

      <Card title="Usuarios existentes" icon="≡">
        <div className="flex justify-end mb-4">
          <button onClick={cargar} disabled={cargando}
            className="text-xs text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg transition-all hover:text-brand-300">
            {cargando ? 'Cargando...' : listado ? '↺ Actualizar' : 'Ver usuarios'}
          </button>
        </div>
        {listado && (
          <div className="space-y-2">
            {usuarios.length === 0
              ? <p className="text-gray-500 text-sm text-center py-4">Sin usuarios.</p>
              : usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{nombreFromEmail(u.email ?? '')}</p>
                    <p className="text-gray-500 text-xs">Creado: {formatDate(u.created_at)} · Último: {formatDate(u.last_sign_in_at)}</p>
                  </div>
                  <button onClick={() => eliminar(u.id, u.email)} disabled={eliminando === u.id}
                    className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                    {eliminando === u.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              ))
            }
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Especialidades ───────────────────────────────────────────────────────────
function EspecialidadesPanel({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Especialidad[]>([])
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ nombre: '', duracion_minutos: '30', color_agenda: '#3B82F6' })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const inputCls = `w-full border ${dark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`

  async function cargar() {
    setCargando(true)
    const d = await adminClinica('especialidades_listar')
    setLista(d.especialidades ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null)
    try {
      if (editId) {
        const d = await adminClinica('especialidades_actualizar', {
          id: editId, nombre: form.nombre,
          duracion_minutos: Number(form.duracion_minutos), color_agenda: form.color_agenda,
        })
        setLista(l => l.map(x => x.id === editId ? d.especialidad : x))
        setMsg({ tipo: 'ok', texto: 'Especialidad actualizada.' })
      } else {
        const d = await adminClinica('especialidades_crear', {
          nombre: form.nombre,
          duracion_minutos: Number(form.duracion_minutos), color_agenda: form.color_agenda,
        })
        if (d.especialidad) setLista(l => [...l, d.especialidad])
        setMsg({ tipo: 'ok', texto: 'Especialidad creada.' })
      }
      setForm({ nombre: '', duracion_minutos: '30', color_agenda: '#3B82F6' })
      setEditId(null)
    } catch (err) { setMsg({ tipo: 'error', texto: String(err) }) }
    finally { setGuardando(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    setEliminando(id)
    try {
      await adminClinica('especialidades_eliminar', { id })
      setLista(l => l.filter(x => x.id !== id))
    } catch (err) { alert(String(err)) }
    finally { setEliminando(null) }
  }

  return (
    <div className="space-y-5">
      <Card title={editId ? 'Editar especialidad' : 'Nueva especialidad'} icon={editId ? '✎' : '+'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Medicina del Trabajo" required className={inputCls} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Duración (min)</label>
              <input type="number" value={form.duracion_minutos} onChange={e => setForm({ ...form, duracion_minutos: e.target.value })}
                min="10" max="120" step="5" required className={inputCls} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color_agenda} onChange={e => setForm({ ...form, color_agenda: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                <div className="flex flex-wrap gap-1.5">
                  {COLORES.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color_agenda: c })}
                      className={`w-5 h-5 rounded-full transition-transform ${form.color_agenda === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Alert msg={msg} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? 'Guardando...' : editId ? 'Actualizar' : 'Crear especialidad'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nombre: '', duracion_minutos: '30', color_agenda: '#3B82F6' }); setMsg(null) }}
                className={`px-4 text-sm border rounded-xl transition-all ${dark ? 'text-gray-400 border-white/10 hover:bg-white/5' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Especialidades registradas" icon="⚕">
        {cargando
          ? <p className={`text-sm text-center py-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Cargando...</p>
          : lista.length === 0
          ? <p className={`text-sm text-center py-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Sin especialidades aún.</p>
          : <div className="space-y-2">
              {lista.map(esp => (
                <div key={esp.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${dark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: esp.color_agenda }} />
                    <div>
                      <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{esp.nombre}</p>
                      <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{esp.duracion_minutos} min</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(esp.id); setForm({ nombre: esp.nombre, duracion_minutos: String(esp.duracion_minutos), color_agenda: esp.color_agenda }); setMsg(null) }}
                      className="text-xs text-brand-400 border border-brand-500/20 hover:border-brand-500/50 px-3 py-1.5 rounded-lg transition-all">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(esp.id, esp.nombre)} disabled={eliminando === esp.id}
                      className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {eliminando === esp.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  )
}

// ─── Profesionales ────────────────────────────────────────────────────────────
function ProfesionalesPanel({ dark = true }: { dark?: boolean }) {
  const [lista, setLista] = useState<Profesional[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', matricula: '', especialidad_id: '' })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const inputCls = `w-full border ${dark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`

  async function cargar() {
    setCargando(true)
    const [dp, de] = await Promise.all([
      adminClinica('profesionales_listar'),
      adminClinica('especialidades_listar'),
    ])
    const profs: Profesional[] = dp.profesionales ?? []
    const esps: Especialidad[] = de.especialidades ?? []
    setLista(profs)
    setEspecialidades(esps)
    if (esps.length > 0) setForm(f => f.especialidad_id ? f : { ...f, especialidad_id: esps[0].id })
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsg(null)
    try {
      if (editId) {
        const d = await adminClinica('profesionales_actualizar', { id: editId, ...form })
        // FIX: verificar que data no sea null antes de actualizar el estado
        if (d.profesional) setLista(l => l.map(x => x.id === editId ? d.profesional : x))
        setMsg({ tipo: 'ok', texto: 'Profesional actualizado.' })
      } else {
        const d = await adminClinica('profesionales_crear', form)
        // FIX: verificar que data no sea null antes de agregar al estado
        if (d.profesional) setLista(l => [...l, d.profesional])
        setMsg({ tipo: 'ok', texto: 'Profesional creado.' })
      }
      setForm({ nombre: '', apellido: '', matricula: '', especialidad_id: especialidades[0]?.id ?? '' })
      setEditId(null)
    } catch (err) { setMsg({ tipo: 'error', texto: String(err) }) }
    finally { setGuardando(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return
    setEliminando(id)
    try {
      await adminClinica('profesionales_eliminar', { id })
      setLista(l => l.filter(x => x.id !== id))
    } catch (err) { alert(String(err)) }
    finally { setEliminando(null) }
  }

  if (especialidades.length === 0 && !cargando) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm">Primero creá al menos una especialidad.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card title={editId ? 'Editar profesional' : 'Nuevo profesional'} icon={editId ? '✎' : '+'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Carlos" required className={inputCls} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Apellido</label>
              <input type="text" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Ej: García" required className={inputCls} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Matrícula</label>
              <input type="text" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} placeholder="M.N. 12345" required className={inputCls} />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Especialidad</label>
              <select value={form.especialidad_id} onChange={e => setForm({ ...form, especialidad_id: e.target.value })} required
                className={`w-full border ${dark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`}>
                {especialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
              </select>
            </div>
          </div>
          <Alert msg={msg} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm">
              {guardando ? 'Guardando...' : editId ? 'Actualizar' : 'Crear profesional'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nombre: '', apellido: '', matricula: '', especialidad_id: especialidades[0]?.id ?? '' }); setMsg(null) }}
                className={`px-4 text-sm border rounded-xl transition-all ${dark ? 'text-gray-400 border-white/10 hover:bg-white/5' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Profesionales registrados" icon="👤">
        {cargando
          ? <p className="text-gray-500 text-sm text-center py-4">Cargando...</p>
          : lista.length === 0
          ? <p className="text-gray-500 text-sm text-center py-4">Sin profesionales aún.</p>
          : <div className="space-y-2">
              {lista.map(prof => (
                <div key={prof.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${dark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{ backgroundColor: prof.especialidades?.color_agenda ?? '#6B7280' }}>
                      {prof.nombre[0]}{prof.apellido[0]}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Dr/a. {prof.nombre} {prof.apellido}</p>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{prof.especialidades?.nombre} · {prof.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(prof.id); setForm({ nombre: prof.nombre, apellido: prof.apellido, matricula: prof.matricula, especialidad_id: prof.especialidad_id }); setMsg(null) }}
                      className="text-xs text-brand-400 border border-brand-500/20 hover:border-brand-500/50 px-3 py-1.5 rounded-lg transition-all">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(prof.id, `${prof.nombre} ${prof.apellido}`)} disabled={eliminando === prof.id}
                      className="text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {eliminando === prof.id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  )
}

// ─── Agendas ──────────────────────────────────────────────────────────────────
function AgendasPanel({ dark = true }: { dark?: boolean }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [profId, setProfId] = useState('')
  const [dias, setDias] = useState<Agenda[]>(
    DIAS_LAB.map(d => ({ profesional_id: '', dia_semana: d, hora_inicio: '08:00', hora_fin: '17:00', activo: false }))
  )
  const [cargandoProfs, setCargandoProfs] = useState(false)
  const [cargandoAgenda, setCargandoAgenda] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const inputCls = `border ${dark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500`

  useEffect(() => {
    setCargandoProfs(true)
    adminClinica('profesionales_listar').then(d => {
      const profs: Profesional[] = d.profesionales ?? []
      setProfesionales(profs)
      if (profs.length > 0) setProfId(profs[0].id)
    }).finally(() => setCargandoProfs(false))
  }, [])

  useEffect(() => {
    if (!profId) return
    setCargandoAgenda(true)
    adminClinica('agendas_listar', { profesional_id: profId }).then(d => {
      const agendas: Agenda[] = d.agendas ?? []
      setDias(DIAS_LAB.map(dia => {
        const found = agendas.find(a => a.dia_semana === dia)
        return found ?? { profesional_id: profId, dia_semana: dia, hora_inicio: '08:00', hora_fin: '17:00', activo: false }
      }))
    }).finally(() => setCargandoAgenda(false))
  }, [profId])

  function updateDia(dia_semana: number, patch: Partial<Agenda>) {
    setDias(d => d.map(x => x.dia_semana === dia_semana ? { ...x, ...patch } : x))
  }

  async function guardar() {
    setGuardando(true); setMsg(null)
    try {
      await adminClinica('agendas_guardar', {
        profesional_id: profId,
        dias: dias.map(({ dia_semana, hora_inicio, hora_fin, activo }) => ({ dia_semana, hora_inicio, hora_fin, activo })),
      })
      setMsg({ tipo: 'ok', texto: 'Agenda guardada.' })
    } catch (err) { setMsg({ tipo: 'error', texto: String(err) }) }
    finally { setGuardando(false) }
  }

  if (cargandoProfs) return <p className="text-gray-500 text-sm text-center py-8">Cargando...</p>
  if (profesionales.length === 0) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm">Primero creá al menos un profesional.</p>
      </div>
    )
  }

  const profActual = profesionales.find(p => p.id === profId)

  return (
    <div className="space-y-5">
      <Card title="Horarios de atención por profesional" icon="📅">
        <div className="mb-5">
          <label className={`text-xs mb-2 block ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Profesional</label>
          <select value={profId} onChange={e => setProfId(e.target.value)}
            className={`w-full border ${dark ? 'bg-gray-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`}>
            {profesionales.map(p => (
              <option key={p.id} value={p.id}>Dr/a. {p.nombre} {p.apellido} — {p.especialidades?.nombre}</option>
            ))}
          </select>
        </div>

        {cargandoAgenda
          ? <p className="text-gray-500 text-sm text-center py-4">Cargando agenda...</p>
          : <>
              <p className={`text-xs uppercase tracking-wider font-bold mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Días y horarios</p>
              <div className="space-y-2">
                {dias.map(dia => (
                  <div key={dia.dia_semana}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${dia.activo ? dark ? 'bg-brand-500/10 border-brand-500/30' : 'bg-brand-50 border-brand-200' : dark ? 'bg-white/3 border-white/5 opacity-60' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                    <button type="button" onClick={() => updateDia(dia.dia_semana, { activo: !dia.activo })}
                      className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${dia.activo ? 'bg-brand-500' : 'bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${dia.activo ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className={`w-24 text-sm font-semibold ${dia.activo ? dark ? 'text-white' : 'text-gray-900' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {DIAS[dia.dia_semana]}
                    </span>
                    {dia.activo
                      ? <div className="flex items-center gap-2">
                          <input type="time" value={dia.hora_inicio} onChange={e => updateDia(dia.dia_semana, { hora_inicio: e.target.value })} className={inputCls} />
                          <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>a</span>
                          <input type="time" value={dia.hora_fin} onChange={e => updateDia(dia.dia_semana, { hora_fin: e.target.value })} className={inputCls} />
                        </div>
                      : <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>No atiende</span>
                    }
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                <Alert msg={msg} />
                <button onClick={guardar} disabled={guardando}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 text-sm">
                  {guardando ? 'Guardando...' : `Guardar agenda de Dr/a. ${profActual?.apellido}`}
                </button>
              </div>
            </>
        }
      </Card>
      <div className={`border rounded-xl px-4 py-3 text-xs ${dark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
        <strong>Tip:</strong> Los horarios definidos acá generan los slots disponibles en el formulario de reserva.
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'sistema',        label: 'Sistema',        icon: '🔒' },
  { id: 'usuarios',       label: 'Usuarios',       icon: '👤' },
  { id: 'especialidades', label: 'Especialidades', icon: '⚕️' },
  { id: 'profesionales',  label: 'Profesionales',  icon: '🩺' },
  { id: 'agendas',        label: 'Agendas',        icon: '📅' },
]

function AdminDashboard() {
  const [tab, setTab] = useState('sistema')
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
        <div className="grid grid-cols-5 gap-1 bg-gray-900 border border-white/10 rounded-2xl p-1.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-bold py-2.5 rounded-xl transition-all ${tab === t.id ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
              <span className="text-base">{t.icon}</span>
              <span className="hidden sm:block text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
        {tab === 'sistema'        && <SistemaPanel />}
        {tab === 'usuarios'       && <UsuariosPanel />}
        {tab === 'especialidades' && <EspecialidadesPanel dark />}
        {tab === 'profesionales'  && <ProfesionalesPanel dark />}
        {tab === 'agendas'        && <AgendasPanel dark />}
        <p className="text-center text-xs text-gray-700">Esta página no está linkeada. Guardá la URL.</p>
      </div>
    </div>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [error, setError] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pin === ADMIN_SECRET) {
      setAutenticado(true)
    } else {
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 2000)
    }
  }

  if (autenticado) return <AdminDashboard />
  return <LoginPanel pin={pin} setPin={setPin} onSubmit={handleLogin} error={error} />
}
