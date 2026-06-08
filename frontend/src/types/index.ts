// ── Entidades de la base de datos ────────────────────────────

export interface ObraSocial {
  id: string;
  nombre: string;
  copago_monto: number;
  activa: boolean;
}

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
  foto_url: string | null;
  especialidad_id: string;
  especialidades?: Especialidad;
}

export interface Slot {
  slot_inicio: string;   // ISO
  slot_fin: string;      // ISO
  disponible: boolean;
}

// ── Estado del formulario de reserva ─────────────────────────

export interface ReservaState {
  especialidad: Especialidad | null;
  profesional: Profesional | null;
  fecha: string | null;       // "YYYY-MM-DD"
  slot: Slot | null;
  paciente: DatosPaciente | null;
}

export interface DatosPaciente {
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  email: string;
  telefono?: string;
  obra_social?: string;
  obra_social_id?: string | null;   // null = particular
  esNuevo: boolean;
}

// ── Respuesta de la Edge Function ────────────────────────────

export interface ReservaResponse {
  ok: boolean;
  turno_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  profesional?: string;
  especialidad?: string;
  error?: string;
  code?: string;
}
