# 03 · Esquema de la base de datos

**Fecha:** 21/11/2026 09:37
**Feature / área:** Infraestructura (Supabase / PostgreSQL)

## Qué se trabajó
- Tipos enum: `rol_usuario`, `estatus_cita`, `estatus_orden`.
- Tablas `perfiles`, `vehiculos`, `citas`, `ordenes`, `cambios_estatus` según `specs/02-data-model.md`.
- Índices para la agenda (citas activas por fecha) y para órdenes por vehículo/estatus.
- RLS habilitado en las 5 tablas (las políticas van en `policies.sql`).
- Script re-ejecutable en el SQL Editor (`if not exists`, tipos con `duplicate_object`).

## Archivos
- `supabase/schema.sql` — paso 1 de 3 (schema → functions → policies).

## Decisiones y notas
- `vehiculos.cliente_id` tiene `default auth.uid()`: el frontend nunca manda el dueño.
- Placa validada también en la BD: `check (placa ~ '^[A-Z0-9]{5,8}$')`.
- `citas.cancelada_por` (`cliente` | `taller` | `sistema`) con check: solo existe si la cita está cancelada.
- Índice único parcial: un vehículo solo puede tener una orden abierta (red de seguridad).
- Trigger `before update` en `ordenes` para `actualizado_en`, porque la columna no es editable directo.

## Siguiente paso
- `functions.sql`: `mi_rol()`, trigger de perfil y funciones RPC de negocio.
