# Edge Functions — Sistema de Turnos

## reservar-turno

**Ruta:** `POST /functions/v1/reservar-turno`

### Cómo deployar en Supabase

**Opción A — Desde el Dashboard (más fácil):**
1. Supabase Dashboard → Edge Functions → "New Function"
2. Nombre: `reservar-turno`
3. Pegar el contenido de `reservar-turno/index.ts`
4. Deploy

**Opción B — Con Supabase CLI:**
```bash
supabase functions deploy reservar-turno
```

---

### Request

```json
POST /functions/v1/reservar-turno
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "profesional_id": "uuid-del-profesional",
  "especialidad_id": "uuid-de-la-especialidad",
  "fecha_inicio": "2026-06-10T09:00:00Z",
  "paciente": {
    "dni": "12345678",

    // Si el paciente ya existe en la DB, solo el DNI alcanza.
    // Si es nuevo, estos campos son obligatorios:
    "nombre": "Juan",
    "apellido": "Pérez",
    "fecha_nacimiento": "1990-03-15",
    "email": "juan@email.com",
    "telefono": "+5491112345678",
    "obra_social": "OSDE"
  },
  "motivo_consulta": "Control anual"
}
```

### Respuestas

**201 — Turno creado:**
```json
{
  "ok": true,
  "turno_id": "uuid-del-turno",
  "fecha_inicio": "2026-06-10T09:00:00Z",
  "fecha_fin": "2026-06-10T09:30:00Z",
  "profesional": "María García",
  "especialidad": "Medicina General"
}
```

**409 — Slot ocupado (race condition):**
```json
{
  "ok": false,
  "error": "Ese horario ya fue reservado. Por favor elegí otro.",
  "code": "SLOT_OCUPADO"
}
```

### Códigos de error

| code | Situación |
|---|---|
| `VALIDATION_ERROR` | Faltan campos obligatorios |
| `PROFESIONAL_NOT_FOUND` | UUID inválido o profesional inactivo |
| `ESPECIALIDAD_NOT_FOUND` | UUID inválido o especialidad inactiva |
| `FECHA_PASADA` | `fecha_inicio` es anterior a ahora |
| `FUERA_DE_AGENDA` | El slot no cae dentro del horario de atención |
| `PROFESIONAL_BLOQUEADO` | El profesional tiene un bloqueo en esa fecha |
| `SLOT_OCUPADO` | El slot fue tomado justo antes (race condition) |
| `PACIENTE_ERROR` | DNI nuevo pero faltan datos para crear el registro |
| `INTERNAL_ERROR` | Error inesperado del servidor |

---

### Lógica de anti-colisión (2 capas)

```
Request llega
    │
    ▼
Capa 1: verificarAgenda() + verificarBloqueo()
    → Chequeo rápido antes de intentar insertar
    │
    ▼
Capa 2: INSERT con constraint EXCLUDE USING gist (en Postgres)
    → Si dos requests llegan simultáneos y pasan la capa 1,
      solo uno logra insertar. El segundo recibe error 23P01
      que la función mapea a code: SLOT_OCUPADO
```
