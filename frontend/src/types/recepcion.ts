export interface TurnoCompleto {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "pendiente" | "confirmado" | "cancelado" | "completado" | "no_asistio";
  motivo_consulta: string | null;
  notas_recepcion: string | null;
  origen: "online" | "presencial" | "telefono";
  obra_social_id: string | null;
  copago_abonado: boolean;
  pacientes: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string | null;
    obra_social: string | null;
  };
  profesionales: {
    nombre: string;
    apellido: string;
  };
  especialidades: {
    nombre: string;
    color_agenda: string;
    duracion_minutos: number;
  };
  obras_sociales: {
    nombre: string;
    copago_monto: number;
  } | null;
}

export type EstadoTurno = TurnoCompleto["estado"];
