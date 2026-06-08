"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/ui/Logo";

export default function RecepcionLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El email interno se construye a partir del nombre de usuario
  function toEmail(nombre: string) {
    return `${nombre.trim().toLowerCase().replace(/\s+/g, ".")}@recepcion.local`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: toEmail(usuario),
      password,
    });

    if (authError) {
      setError("Usuario o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    router.push("/recepcion");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 p-8">
          {/* Logo + título */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Panel de Recepción</h1>
            <p className="text-sm text-gray-400 mt-1">Ingresá tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej: Maria García"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {cargando ? "Ingresando..." : "Ingresar →"}
            </button>
          </form>
        </div>

        {/* Volver */}
        <p className="text-center mt-6">
          <a href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Volver al inicio
          </a>
        </p>
      </div>
    </div>
  );
}
