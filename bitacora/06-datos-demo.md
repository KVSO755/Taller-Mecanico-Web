# 06 · Datos de demostración

**Fecha:** 21/11/2026 12:01
**Feature / área:** Infraestructura (Supabase) — datos para la demo de F01–F08

## Qué se trabajó
- `seed.sql` que prepara la base para la demo: asigna roles a las 4 cuentas de prueba y crea vehículos, citas y órdenes.
- Fechas siempre relativas a hoy en `America/Tijuana` (nunca fijas), saltando domingos.
- Agenda del siguiente día hábil con estados mezclados y un bloque lleno (3 citas a la misma hora) para mostrar la capacidad.
- Historial: dos servicios entregados de ABC123 con su bitácora completa y una orden abierta en diagnóstico.

## Archivos
- `supabase/seed.sql` — se corre en el SQL Editor después de crear las cuentas desde `/registro`.

## Decisiones y notas
- Las cuentas se crean desde la app (no se insertan en `auth.users` a mano) y el seed las busca por correo.
- Es re-ejecutable: borra solo los datos de cliente1 y cliente2 antes de volver a insertar.
- Respeta las reglas de la BD: una cita activa por vehículo, máximo 3 por bloque y `cancelada_por` coherente.

## Siguiente paso
- `tests.sql`: pruebas de seguridad y reglas de negocio.
