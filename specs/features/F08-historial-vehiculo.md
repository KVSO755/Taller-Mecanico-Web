# Feature F08: Consultar historial del vehículo

## Objetivo

Tener una bitácora de todo lo que se le ha hecho a cada vehículo, para que el cliente y el taller la consulten sin depender de papeles.

## Actor

Cliente (solo sus vehículos). Empleado y Administrador (cualquier vehículo).

## Precondiciones

- El vehículo existe.

## Datos de entrada

- `vehiculoId` (desde "Mis vehículos" o desde una orden).
- Para el taller: búsqueda por placa.

## Qué muestra

**Encabezado:** placa, marca, modelo, año, kilometraje actual, dueño (solo para el taller).

**Orden en curso** (si existe): estatus con barra de progreso (F07).

**Servicios anteriores** (órdenes `entregado`), del más reciente al más antiguo:

- fecha de entrega;
- kilometraje al recibirlo;
- motivo de la cita (si vino de cita);
- diagnóstico;
- trabajo realizado;
- refacciones usadas (nombre y cantidad, **sin costos**; F10, Q41).

Al expandir un servicio se ve su bitácora de cambios de estatus con fechas.

## Flujo principal — Cliente

1. En `/cliente` presiona un vehículo de "Mis vehículos".
2. El sistema abre `/cliente/vehiculos/:id` con encabezado, orden en curso e historial.

## Flujo principal — Taller

1. Desde el detalle de una orden presiona "Ver historial del vehículo", o en el inicio de `/taller` busca por placa.
2. El sistema abre `/taller/vehiculos/:id`.

## Validaciones

- El cliente solo puede abrir vehículos suyos (RLS; un usuario con `activo = false` no ve nada porque `mi_rol()` devuelve `null`). Si cambia el `id` en la URL a uno ajeno, ve "Vehículo no encontrado".

## Casos de error

| Situación | Mensaje |
|---|---|
| Vehículo sin servicios | "Este vehículo aún no tiene servicios registrados." |
| Vehículo no existe o no es del cliente | "Vehículo no encontrado." + botón para regresar. |
| Placa no encontrada (taller) | "No hay ningún vehículo con esa placa." |
| Falla de conexión | "No se pudo cargar el historial." + botón "Reintentar". |

## Resultado esperado

Cliente y taller ven la misma información del vehículo; cada servicio entregado aparece automáticamente sin capturarlo de nuevo.

## Criterios de aceptación

- [x] El cliente ve el historial de cada uno de sus vehículos.
- [x] Al entregar una orden (F07), aparece en el historial sin pasos extra.
- [ ] Los servicios se ordenan del más reciente al más antiguo.
- [ ] Un vehículo sin servicios muestra el mensaje vacío.
- [ ] Un cliente que cambia el id en la URL a un vehículo ajeno ve "Vehículo no encontrado".
- [ ] El taller encuentra el historial buscando por placa.

## Tasks

- [x] `services/vehiculos.js`: `historialVehiculo(id)` (vehículo + órdenes con su cita y bitácora en una consulta con `select` anidado).
- [x] Componente `HistorialServicios` (lista expandible) reutilizado por cliente y taller.
- [x] Pantalla `cliente/DetalleVehiculo` (encabezado + orden en curso + historial).
- [x] Pantalla `taller/HistorialVehiculo`.
- [x] Buscador por placa en `taller/Inicio`.
- [ ] Probar criterios de aceptación.
