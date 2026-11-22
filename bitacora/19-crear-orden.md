# 19 · Crear orden de servicio

**Fecha:** 21/11/2026 21:37
**Feature / área:** F06 · Crear orden (y base de F07, F09, F10)

## Qué se trabajó
- Servicio de órdenes: crear, buscar vehículo por placa, cita para la orden, orden abierta del vehículo,
  listar con filtros, detalle, guardar notas, avanzar estatus, asignar mecánico y nombre del mecánico.
- Pantalla "Nueva orden" en dos modos:
  - **Desde una cita** confirmada de hoy (vehículo y cliente precargados).
  - **Directa**: buscar el vehículo por placa.
- Kilometraje obligatorio y nunca menor al registrado; diagnóstico inicial opcional.
- Si el admin crea la orden elige mecánico (o "Sin asignar"); si la crea un empleado, se le asigna a él.

## Archivos
- `src/services/ordenes.js`
- `src/pages/taller/NuevaOrden.jsx`
- `src/components/CampoSelect.jsx` — select con etiqueta y error accesibles.

## Decisiones y notas
- Todo pasa por la función `crear_orden` de la BD en una sola transacción: orden, cita atendida, km del vehículo y bitácora.
- Avisos: placa no encontrada, km menor, vehículo con orden abierta (con enlace a ella), cita que ya tiene orden,
  y vehículo con una cita futura (con enlace para cancelarla en la agenda).
- Como `ordenes` tiene dos relaciones con `perfiles` (creó y asignado), las consultas indican cuál usar.

## Siguiente paso
- F07: lista de órdenes, detalle y avance de estatus.
