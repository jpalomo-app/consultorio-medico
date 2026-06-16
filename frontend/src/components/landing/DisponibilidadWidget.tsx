"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const DIAS: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves",
  5: "Viernes", 6: "Sábado", 0: "Domingo",
};

const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

interface DiaDisponible {
  fecha: string;
  diaSemana: number;
  dia: number;
  mes: string;
  cantidad: number;
}

export default function DisponibilidadWidget() {
  const [dias, setDias] = useState<DiaDisponible[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en14 = new Date(hoy);
    en14.setDate(en14.getDate() + 14);

    const [{ data: agendas }, { data: bloqueos }] = await Promise.all([
      supabase.from("agendas_disponibilidad").select("profesional_id, dia_semana").eq("activo", true),
      supabase.from("bloqueos").select("profesional_id, fecha_inicio, fecha_fin")
        .gte("fecha_fin", hoy.toISOString())
        .lte("fecha_inicio", en14.toISOString()),
    ]);

    const resultado: DiaDisponible[] = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      const diaSemana = d.getDay(); // 0=Dom, 1=Lun... (mismo que la BD)
      const fechaStr = d.toISOString().slice(0, 10);

      // Profesionales que trabajan este día de la semana
      const profDisponibles = new Set(
        (agendas ?? []).filter(a => a.dia_semana === diaSemana).map(a => a.profesional_id)
      );

      // Restar los que tienen bloqueo este día
      (bloqueos ?? []).forEach(b => {
        const inicio = new Date(b.fecha_inicio);
        const fin = new Date(b.fecha_fin);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        if (d >= inicio && d <= fin) profDisponibles.delete(b.profesional_id);
      });

      if (profDisponibles.size > 0) {
        resultado.push({
          fecha: fechaStr,
          diaSemana,
          dia: d.getDate(),
          mes: MESES_CORTOS[d.getMonth()],
          cantidad: profDisponibles.size,
        });
      }
    }

    setDias(resultado.slice(0, 7));
    setCargando(false);
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Disponibilidad en tiempo real
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900">
            Próximos días disponibles
          </h2>
          <p className="text-gray-400 mt-3 text-lg">
            Hacé clic en un día para empezar tu reserva
          </p>
        </div>

        {cargando ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dias.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-lg">
            No hay turnos disponibles en los próximos días.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {dias.map((d, i) => (
              <a
                key={d.fecha}
                href={`/reservar`}
                className={`group flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all duration-200 hover:-translate-y-1 text-center cursor-pointer ${
                  i === 0
                    ? "bg-brand-500 border-brand-500 shadow-xl shadow-brand-500/30"
                    : "bg-gray-50 border-gray-100 hover:border-brand-400 hover:bg-brand-50 hover:shadow-lg hover:shadow-brand-500/10"
                }`}
              >
                {i === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-200 mb-0.5">
                    Más próximo
                  </span>
                )}
                <span className={`text-[11px] font-bold uppercase tracking-widest ${i === 0 ? "text-brand-200" : "text-gray-400"}`}>
                  {DIAS[d.diaSemana]?.slice(0, 3)}
                </span>
                <span className={`text-4xl font-black leading-none ${i === 0 ? "text-white" : "text-gray-800"}`}>
                  {d.dia}
                </span>
                <span className={`text-[11px] font-semibold uppercase ${i === 0 ? "text-brand-200" : "text-gray-400"}`}>
                  {d.mes}
                </span>
                <div className={`mt-2 w-full py-1 px-2 rounded-xl text-[11px] font-bold ${
                  i === 0 ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
                }`}>
                  {d.cantidad} {d.cantidad === 1 ? "profesional" : "profesionales"}
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a
            href="/reservar"
            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-500 font-bold text-base transition-colors"
          >
            Ver todos los horarios
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
