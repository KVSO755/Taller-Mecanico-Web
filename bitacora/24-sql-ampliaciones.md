# 24 · Base de datos: asignación, inventario, facturación y seguridad

**Fecha:** 22/11/2026 01:22
**Feature / área:** F09, F10, F11 y endurecimiento de seguridad

## Qué se trabajó
- **F09:** columna `ordenes.asignado_a`, funciones `asignar_orden` y `nombre_mecanico`; solo el mecánico asignado
  o el admin avanzan la orden y escriben notas; una orden creada por un empleado queda asignada a él.
- **F10:** tablas `piezas`, `movimientos_inventario` y `orden_piezas`; funciones para crear piezas, entradas, ajustes,
  usar y quitar piezas de una orden (con bloqueo de la pieza) y `piezas_usadas` para el cliente sin costos.
  Catálogo de demostración de 76 piezas de 11 marcas.
- **F11:** `ordenes.mano_obra`, tablas `facturas` y `factura_conceptos` y función `solicitar_factura`
  (IVA 16 %, folio, una factura por orden, conceptos congelados).
- **Seguridad:** restricciones de formato y longitud (teléfono de 10 dígitos, nombres, motivos, diagnósticos…).
- **Pruebas:** grupos 15 a 18 en `tests.sql`; todo pasa contra la base real.

## Archivos
- `supabase/schema.sql`, `functions.sql`, `policies.sql`, `seed.sql`, `tests.sql`

## Decisiones y notas
- Todo es re-ejecutable en el SQL Editor (`create or replace`, `if not exists`, `not valid` en las restricciones nuevas).
- Las existencias de piezas solo cambian por movimientos y las pruebas comprueban que siempre cuadran.
- Ningún archivo contiene contraseñas ni datos del proyecto de Supabase.

## Siguiente paso
- Specs actualizadas (F09, F10, F11, seguridad y registro de cambios).
