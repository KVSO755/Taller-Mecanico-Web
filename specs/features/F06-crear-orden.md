# Feature F06: Crear orden de servicio

## Objetivo

Registrar formalmente que el taller recibió un vehículo para trabajarlo, ya sea porque llegó a su cita o porque llegó sin cita.

## Actor

Empleado y Administrador.

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin`.
- **Desde cita:** la cita está `confirmada` y su fecha local (America/Tijuana) es **hoy**, aunque la hora ya haya pasado. Si el cliente llega con la cita `pendiente`, el empleado primero la confirma (F05; puede hacerlo hasta 15 minutos después del inicio).
- **Directa:** el vehículo ya está registrado. Si el cliente es nuevo, primero se registra él mismo (F01) y registra su vehículo (F03).

## Datos de entrada

- vehículo (precargado si viene de una cita; si es directa, se busca por placa);
- kilometraje de llegada;
- diagnóstico inicial (opcional: puede escribirse después en F07).

## Flujo principal — Desde una cita

1. En `/taller/citas` el empleado presiona "Crear orden" en una cita confirmada.
2. El sistema abre `/taller/ordenes/nueva?citaId=…` con vehículo y cliente precargados.
3. El empleado captura el kilometraje y, si quiere, un diagnóstico inicial.
4. Presiona "Crear orden".
5. El sistema crea la orden con estatus `recibido`, la liga a la cita, pasa la cita a `atendida`, actualiza el kilometraje del vehículo y registra el primer `CambioEstatus`.
6. Redirige a `/taller/ordenes/:id`.

## Flujo alterno — Orden directa (sin cita)

1. En `/taller/ordenes` presiona "Nueva orden".
2. Escribe la placa y presiona "Buscar".
3. El sistema muestra el vehículo y su dueño.
4. Si el vehículo tiene una cita activa futura, la pantalla muestra "Este vehículo tiene cita el {fecha}." con un botón "Cancelar cita" (`cancelar_cita`). La orden directa se permite de todos modos; la cita **no** se cancela sola.
5. Continúa igual que el paso 3 del flujo principal, con `cita_id = null`.

## Validaciones

- Vehículo obligatorio.
- Kilometraje obligatorio, entero, **mayor o igual** al kilometraje registrado del vehículo (lo valida `crear_orden`, sin trigger aparte; después la misma función actualiza `vehiculos.kilometraje`).
- Un vehículo no puede tener dos órdenes abiertas (estatus distinto de `entregado`).
- Una cita solo puede generar una orden.
- Desde cita: la cita debe estar `confirmada` y ser de hoy (hora local de Tijuana).

## Casos de error

| Situación | Mensaje |
|---|---|
| Placa no encontrada | "No hay ningún vehículo con esa placa. El cliente debe registrarlo primero." |
| Kilometraje menor al registrado | "El kilometraje no puede ser menor a {km} km (último registrado)." |
| El vehículo ya tiene una orden abierta | "Este vehículo ya tiene la orden #{id} abierta." + enlace a ella. |
| La cita ya tiene orden | "Esta cita ya tiene una orden." + enlace. |
| La cita no está confirmada o no es de hoy | "Solo se puede crear la orden de una cita confirmada de hoy." |
| Falla al guardar | "No se pudo crear la orden. Intenta de nuevo." |

## Resultado esperado

La orden aparece en `/taller/ordenes` con estatus "Recibido", y el cliente ve en el detalle de su vehículo que está en el taller.

## Criterios de aceptación

- [ ] Desde una cita confirmada se crea la orden con el vehículo precargado.
- [ ] Al crearla, la cita pasa a `atendida`.
- [ ] No se crea orden desde una cita `pendiente` ni desde una cita de otro día.
- [ ] Una cita confirmada de hoy cuya hora ya pasó sí permite crear la orden.
- [ ] En una orden directa con cita futura activa se muestra "Este vehículo tiene cita el {fecha}." con botón para cancelarla, y la cita no se cancela sola.
- [ ] Se puede crear una orden directa buscando por placa.
- [ ] No se acepta un kilometraje menor al del vehículo.
- [ ] Al crear la orden, el kilometraje del vehículo se actualiza.
- [ ] No se pueden crear dos órdenes abiertas para el mismo vehículo.
- [ ] La orden nueva tiene estatus `recibido` y un registro en la bitácora de cambios.
- [ ] El cliente ve el estatus "Recibido" en su vehículo.

## Tasks

- [ ] SQL: tablas `ordenes` y `cambios_estatus` + RLS (solo `select`; sin insert/update directo salvo las notas de F07).
- [ ] SQL: función `crear_orden(vehiculo_id, cita_id, kilometraje, diagnostico)` (`SECURITY DEFINER`, `set search_path = public`, solo empleado/admin) que valida el kilometraje contra el del vehículo, que la cita esté `confirmada` y sea de hoy (America/Tijuana), y hace todo en una transacción (orden, cita atendida, `vehiculos.kilometraje`, bitácora).
- [ ] `services/ordenes.js`: `crearOrden` (vía `rpc`), `buscarVehiculoPorPlaca`, `citaActivaDeVehiculo`.
- [ ] Pantalla `taller/NuevaOrden` (modo cita y modo directo).
- [ ] Aviso de cita futura con botón "Cancelar cita" en el modo directo de `taller/NuevaOrden`.
- [ ] Botón "Crear orden" en `taller/Citas` (solo citas confirmadas de hoy).
- [ ] Probar criterios de aceptación.
