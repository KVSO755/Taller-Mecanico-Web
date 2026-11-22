# Feature F07: Actualizar estatus de la orden

## Objetivo

Que el taller registre el avance del trabajo y el cliente sepa en qué etapa está su vehículo sin llamar.

## Actor

Empleado y Administrador (actualizan). Cliente (solo consulta).

## Precondiciones

- Existe una orden creada (F06).

## Ciclo de estatus

```text
recibido → en_diagnostico → en_reparacion → listo → entregado
```

| Estatus | Se muestra al cliente como |
|---|---|
| recibido | Recibido en el taller |
| en_diagnostico | En diagnóstico |
| en_reparacion | En reparación |
| listo | Listo para recoger |
| entregado | Entregado |

## Datos de entrada

- Diagnóstico (texto).
- Trabajo realizado (texto).
- Mano de obra (MXN, ≥ 0; F11, Q45).
- Acción "Avanzar a {siguiente estatus}".

## Flujo principal

1. El empleado abre `/taller/ordenes` (por defecto muestra las órdenes abiertas, de la más antigua a la más nueva; el filtro son pestañas: "Abiertas" y un estatus por pestaña).
2. Entra a una orden en `/taller/ordenes/:id`.
3. Ve: vehículo, cliente y teléfono, kilometraje, estatus actual, diagnóstico, trabajo realizado, las refacciones usadas con su total (F10) y la bitácora de cambios.
4. Edita diagnóstico, trabajo realizado o mano de obra y presiona "Guardar notas" (`update` directo solo de esas tres columnas; empleado/admin y solo si la orden no está `entregado`).
5. Presiona "Avanzar a {siguiente}" y confirma.
6. La función `avanzar_estatus_orden` (`rpc`; no hay `update` directo de `estatus`) valida y cambia el estatus, registra el cambio en la bitácora con quién y cuándo.
7. La pantalla muestra el nuevo estatus.

## Reglas de avance

- Un empleado solo avanza y edita las órdenes **asignadas a él**; el administrador, cualquiera (ver F09, Q31). Una orden sin asignar solo la avanza el administrador.
- Solo se avanza **un paso** a la vez y nunca hacia atrás.
- Para pasar a `en_reparacion` el diagnóstico debe estar escrito.
- Para pasar a `listo` el trabajo realizado debe estar escrito.
- **Q48:** para pasar a `entregado` la mano de obra debe estar capturada (≥ 0; 0 es válido); si es `null`, la función rechaza el avance.
- Al pasar a `entregado` se guarda `entregado_en`; la orden queda cerrada y ya no se edita.

## Flujo — Vista del cliente

En `/cliente/vehiculos/:id` el cliente ve la orden abierta con una barra de progreso de 5 pasos (`ProgresoOrden`: 5 llamadas numeradas sobre una línea guía, con el paso actual marcado), el diagnóstico y la fecha del último cambio. No ve botones de edición.

## Casos de error

| Situación | Mensaje |
|---|---|
| Falta diagnóstico al pasar a reparación | "Escribe el diagnóstico antes de pasar a reparación." |
| Falta trabajo realizado al pasar a listo | "Describe el trabajo realizado antes de marcar como listo." |
| Falta la mano de obra al pasar a entregado (Q48) | "Captura la mano de obra antes de marcar como entregado." |
| Otro empleado ya avanzó la orden | "La orden ya fue actualizada por otra persona." y se recarga. |
| Orden asignada a otro mecánico | "Esta orden está asignada a otro mecánico." (notas en solo lectura, sin botón de avanzar) |
| Orden sin asignar (empleado) | "Esta orden no tiene mecánico asignado. Pide al administrador que la asigne." |
| Orden entregada | Sin botones de edición; aviso "Orden cerrada". |
| Sin órdenes abiertas | "No hay órdenes abiertas." |
| Falla de conexión | "No se pudo actualizar la orden. Intenta de nuevo." |

## Resultado esperado

El estatus cambia y el cliente lo ve en el detalle de su vehículo al recargar.

## Criterios de aceptación

- [ ] El empleado ve la lista de órdenes abiertas y puede filtrar por estatus.
- [ ] Solo aparece el botón para avanzar al siguiente estatus.
- [x] No se puede pasar a `en_reparacion` sin diagnóstico.
- [x] No se puede pasar a `listo` sin trabajo realizado.
- [x] Cada cambio queda en la bitácora con usuario y fecha.
- [x] Una orden `entregado` no se puede editar.
- [ ] No se puede pasar a `entregado` sin mano de obra capturada: "Captura la mano de obra antes de marcar como entregado." (Q48); con mano de obra 0 sí se puede.
- [ ] El cliente ve el estatus actual con barra de progreso y no puede modificarlo.
- [x] Un cliente que intenta actualizar una orden (desde la consola) es rechazado.
- [x] Un empleado que intenta `update ordenes set estatus=…` directo es rechazado (solo puede cambiar `diagnostico`, `trabajo_realizado` y `mano_obra`).
- [x] Un empleado que intenta guardar notas en una orden `entregado` es rechazado.

## Tasks

- [x] SQL: función `avanzar_estatus_orden(orden_id, estatus_esperado)` (`SECURITY DEFINER`, `set search_path = public`, solo empleado/admin; valida paso siguiente, campos obligatorios, escribe bitácora; usa `estatus_esperado` para detectar cambios simultáneos).
- [x] SQL: `revoke update` general en `ordenes` y `grant update (diagnostico, trabajo_realizado)`; política RLS para que solo empleado/admin lo usen y solo si `estatus <> 'entregado'`. Trigger `before update` que actualiza `actualizado_en`.
- [x] `services/ordenes.js`: `listarOrdenes`, `obtenerOrden`, `guardarNotas` (update directo de las dos columnas), `avanzarEstatus` (vía `rpc`).
- [x] Pantalla `taller/Ordenes` con filtro.
- [x] Pantalla `taller/DetalleOrden` con notas, botón de avance y bitácora.
- [x] Componente `ProgresoOrden` (5 llamadas numeradas sobre una línea guía) usado por taller y cliente y en las fichas de `taller/Inicio`.
- [x] Mostrar la orden abierta en `cliente/DetalleVehiculo`.
- [x] SQL (F11): `ordenes.mano_obra numeric(10,2) check (>= 0)`, en el `grant update (diagnostico, trabajo_realizado, mano_obra)`; `avanzar_estatus_orden` exige `mano_obra` al pasar a `entregado` (Q48).
- [ ] `taller/DetalleOrden`: campo "Mano de obra (MXN)" junto a las notas (F11).
- [ ] Probar criterios de aceptación.
