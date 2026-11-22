# 21 · Inventario de refacciones

**Fecha:** 21/11/2026 23:07
**Feature / área:** F10 · Inventario

## Qué se trabajó
- Pantalla de inventario: tabla (escritorio) o fichas (celular) con código, pieza, compatibilidad, existencias,
  mínimo, costo y estado (Disponible, Bajo stock, Agotado, Inactiva).
- Búsqueda por código, nombre o vehículo; filtros por estado, **marca** y **modelo común**; todo guardado en la URL.
- Detalle de pieza: registrar entrada, ajustar existencias (con motivo obligatorio), editar, desactivar/activar
  e historial de movimientos.
- En la orden: "Refacciones usadas" con subtotales y total; agregar piezas proponiendo primero las compatibles con el vehículo.
- Para el cliente: las piezas usadas en su servicio (nombre y cantidad, sin costos).

## Archivos
- `src/services/inventario.js`
- `src/pages/taller/Inventario.jsx`, `src/pages/taller/DetallePieza.jsx`
- `src/components/RefaccionesOrden.jsx`, `src/components/RefaccionesCliente.jsx`
- `src/utils/inventario.js`, `src/utils/moneda.js`, `src/utils/catalogoVehiculos.js`

## Decisiones y notas
- Las existencias nunca se editan directo: todo cambio es un movimiento registrado (entrada, salida, devolución o ajuste).
- No se puede usar más de lo que hay; la BD bloquea la pieza mientras descuenta.
- La búsqueda escapa los caracteres especiales antes de consultar la BD.

## Siguiente paso
- Facturación (F11).
