# Guía de instalación — Frontend Next.js

## Requisitos previos
- Node.js 18 o superior instalado
- Proyecto Supabase creado con las migraciones SQL aplicadas

## Pasos

### 1. Abrir terminal en esta carpeta

En Windows: hacé clic derecho sobre la carpeta `frontend` → "Abrir en Terminal"

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Creá un archivo llamado `.env.local` en esta carpeta (copiando `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Los valores los encontrás en:
**Supabase Dashboard → Settings → API → Project URL y anon public key**

### 4. Correr en modo desarrollo

```bash
npm run dev
```

Abrí el navegador en: **http://localhost:3000**

---

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx          ← Layout global
│   ├── page.tsx            ← Página de inicio
│   └── reservar/
│       └── page.tsx        ← Flujo de reserva
├── components/
│   └── reservar/
│       ├── FormularioReserva.tsx  ← Contenedor con el stepper
│       ├── PasoUno.tsx            ← Especialidad + Profesional + Fecha
│       ├── PasoDos.tsx            ← Selección de horario
│       ├── PasoTres.tsx           ← Datos del paciente + confirmación
│       └── Confirmacion.tsx       ← Pantalla de éxito
├── lib/
│   ├── supabase.ts         ← Cliente de Supabase
│   └── utils.ts            ← Helpers (cn, formatFecha)
└── types/
    └── index.ts            ← Tipos TypeScript del sistema
```

## Próximos pasos sugeridos

- `/mis-turnos` — Portal del paciente para ver y cancelar sus turnos
- `/recepcion` — Dashboard en tiempo real para el personal
- `/admin` — Gestión de profesionales y agendas
