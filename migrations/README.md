# Migraciones SQL — Sistema de Turnos Médicos

## Orden de aplicación

Aplicar en Supabase Dashboard → **SQL Editor** → pegar y ejecutar en este orden:

| Archivo | Contenido |
|---|---|
| `001_initial_schema.sql` | Enums, tablas, índices, triggers |
| `002_rls_policies.sql` | Row Level Security + función `obtener_slots_disponibles()` |

## Notas importantes

- La extensión `btree_gist` es requerida por el constraint anti-solapamiento de turnos. El script la habilita automáticamente.
- El trigger `trg_on_auth_user_created` crea automáticamente el registro en `public.usuarios` cuando alguien se registra con Supabase Auth.
- El trigger `trg_calcular_fecha_fin` calcula `fecha_fin` automáticamente a partir de `especialidades.duracion_minutos`. No es necesario enviar `fecha_fin` al insertar un turno.
- La función `obtener_slots_disponibles(profesional_id, fecha)` es la que el frontend llama para renderizar el grid de disponibilidad.

## Ejemplo de uso desde el cliente (Supabase JS)

```typescript
// Obtener slots disponibles
const { data: slots } = await supabase
  .rpc('obtener_slots_disponibles', {
    p_profesional_id: 'uuid-del-profesional',
    p_fecha: '2026-06-10'
  });

// Crear turno (fecha_fin se calcula sola)
const { data: turno } = await supabase
  .from('turnos')
  .insert({
    paciente_id: 'uuid-paciente',
    profesional_id: 'uuid-profesional',
    especialidad_id: 'uuid-especialidad',
    fecha_inicio: '2026-06-10T09:00:00Z',
    // fecha_fin: NO es necesario enviarlo
  })
  .select()
  .single();
```
