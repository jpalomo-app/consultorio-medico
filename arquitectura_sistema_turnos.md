# Arquitectura: Sistema de Gestión de Turnos Médicos Online

> **Versión:** 1.0 | **Fecha:** Junio 2026  
> **Autor:** Arquitecto de Software — IA Cowork

---

## 1. VISIÓN GENERAL DEL SISTEMA

El sistema es una plataforma web de reserva y gestión de turnos médicos con cuatro actores principales:

| Actor | Rol |
|---|---|
| **Paciente** | Reserva turnos online, consulta historial |
| **Profesional Médico** | Gestiona su agenda y disponibilidad |
| **Recepción** | Confirma, reprograma y cancela en tiempo real |
| **Administrador** | Configura especialidades, usuarios y reportes |

---

## 2. STACK TECNOLÓGICO RECOMENDADO

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Estado global:** Zustand
- **Fetching / cache:** TanStack Query (React Query)
- **Formularios:** React Hook Form + Zod (validación)

### Backend / BaaS
- **Plataforma:** Supabase
  - PostgreSQL como base de datos relacional
  - Supabase Realtime (WebSockets) para sincronización en tiempo real
  - Supabase Auth para autenticación (JWT + OAuth)
  - Edge Functions (Deno) para lógica de negocio compleja
  - Row Level Security (RLS) para control de acceso por rol

### Infraestructura
- **Hosting Frontend:** Vercel (integración nativa con Next.js)
- **Hosting DB/Backend:** Supabase Cloud (plan Pro para producción)
- **CDN / Assets:** Vercel Edge Network
- **Notificaciones:** Twilio (SMS) + Resend (email transaccional)

### Por qué este stack
- **Supabase Realtime** permite que recepción vea cambios de turnos sin recargar la página.
- **Next.js App Router** permite renderizado por servidor (SSR) para SEO y velocidad de carga inicial.
- **RLS en Postgres** centraliza la seguridad: el paciente sólo ve sus propios turnos aunque comparta la API.

---

## 3. ARQUITECTURA EN CAPAS

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                    │
│         Next.js 14  ·  React  ·  Tailwind CSS          │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────────┐
│                   API LAYER (Supabase)                  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  REST API   │  │  Realtime    │  │ Edge Functions│  │
│  │ (PostgREST) │  │ (WebSockets) │  │  (lógica biz) │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘  │
└─────────┼────────────────┼─────────────────┼───────────┘
          │                │                 │
┌─────────▼────────────────▼─────────────────▼───────────┐
│                  POSTGRESQL + RLS                       │
│                                                         │
│  pacientes · profesionales · turnos · agendas          │
│  especialidades · bloqueos · notificaciones            │
└─────────────────────────────────────────────────────────┘
```

---

## 4. MODELO RELACIONAL DE BASE DE DATOS

### 4.1 Diagrama de relaciones

```
especialidades ──< profesionales ──< agendas_disponibilidad
                       │
                       ├──< bloqueos
                       │
                       └──< turnos >── pacientes
                              │
                              └──< notificaciones
usuarios ──── pacientes
         └─── profesionales
         └─── recepcion_admins
```

### 4.2 Tablas

---

#### `usuarios`
Tabla de autenticación (sincronizada con Supabase Auth).

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| email | TEXT | UNIQUE, NOT NULL |
| rol | ENUM | ('paciente', 'profesional', 'recepcion', 'admin') |
| activo | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

#### `especialidades`
Catálogo de especialidades médicas con su duración de consulta.

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| nombre | TEXT | NOT NULL, e.g. 'Cardiología' |
| duracion_minutos | INTEGER | NOT NULL, DEFAULT 30 |
| color_agenda | TEXT | Hex color para UI |
| activo | BOOLEAN | DEFAULT true |

> **Clave de negocio:** `duracion_minutos` es el parámetro que usa el motor de reservas para calcular automáticamente el slot de fin (`hora_inicio + duracion_minutos`).

---

#### `profesionales`
Datos del médico, vinculado a un usuario y a una especialidad.

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id |
| especialidad_id | UUID | FK → especialidades.id |
| nombre | TEXT | NOT NULL |
| apellido | TEXT | NOT NULL |
| matricula | TEXT | UNIQUE, NOT NULL |
| foto_url | TEXT | nullable |
| activo | BOOLEAN | DEFAULT true |

---

#### `agendas_disponibilidad`
Define los días y horarios en que cada profesional atiende de forma recurrente.

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| profesional_id | UUID | FK → profesionales.id |
| dia_semana | INTEGER | 0=Lunes … 6=Domingo |
| hora_inicio | TIME | NOT NULL, e.g. '08:00' |
| hora_fin | TIME | NOT NULL, e.g. '13:00' |
| activo | BOOLEAN | DEFAULT true |

> **Constraint adicional:** `CHECK (hora_fin > hora_inicio)`

---

#### `bloqueos`
Períodos en que un profesional NO atiende (vacaciones, licencias, feriados).

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| profesional_id | UUID | FK → profesionales.id |
| fecha_inicio | TIMESTAMPTZ | NOT NULL |
| fecha_fin | TIMESTAMPTZ | NOT NULL |
| motivo | TEXT | nullable |

---

#### `pacientes`
Datos del paciente, incluyendo documento de identidad para validación.

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id, nullable (puede registrarse sin cuenta) |
| dni | TEXT | UNIQUE, NOT NULL |
| nombre | TEXT | NOT NULL |
| apellido | TEXT | NOT NULL |
| fecha_nacimiento | DATE | NOT NULL |
| email | TEXT | NOT NULL |
| telefono | TEXT | nullable |
| obra_social | TEXT | nullable |
| nro_afiliado | TEXT | nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

#### `turnos` ← Tabla central del sistema

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| paciente_id | UUID | FK → pacientes.id |
| profesional_id | UUID | FK → profesionales.id |
| especialidad_id | UUID | FK → especialidades.id |
| fecha_inicio | TIMESTAMPTZ | NOT NULL |
| fecha_fin | TIMESTAMPTZ | NOT NULL (calculado automáticamente) |
| estado | ENUM | ('pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio') |
| motivo_consulta | TEXT | nullable |
| notas_recepcion | TEXT | nullable |
| origen | ENUM | ('online', 'presencial', 'telefono') |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

**Constraints críticos para el motor de reservas:**
```sql
-- Evitar superposición de horarios por profesional
CONSTRAINT no_overlap EXCLUDE USING gist (
  profesional_id WITH =,
  tstzrange(fecha_inicio, fecha_fin) WITH &&
) WHERE (estado NOT IN ('cancelado'))
```

> Este constraint a nivel de base de datos es la última línea de defensa contra la doble reserva, independientemente de la lógica de aplicación.

---

#### `notificaciones`

| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| turno_id | UUID | FK → turnos.id |
| tipo | ENUM | ('confirmacion', 'recordatorio', 'cancelacion', 'reprogramacion') |
| canal | ENUM | ('email', 'sms') |
| enviado_at | TIMESTAMPTZ | nullable |
| estado | ENUM | ('pendiente', 'enviado', 'fallido') |

---

### 4.3 Índices recomendados

```sql
-- Búsquedas frecuentes por profesional y fecha
CREATE INDEX idx_turnos_profesional_fecha 
  ON turnos(profesional_id, fecha_inicio);

-- Búsquedas de paciente por DNI (login/validación)
CREATE INDEX idx_pacientes_dni ON pacientes(dni);

-- Agenda del día para recepción
CREATE INDEX idx_turnos_fecha_estado 
  ON turnos(fecha_inicio, estado);
```

---

## 5. LÓGICA DEL MOTOR DE RESERVAS

### 5.1 Algoritmo de cálculo de slots disponibles

```
FUNCIÓN calcular_slots_disponibles(profesional_id, fecha):

  1. Obtener agenda del profesional para ese día de la semana
     → agendas_disponibilidad WHERE dia_semana = fecha.dayOfWeek
  
  2. Obtener duración de consulta
     → especialidades.duracion_minutos

  3. Generar lista de slots candidatos:
     slot = hora_inicio
     MIENTRAS slot + duracion < hora_fin:
       agregar slot a candidatos
       slot += duracion_minutos

  4. Filtrar slots bloqueados:
     → Remover slots que colisionen con bloqueos (vacaciones/feriados)
  
  5. Filtrar slots ocupados:
     → Remover slots donde ya existe turno confirmado/pendiente
         con tstzrange(fecha+slot, fecha+slot+duracion) && turno.rango

  6. RETORNAR slots_disponibles
```

### 5.2 Prevención de race conditions

Cuando dos pacientes intentan reservar el mismo slot simultáneamente:

```sql
-- En la Edge Function de reserva, usar transacción con lock:
BEGIN;
  -- Bloqueo pesimista sobre el rango horario
  SELECT id FROM turnos 
  WHERE profesional_id = $1
    AND tstzrange(fecha_inicio, fecha_fin) && tstzrange($2, $3)
    AND estado != 'cancelado'
  FOR UPDATE SKIP LOCKED;
  
  -- Si no hay resultado → insertar turno
  -- Si hay resultado → retornar error "slot no disponible"
COMMIT;
```

---

## 6. FLUJO DE RESERVA EN 3 PASOS (UX)

```
PASO 1 — ¿Con quién y cuándo?
┌─────────────────────────────────────────┐
│  Seleccionar especialidad               │
│  ▼                                      │
│  Seleccionar profesional (filtrado)     │
│  ▼                                      │
│  Elegir fecha en calendario             │
│  → Sistema muestra slots disponibles   │
└─────────────────────────────────────────┘
              ↓
PASO 2 — Elegir horario
┌─────────────────────────────────────────┐
│  Grid de slots disponibles del día      │
│  [08:00] [08:30] [09:00] ✗ [09:30]     │
│                                         │
│  Paciente selecciona un slot            │
│  → Slot queda en "reserva temporal"    │
│    (TTL: 5 minutos para completar)     │
└─────────────────────────────────────────┘
              ↓
PASO 3 — Confirmar identidad
┌─────────────────────────────────────────┐
│  Ingresar DNI                           │
│  → Si existe: pre-completa datos       │
│  → Si no existe: formulario rápido     │
│    (nombre, apellido, email, tel)      │
│                                         │
│  Motivo de consulta (opcional)         │
│  [CONFIRMAR TURNO]                      │
│  → Envío automático de confirmación    │
│    por email/SMS                       │
└─────────────────────────────────────────┘
```

**Tiempo estimado de reserva: < 90 segundos.**

---

## 7. MÓDULOS Y VISTAS POR ROL

### Panel de Recepción / Administración (tiempo real)
- Vista de agenda diaria con drag & drop para reprogramar
- Filtro por profesional y especialidad
- Indicadores en vivo: turnos confirmados, pendientes, ausentes
- Acciones rápidas: confirmar presencia (check-in), cancelar, reprogramar
- Supabase Realtime actualiza el panel sin recarga cuando hay cambios

### Panel del Profesional
- Vista de su agenda semanal/mensual
- Gestión de bloqueos (vacaciones, licencias)
- Notas por turno post-consulta

### Portal del Paciente
- Mis próximos turnos
- Historial de consultas
- Cancelación self-service (hasta X horas antes)

---

## 8. SEGURIDAD (RLS — Row Level Security)

```sql
-- Paciente sólo ve sus propios turnos
CREATE POLICY "paciente_ver_sus_turnos" ON turnos
  FOR SELECT USING (
    paciente_id = (SELECT id FROM pacientes WHERE usuario_id = auth.uid())
  );

-- Profesional sólo ve turnos de su agenda
CREATE POLICY "profesional_ver_su_agenda" ON turnos
  FOR SELECT USING (
    profesional_id = (SELECT id FROM profesionales WHERE usuario_id = auth.uid())
  );

-- Recepción y Admin ven todo
CREATE POLICY "recepcion_ver_todo" ON turnos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('recepcion','admin'))
  );
```

---

## 9. ROADMAP DE IMPLEMENTACIÓN

| Fase | Duración estimada | Entregables |
|---|---|---|
| **Fase 1 — Base** | 3 semanas | Auth, CRUD pacientes/profesionales, modelo DB |
| **Fase 2 — Motor de reservas** | 2 semanas | Slots, anti-colisión, reserva online en 3 pasos |
| **Fase 3 — Panel recepción** | 2 semanas | Dashboard realtime, check-in, reprogramación |
| **Fase 4 — Notificaciones** | 1 semana | Email/SMS confirmación y recordatorio 24h antes |
| **Fase 5 — Portal paciente** | 1 semana | Historial, cancelación self-service |
| **Fase 6 — Producción** | 1 semana | Testing, hardening seguridad, deploy |

**Total estimado: ~10 semanas para MVP completo.**

---

*Documento generado con Claude · Cowork Mode*
