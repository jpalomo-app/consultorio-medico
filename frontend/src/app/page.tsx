import Link from "next/link";
import DisponibilidadWidget from "@/components/landing/DisponibilidadWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
              <span className="text-sm font-black text-white tracking-tight">SM</span>
            </div>
            <div>
              <p className="font-black text-gray-900 leading-none text-sm">Medicina Laboral</p>
              <p className="text-[10px] text-brand-500 font-semibold tracking-wider uppercase">Turnos Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/mis-turnos" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-2 py-2">
              Mis turnos
            </Link>
            <Link href="/reservar" className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5">
              Reservar turno &rarr;
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
              <span className="text-brand-300 text-xs font-semibold tracking-widest uppercase">
                Turnos disponibles hoy
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.0] tracking-tight mb-6">
              Tu salud<br />
              laboral,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-rose-400">
                sin esperas.
              </span>
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-10 max-w-xl">
              Reservá tu turno en{" "}
              <span className="text-white font-semibold">SM Medicina Laboral</span> en menos de 2
              minutos, desde cualquier dispositivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/reservar"
                className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-black px-10 py-5 rounded-2xl shadow-2xl shadow-brand-500/40 transition-all hover:-translate-y-1 text-lg"
              >
                Reservar turno ahora
              </Link>
              <a
                href="tel:+542215480558"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-5 rounded-2xl transition-all text-lg backdrop-blur-sm"
              >
                Llamarnos
              </a>
            </div>
          </div>
        </div>
        <div className="relative border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { stat: "10+", label: "Especialidades" },
              { stat: "24/7", label: "Online" },
              { stat: "menos de 2'", label: "Para reservar" },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-white">{stat}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DisponibilidadWidget />

      {/* Steps */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-brand-100 text-brand-600 text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase mb-4">
              Simple y rapido
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">Reserva en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "1",
                title: "Elegi especialidad",
                desc: "Selecciona el tipo de consulta y el profesional disponible.",
                gradient: "from-brand-500 to-brand-700",
              },
              {
                n: "2",
                title: "Elegi tu horario",
                desc: "Visualiza los turnos disponibles en tiempo real.",
                gradient: "from-rose-500 to-brand-600",
              },
              {
                n: "3",
                title: "Confirma el turno",
                desc: "Ingresa tu DNI y en un clic tu turno queda reservado.",
                gradient: "from-red-700 to-rose-600",
              },
            ].map(({ n, title, desc, gradient }) => (
              <div
                key={n}
                className="relative rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group"
              >
                <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />
                <div className="p-8">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-2xl text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}
                  >
                    {n}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/reservar"
              className="inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-brand-500/30 transition-all hover:-translate-y-1 text-xl"
            >
              Empezar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-brand-100 text-brand-600 text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase mb-4">
              Lo que hacemos
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">Nuestras especialidades</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji: "medico", title: "Medicina del Trabajo", desc: "Examenes preocupacionales y periodicos", n: "01" },
              { emoji: "pulmon", title: "Toxicologia Laboral", desc: "Analisis y evaluaciones especializadas", n: "02" },
              { emoji: "seguridad", title: "Higiene y Seguridad", desc: "Prevencion de riesgos laborales", n: "03" },
              { emoji: "corazon", title: "Cardiologia", desc: "Evaluaciones cardiovasculares completas", n: "04" },
              { emoji: "cerebro", title: "Psicologia Laboral", desc: "Salud mental en el entorno de trabajo", n: "05" },
              { emoji: "art", title: "Ausentismo y ART", desc: "Gestion y seguimiento de licencias", n: "06" },
            ].map(({ title, desc, n }) => (
              <div
                key={title}
                className="group relative bg-gray-50 hover:bg-brand-500 rounded-2xl p-6 border border-gray-100 hover:border-brand-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/20 cursor-default"
              >
                <h3 className="font-bold text-gray-900 group-hover:text-white mb-1 transition-colors text-lg">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-brand-100 transition-colors">{desc}</p>
                <div className="absolute bottom-4 right-4 text-gray-200 group-hover:text-brand-300 transition-colors text-2xl font-black opacity-40">
                  {n}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-rose-600" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-brand-200 font-semibold tracking-widest uppercase text-sm mb-4">
            Listo para reservar?
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Tu turno esta<br />
            a un paso.
          </h2>
          <p className="text-brand-100 text-xl mb-10 max-w-lg mx-auto">
            Sin esperas en linea. Sin llamadas. Solo elegi, confirma y listo.
          </p>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-3 bg-white text-brand-600 hover:bg-brand-50 font-black px-12 py-5 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 text-xl"
          >
            Reservar mi turno
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <span className="text-white text-xs font-black">SM</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">SM Medicina Laboral</p>
                <p className="text-gray-500 text-xs">2026 - Todos los derechos reservados</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
