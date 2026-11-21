# 01 · Specs SDD y decisiones de diseño

**Fecha:** 21/11/2026
**Feature / área:** Metodología SDD (todas las features)

## Qué se trabajó
- Revisión completa de `specs/` (proyecto, navegación, modelo de datos, decisiones técnicas, plan y F01–F08).
- Sesión de preguntas y respuestas (Q1–Q26) para cerrar huecos antes de programar.
- Se aplicaron las decisiones a cada spec y se agregó "Registro de cambios" en `04-plan-de-trabajo.md`.

## Decisiones principales
- Seguridad en la BD: permisos por columna + funciones RPC `SECURITY DEFINER` (RLS solo filtra filas).
- `mi_rol()` devuelve null para cuentas desactivadas → bloqueo inmediato.
- Zona horaria fija `America/Tijuana` en SQL y en el frontend.
- Cita activa = pendiente/confirmada con fecha futura.
- Citas pendientes se cancelan solas 15 min después de su hora (pg_cron) con `cancelada_por = 'sistema'`.
- El cliente cancela hasta 1 h antes; la orden solo nace de una cita confirmada de hoy.
- El cliente no edita el kilometraje; solo lo actualizan las órdenes.

## Siguiente paso
- Esqueleto del proyecto (Vite + React + Tailwind + Supabase).
