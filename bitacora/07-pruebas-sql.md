# 07 · Pruebas de seguridad y reglas en la base de datos

**Fecha:** 21/11/2026 12:37
**Feature / área:** Calidad — F01 a F08

## Qué se trabajó
- `tests.sql` con 14 grupos de pruebas que se ejecutan como cada rol (cliente, empleado, admin, anon) dentro de `begin … rollback`, así que no dejan datos.
- Cubre: permisos por columna (nadie se cambia el rol ni edita el km), RLS entre clientes, capacidad de 3 citas por bloque,
  domingo / fechas pasadas / segunda cita activa, cancelar con menos de 1 h, cancelación automática a los 15 min,
  reglas de `crear_orden` y `avanzar_estatus_orden`, cambio de rol solo por admin, usuario desactivado y acceso anónimo.
- Se corrió contra la base real en Supabase: todas pasaron.

## Archivos
- `supabase/tests.sql`

## Decisiones y notas
- Un update del cliente sobre `diagnostico` no da "permission denied" (la columna tiene permiso para el taller): la RLS lo deja en 0 filas. La prueba verifica eso.
- Cualquier fallo lanza "FALLÓ: …" y detiene el script; "Success" significa que todo pasó.

## Siguiente paso
- Documentar el producto y el sistema de diseño (PRODUCT.md, DESIGN.md).
