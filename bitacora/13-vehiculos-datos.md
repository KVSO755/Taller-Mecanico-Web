# 13 · Vehículos: datos y formulario

**Fecha:** 21/11/2026 17:07
**Feature / área:** F03 · Registrar vehículo (y base de F08)

## Qué se trabajó
- Servicio de vehículos: listar los del cliente, crear, editar marca/modelo/año, obtener uno y su historial completo
  (órdenes con su cita, bitácora de cambios y factura) en una sola consulta.
- Normalización de placas: mayúsculas, sin espacios ni guiones (`abc-123` → `ABC123`), de 5 a 8 caracteres.
- Formulario reutilizable para registrar y editar, con validaciones de año, kilometraje y campos obligatorios.

## Archivos
- `src/services/vehiculos.js`
- `src/utils/placa.js`
- `src/components/FormVehiculo.jsx`

## Decisiones y notas
- No se envía `cliente_id`: la BD lo toma de la sesión (`auth.uid()`), así nadie registra un carro a nombre de otro.
- El cliente no edita el kilometraje después de registrar (solo lo actualizan las órdenes).
- Placa repetida → "Ya hay un vehículo registrado con esta placa."

## Siguiente paso
- Pantallas del cliente: inicio y registro de vehículo.
