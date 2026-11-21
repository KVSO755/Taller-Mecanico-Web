# 04 · Funciones de negocio en la base de datos

**Fecha:** 21/11/2026 10:22
**Feature / área:** Infraestructura (Supabase) — reglas de F01, F02, F04, F05, F06 y F07

## Qué se trabajó
- `mi_rol()`: rol del usuario actual; devuelve null si la cuenta está desactivada.
- Trigger `crear_perfil` en `auth.users`: crea el perfil como `cliente` al registrarse (nombre, teléfono y correo).
- Validación de horario (`_validar_bloque`) y de capacidad (`_capacidad_disponible`, máximo 3 citas por bloque).
- Funciones RPC: `bloques_ocupados`, `agendar_cita`, `confirmar_cita`, `reprogramar_cita`, `cancelar_cita`,
  `cancelar_citas_vencidas`, `crear_orden`, `avanzar_estatus_orden`, `cambiar_rol`, `cambiar_activo`.
- Tarea de `pg_cron` cada minuto que cancela citas pendientes con 15 min de retraso.

## Archivos
- `supabase/functions.sql` — paso 2 de 3.

## Decisiones y notas
- Todas son `SECURITY DEFINER` con `search_path` fijo y validan el rol antes de actuar.
- Horario siempre en `America/Tijuana` (L–V 8–17, sábado 8–13, domingo cerrado; desde mañana hasta +30 días).
- Candado por bloque (`pg_advisory_xact_lock`) para que dos clientes no tomen el último lugar a la vez.
- `crear_orden` hace todo en una transacción: orden, cita atendida, km del vehículo y bitácora.
- `avanzar_estatus_orden` recibe el estatus esperado para detectar si otra persona ya avanzó la orden.
- Los errores de negocio salen con mensajes en español listos para mostrar en pantalla.
- Ejecución solo para `authenticated`; `anon` no puede llamar ninguna función.

## Siguiente paso
- `policies.sql`: permisos por columna y políticas RLS.
