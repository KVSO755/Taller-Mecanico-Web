# 05 · Permisos por columna y políticas RLS

**Fecha:** 21/11/2026 11:07
**Feature / área:** Infraestructura (Supabase) — seguridad de F01–F08

## Qué se trabajó
- Se quitaron todos los permisos por defecto de Supabase a `anon` y `authenticated` y se otorgó solo lo mínimo.
- `select` para usuarios con sesión; la RLS decide qué filas ve cada rol.
- Permisos por columna: el cliente edita solo nombre/teléfono de su perfil y marca/modelo/año de sus vehículos;
  el taller edita solo diagnóstico y trabajo realizado de órdenes no entregadas.
- Políticas RLS por tabla para cliente, empleado y admin.

## Archivos
- `supabase/policies.sql` — paso 3 de 3.

## Decisiones y notas
- RLS filtra filas, no columnas: sin los permisos por columna un cliente podría cambiarse el rol a admin.
- `citas`, `ordenes` (estatus) y `cambios_estatus` no tienen escritura directa: todo pasa por las funciones RPC.
- Las políticas usan `(select public.mi_rol())` para que la función se evalúe una vez por consulta.
- Un usuario desactivado no ve nada porque `mi_rol()` devuelve null.

## Siguiente paso
- `seed.sql` con datos de demo.
