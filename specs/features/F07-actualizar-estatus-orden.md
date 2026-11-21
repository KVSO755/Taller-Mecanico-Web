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
- Acción "Avanzar a {siguiente estatus}".

## Flujo principal

1. El empleado abre `/taller/ordenes` (por defecto muestra las órdenes abiertas, de la más antigua a la más nueva).
2. Entra a una orden en `/taller/ordenes/:id`.
3. Ve: vehículo, cliente y teléfono, kilometraje, estatus actual, diagnóstico, trabajo realizado y la bitácora de cambios.
4. Edita diagnóstico o trabajo realizado y presiona "Guardar notas" (`update` directo solo de esas dos columnas; empleado/admin y solo si la orden no está `entregado`).
5. Presiona "Avanzar a {siguiente}" y confirma.
6. La función `avanzar_estatus_orden` (`rpc`; no hay `update` directo de `estatus`) valida y cambia el estatus, registra el cambio en la bitácora con quién y cuándo.
7. La pantalla muestra el nuevo estatus.

## Reglas de avance

- Solo se avanza **un paso** a la vez y nunca hacia atrás.
- Para pasar a `en_reparacion` el diagnóstico debe estar escrito.
- Para pasar a `listo` el trabajo realizado debe estar escrito.
- Al pasar a `entregado` se guarda `entregado_en`; la orden queda cerrada y ya no se edita.

## Flujo — Vista del cliente

En `/cliente/vehiculos/:id` el cliente ve la orden abierta con una barra de progreso de 5 pasos, el diagnóstico y la fecha del último cambio. No ve botones de edición.

## Casos de error

| Situación | Mensaje |
|---|---|
| Falta diagnóstico al pasar a reparación | "Escribe el diagnóstico antes de pasar a reparación." |
| Falta trabajo realizado al pasar a listo | "Describe el trabajo realizado antes de marcar como listo." |
| Otro empleado ya avanzó la orden | "La orden ya fue actualizada por otra persona." y se recarga. |
| Orden entregada | Sin botones de edición; aviso "Orden cerrada". |
| Sin órdenes abiertas | "No hay órdenes abiertas." |
| Falla de conexión | "No se pudo actualizar la orden. Intenta de nuevo." |

## Resultado esperado

El estatus cambia y el cliente lo ve en el detalle de su vehículo al recargar.

## Criterios de aceptación

- [ ] El empleado ve la lista de órdenes abiertas y puede filtrar por estatus.
- [ ] Solo aparece el botón para avanzar al siguiente estatus.
- [ ] No se puede pasar a `en_reparacion` sin diagnóstico.
- [ ] No se puede pasar a `listo` sin trabajo realizado.
- [ ] Cada cambio queda en la bitácora con usuario y fecha.
- [ ] Una orden `entregado` no se puede editar.
- [ ] El cliente ve el estatus actual con barra de progreso y no puede modificarlo.
- [ ] Un cliente que intenta actualizar una orden (desde la consola) es rechazado.
- [ ] Un empleado que intenta `update ordenes set estatus=…` directo es rechazado (solo puede cambiar `diagnostico` y `trabajo_realizado`).
- [ ] Un empleado que intenta guardar notas en una orden `entregado` es rechazado.

## Tasks

- [ ] SQL: función `avanzar_estatus_orden(orden_id, estatus_esperado)` (`SECURITY DEFINER`, `set search_path = public`, solo empleado/admin; valida paso siguiente, campos obligatorios, escribe bitácora; usa `estatus_esperado` para detectar cambios simultáneos).
- [ ] SQL: `revoke update` general en `ordenes` y `grant update (diagnostico, trabajo_realizado)`; política RLS para que solo empleado/admin lo usen y solo si `estatus <> 'entregado'`. Trigger `before update` que actualiza `actualizado_en`.
- [ ] `services/ordenes.js`: `listarOrdenes`, `obtenerOrden`, `guardarNotas` (update directo de las dos columnas), `avanzarEstatus` (vía `rpc`).
- [ ] Pantalla `taller/Ordenes` con filtro.
- [ ] Pantalla `taller/DetalleOrden` con notas, botón de avance y bitácora.
- [ ] Componente `ProgresoOrden` (5 pasos) usado por taller y cliente.
- [ ] Mostrar la orden abierta en `cliente/DetalleVehiculo`.
- [ ] Probar criterios de aceptación.
