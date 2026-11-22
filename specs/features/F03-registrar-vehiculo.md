# Feature F03: Registrar vehículo

## Objetivo

Que el cliente registre sus vehículos para poder agendar citas y consultar su historial.

## Actor

Cliente.

## Precondiciones

- El cliente tiene sesión iniciada.

## Datos de entrada

- placa;
- marca;
- modelo;
- año;
- kilometraje actual.

## Flujo principal

1. El cliente presiona "Agregar vehículo" en su inicio (`/cliente`).
2. El sistema muestra el formulario en `/cliente/vehiculos/nuevo`.
3. El cliente captura los datos y presiona "Guardar".
4. El sistema normaliza la placa (mayúsculas, sin espacios ni guiones) y valida.
5. El vehículo se guarda asociado al cliente.
6. El cliente regresa a `/cliente` y el vehículo aparece en "Mis vehículos".

## Flujo alterno — Editar datos del vehículo

Desde el detalle del vehículo el cliente puede corregir **marca, modelo y año**. La placa no se edita. El kilometraje se captura al registrar y después solo lo actualizan las órdenes de servicio (`crear_orden`, F06); el cliente no lo edita.

## Validaciones

- Placa: obligatoria, 5 a 8 caracteres alfanuméricos después de normalizar.
- Marca y modelo: obligatorios.
- Año: número entre 1950 y año actual + 1.
- Kilometraje: entero mayor o igual a 0.
- El botón "Guardar" está deshabilitado mientras falte un campo obligatorio o se esté enviando.

## Casos de error

| Situación | Mensaje |
|---|---|
| La placa ya existe | "Ya hay un vehículo registrado con esta placa." |
| Campo inválido | Mensaje bajo el campo (ej. "El año debe estar entre 1950 y 2027"). |
| Falla al guardar | "No se pudo guardar el vehículo. Intenta de nuevo." (los datos del formulario se conservan) |
| Cliente sin vehículos | En inicio: "Aún no tienes vehículos registrados" + botón "Agregar vehículo". |

## Resultado esperado

El vehículo aparece en la lista del cliente y está disponible para agendar citas.

## Criterios de aceptación

- [ ] El cliente puede abrir el formulario desde su inicio.
- [ ] "abc-123" se guarda como "ABC123".
- [ ] No se puede guardar con campos obligatorios vacíos.
- [ ] No se puede guardar un año fuera de rango ni kilometraje negativo.
- [x] Una placa repetida muestra el mensaje de error y no se guarda.
- [x] El vehículo aparece en "Mis vehículos" después de guardar.
- [x] Un cliente no ve los vehículos de otro cliente.
- [x] El cliente puede editar marca, modelo y año de su vehículo, pero no la placa ni el kilometraje.
- [x] Un cliente que intenta `update vehiculos set kilometraje=…` o cambiar `cliente_id` desde la consola es rechazado.
- [ ] Un cliente no puede insertar un vehículo a nombre de otro (`cliente_id` distinto de `auth.uid()`).

## Tasks

- [x] SQL: tabla `vehiculos` (`cliente_id` con default `auth.uid()`) + RLS (cliente: ver los suyos; insert solo con `cliente_id = auth.uid()` y rol `cliente`; empleado/admin: ver todos).
- [x] SQL: `revoke` de insert/update general y `grant` por columna: `insert` (placa, marca, modelo, anio, kilometraje) y `update (marca, modelo, anio)` solo de los suyos.
- [x] `services/vehiculos.js`: `listarMisVehiculos`, `crearVehiculo`, `actualizarVehiculo` (solo marca, modelo y año), `obtenerVehiculo`.
- [x] Componente `FormVehiculo` con validaciones.
- [x] Pantalla `cliente/NuevoVehiculo`.
- [x] Sección "Mis vehículos" en `cliente/Inicio` con estado vacío.
- [x] Traducir el error de `unique` (código `23505`) al mensaje de placa repetida.
- [ ] Probar criterios de aceptación.
