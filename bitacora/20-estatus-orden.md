# 20 · Órdenes: lista, detalle y avance de estatus

**Fecha:** 21/11/2026 22:22
**Feature / área:** F07 · Actualizar estatus de la orden (y F09)

## Qué se trabajó
- Lista de órdenes con pestañas (Mis trabajos, Abiertas, Sin asignar, y por estatus), columna "Trabajo"
  (diagnóstico o, si no hay, el motivo de la cita) y columna "Mecánico".
- Detalle de la orden: folio y placa, estatus, avance en 5 pasos, notas (diagnóstico, trabajo realizado, mano de obra),
  un único botón "Avanzar a {siguiente}" con confirmación, datos del vehículo y cliente, y bitácora de cambios.
- Para el admin: selector "Asignar a" para asignar o reasignar el mecánico.
- Componente del avance en 5 pasos numerados (firma del diseño), que en pantallas angostas se pone en vertical.

## Archivos
- `src/pages/taller/Ordenes.jsx`, `src/pages/taller/DetalleOrden.jsx`
- `src/components/ProgresoOrden.jsx`
- `src/utils/estatusOrden.js`, `src/utils/trabajo.js`

## Decisiones y notas
- Solo se avanza un paso a la vez; para pasar a reparación se exige diagnóstico, para "listo" el trabajo realizado
  y para "entregado" la mano de obra. Lo valida la BD.
- Solo el mecánico asignado y el admin pueden avanzar y escribir notas; los demás ven la orden en solo lectura.
- Si otra persona ya avanzó la orden: "La orden ya fue actualizada por otra persona." y se recarga.

## Siguiente paso
- Inventario de refacciones (F10).
