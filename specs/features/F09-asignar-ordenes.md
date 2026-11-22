# Feature F09: Asignar órdenes a un mecánico

## Objetivo

Que cada orden abierta tenga un mecánico responsable: solo él (y el administrador) la avanza y edita sus notas, cada empleado ve de un vistazo "Mis trabajos" y el cliente sabe quién atiende su vehículo.

## Actor

Administrador (asigna, reasigna y quita la asignación). Empleado (trabaja sus órdenes; consulta las demás). Cliente (solo ve el nombre del mecánico).

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin`.
- Para asignar: existe una orden abierta (estatus distinto de `entregado`) y un empleado activo (rol `empleado` o `admin`).
- Depende de F06 (crear orden), F07 (estatus) y F02 (empleados).

## Datos de entrada

- Orden.
- Mecánico: un empleado activo (o el propio admin), o "Sin asignar".

## Flujo — Asignar al crear la orden (Q32)

1. En `/taller/ordenes/nueva`, si quien crea es un **empleado**, la pantalla muestra "Se asignará a ti" y `crear_orden` deja la orden asignada a él (ignora cualquier otro valor).
2. Si quien crea es el **administrador**, ve el selector "Mecánico" (empleados activos y él mismo) con la opción "Sin asignar" por defecto.
3. `crear_orden` recibe `p_asignado_a` y lo guarda en `ordenes.asignado_a`.

## Flujo — Reasignar (admin)

1. En `/taller/ordenes/:id` (orden no entregada) el administrador ve "Asignar a" con el selector de mecánico y el botón "Asignar".
2. Elige otro mecánico y presiona "Asignar".
3. `asignar_orden` (`rpc`) cambia `asignado_a`; la línea "Mecánico: {nombre}" se actualiza. No se registra bitácora de asignaciones.

## Flujo — Quitar la asignación (admin)

1. En el mismo selector el administrador elige "Sin asignar" y presiona "Asignar".
2. `asignar_orden` recibe `p_empleado_id = null`; la orden queda "Sin asignar" y solo el administrador puede avanzarla o editar sus notas.

## Flujo — Vista "Mis trabajos" (empleado)

1. `/taller` muestra, antes de "Órdenes abiertas", la sección "Mis trabajos": sus órdenes abiertas.
2. `/taller/ordenes` tiene la pestaña "Mis trabajos" (por defecto para el empleado) además de las existentes; el administrador ve además "Sin asignar".
3. La lista muestra la columna "Mecánico".
4. En una orden que no es suya, el empleado ve el detalle pero con notas en solo lectura, sin botón de avanzar y con el aviso correspondiente.
5. El administrador, en `/taller`, ve el aviso "Órdenes sin asignar: N" con enlace a la pestaña "Sin asignar".

## Flujo — Vista del cliente (Q33)

En `/cliente/vehiculos/:id`, en la orden en curso, el cliente ve "Mecánico: {nombre}" (función `nombre_mecanico`). Si la orden no tiene mecánico asignado no se muestra la línea. El cliente no ve nada más del empleado.

## Reglas

- **Q31:** solo el mecánico asignado y el administrador avanzan el estatus y guardan notas de una orden. Los demás empleados la ven pero no la editan. Lo valida la base de datos (`avanzar_estatus_orden` y la política RLS `ordenes_update`), no solo la pantalla.
- **Q32:** el administrador asigna y reasigna mientras la orden esté abierta. Si quien crea la orden es un empleado, queda asignada a él; si es el administrador, elige mecánico (opcional). Una orden sin asignar solo la puede avanzar y editar el administrador.
- **Q33:** el cliente ve únicamente el nombre del mecánico asignado a su vehículo (`nombre_mecanico`, solo para el taller o el dueño del vehículo de la orden).
- `ordenes.asignado_a` no se edita directo (sin `GRANT` de columna): solo cambia con `crear_orden` y `asignar_orden`.
- Al desactivar a un empleado sus órdenes abiertas conservan `asignado_a`; el administrador puede reasignarlas (el empleado desactivado ya no puede actuar, `mi_rol()` es `null`).
- `ordenes` tiene dos llaves a `perfiles` (`creada_por` y `asignado_a`): todo embed de PostgREST debe indicar la relación, por ejemplo `asignado:perfiles!ordenes_asignado_a_fkey(id, nombre)`.

## Validaciones

- Solo `admin` ejecuta `asignar_orden` (se valida con `mi_rol()`).
- La orden debe existir y no estar `entregado`.
- El mecánico, si se indica, debe ser un perfil activo con rol `empleado` o `admin`.
- En `crear_orden`, un empleado siempre queda como asignado; el parámetro solo cuenta para el administrador.
- `avanzar_estatus_orden`: si quien llama es empleado, `asignado_a` debe ser su propio id.

## Casos de error

| Situación | Mensaje |
|---|---|
| Un empleado intenta asignar una orden | "Solo el administrador puede hacer este cambio." |
| La orden no existe | "Orden no encontrada." |
| La orden ya fue entregada | "Orden cerrada." |
| El mecánico indicado no es empleado activo (o es un cliente / está desactivado) | "Esa persona no es empleado activo del taller." |
| Un empleado avanza una orden asignada a otro | "Esta orden está asignada a otro mecánico." |
| Un empleado avanza una orden sin asignar | "Esta orden no tiene mecánico asignado. Pide al administrador que la asigne." |
| Un empleado guarda notas de una orden que no es suya | La base no afecta ninguna fila; la pantalla ya las muestra en solo lectura con el aviso anterior. |
| Mis trabajos vacío | "No tienes trabajos abiertos." |
| Sin órdenes sin asignar | "No hay órdenes sin asignar." |
| Falla de conexión | "No se pudo guardar la asignación. Intenta de nuevo." |

## Resultado esperado

Cada orden abierta muestra su mecánico (o "Sin asignar"); el empleado asignado la trabaja, los demás la consultan y el cliente ve el nombre de quien atiende su vehículo.

## Criterios de aceptación

- [ ] Un empleado que crea una orden la ve asignada a él y en "Mis trabajos".
- [ ] El administrador elige mecánico (o "Sin asignar") al crear la orden.
- [ ] El administrador asigna, reasigna y quita la asignación desde el detalle de una orden abierta; en una orden entregada no aparece el selector.
- [ ] Un empleado no asignado ve el detalle con notas en solo lectura, sin botón de avanzar y con el aviso correspondiente.
- [ ] Desde la consola, un empleado que avanza una orden de otro mecánico recibe "Esta orden está asignada a otro mecánico."
- [ ] Desde la consola, un empleado que avanza una orden sin asignar recibe "Esta orden no tiene mecánico asignado. Pide al administrador que la asigne."
- [ ] Desde la consola, el `update` de `diagnostico` por un empleado no asignado afecta 0 filas.
- [ ] Desde la consola, un empleado que llama `asignar_orden` recibe "Solo el administrador puede hacer este cambio."
- [ ] `asignar_orden` rechaza a un cliente o a un empleado desactivado como mecánico.
- [ ] La pestaña "Mis trabajos" es la de inicio del empleado en `/taller/ordenes`; "Sin asignar" solo la ve el administrador.
- [ ] `/taller` muestra "Mis trabajos" al empleado y el conteo de "Órdenes sin asignar" al administrador.
- [ ] La lista de órdenes muestra la columna "Mecánico".
- [ ] El cliente ve "Mecánico: {nombre}" en su vehículo; un cliente ajeno recibe `null` de `nombre_mecanico`.
- [ ] `anon` no puede ejecutar `asignar_orden`, `nombre_mecanico` ni `crear_orden`.

## Tasks

- [x] SQL: columna `ordenes.asignado_a uuid references perfiles(id)` e índice `idx_ordenes_asignado`.
- [x] SQL: `crear_orden(..., p_asignado_a uuid default null)` (con `drop function` de la firma anterior), `asignar_orden(orden_id, empleado_id)`, `nombre_mecanico(orden_id)` y regla del asignado en `avanzar_estatus_orden`; helper interno `_validar_mecanico`.
- [x] SQL: política `ordenes_update` (admin siempre si no entregada; empleado solo si `asignado_a = auth.uid()`).
- [x] `seed.sql` (órdenes demo asignadas; una abierta sin asignar en JKL789) y grupo 15 de `tests.sql`.
- [ ] Ejecutar en Supabase `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` → `tests.sql`.
- [ ] `services/ordenes.js`: `asignarOrden`, `nombreMecanico`; `crearOrden` con `asignadoA`; listados con `asignado:perfiles!ordenes_asignado_a_fkey(id, nombre)`.
- [ ] `taller/NuevaOrden`: selector "Mecánico" (admin) o "Se asignará a ti" (empleado).
- [ ] `taller/DetalleOrden`: línea "Mecánico", selector "Asignar a" (admin), modo solo lectura para no asignados.
- [ ] `taller/Ordenes`: columna "Mecánico" y pestañas "Mis trabajos" / "Sin asignar".
- [ ] `taller/Inicio`: sección "Mis trabajos" (empleado) y aviso de órdenes sin asignar (admin).
- [ ] `cliente/DetalleVehiculo`: "Mecánico: {nombre}".
- [ ] Probar criterios de aceptación.
