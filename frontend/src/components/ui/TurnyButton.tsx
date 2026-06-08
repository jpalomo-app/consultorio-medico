"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "5492213542594";
const WHATSAPP_MSG = encodeURIComponent(
  "Hola! Vi el sistema de turnos de SM Medicina Laboral y me gustaría saber más sobre Turny."
);

export default function TurnyButton() {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Card expandida */}
      {expandido && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-64 mb-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <img
              src="/turny-logo.png"
              alt="Turny"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <p className="text-xs font-black text-gray-900 leading-none">Turny</p>
              <p className="text-xs text-gray-400 leading-none">Sistema de turnos</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            ¿Querés este sistema para tu consultorio o empresa? Contactanos por WhatsApp.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-xs py-2.5 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741 1.024 1.053-3.67-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar por WhatsApp
          </a>
        </div>
      )}

      {/* Botón principal */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="group flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white pl-3 pr-4 py-2.5 rounded-2xl shadow-xl shadow-black/20 transition-all hover:scale-105 border border-white/10"
        title="Powered by Turny"
      >
        <img
          src="/turny-logo.png"
          alt="Turny"
          className="h-5 w-auto object-contain brightness-0 invert"
          onError={(e) => {
            // Fallback si no está el logo
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-xs font-bold tracking-wide">Turny</span>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}>
          ▲
        </span>
      </button>
    </div>
  );
}
