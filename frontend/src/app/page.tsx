import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm leading-none">SM</span>
          </div>
          <div>
            <p className="font-black text-white leading-none text-sm">SM</p>
            <p className="text-gray-400 text-xs leading-none">Medicina Laboral</p>
          </div>
        </div>
        <Link
          href="/mis-turnos"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Mis turnos
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Turnos disponibles hoy
          </div>

          <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">
            Reservá tu turno<br />
            <span className="text-red-700">en minutos</span>
          </h1>

          <p className="text-gray-500 text-lg mb-10">
            Elegí especialidad, profesional, día y horario — sin llamadas ni esperas.
          </p>

          <Link
            href="/reservar"
            className="inline-block bg-red-700 hover:bg-red-800 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg shadow-red-200 transition-all hover:scale-105"
          >
            Reservar turno →
          </Link>

          <p className="mt-6 text-sm text-gray-400">
            ¿Ya tenés un turno?{" "}
            <Link href="/mis-turnos" className="text-red-700 font-medium hover:underline">
              Consultalo acá
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        SM Medicina Laboral · Turnos Online
      </footer>
    </main>
  );
}
