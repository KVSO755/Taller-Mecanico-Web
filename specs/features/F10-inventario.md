# Feature F10: Inventario de refacciones

## Objetivo

Que el taller sepa qué refacciones tiene, cuántas quedan y cuánto cuestan; que al usarlas en una orden se descuenten solas del stock y que el cliente vea qué piezas se le pusieron a su vehículo (sin costos).

## Actor

Empleado y Administrador (gestionan el inventario y usan piezas en las órdenes). Cliente (solo ve nombre y cantidad de las piezas usadas en su vehículo).

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin` (para el inventario).
- Para usar o quitar piezas: existe una orden no entregada (F06) y quien actúa es el administrador o el mecánico asignado (F09).
- Depende de F06 (órdenes), F07 (estatus), F08 (historial del cliente) y F09 (asignación).

## Datos de entrada

- **Pieza:** código, nombre, compatibilidad (texto libre), costo (MXN, 2 decimales), existencias iniciales, stock mínimo.
- **Entrada:** pieza, cantidad, motivo (opcional).
- **Ajuste:** pieza, nuevas existencias, motivo (obligatorio).
- **Uso en orden:** orden, pieza, cantidad.
- El seed incluye un catálogo base por marca (Nissan, Toyota, Mazda, Volkswagen, MG, Mitsubishi, Chevrolet, Honda, Kia, Hyundai, Ford) con precios aproximados de demostración.

## Flujo — Ver el inventario (Q34, Q37, Q39, Q42)

1. En el menú del taller el empleado o el administrador abre "Inventario" (`/taller/inventario`).
2. Ve la tabla de refacciones: Código, Pieza, Compatible con, Existencias, Mínimo, Costo y Estado.
3. El estado se muestra como "Disponible", "Bajo stock" (existencias ≤ mínimo y > 0), "Agotado" (0) o "Inactiva".
4. Puede buscar por código, nombre o compatibilidad (ej. "Versa") y filtrar por "Todas", "Bajo stock y agotadas" o "Inactivas". Desde el aviso de `/taller` llega con `?filtro=bajo`.
5. En celular la tabla se muestra como fichas.
6. **Filtrar el inventario por marca y modelo común (Q42):** el select "Marca" (Todas + catálogo de `utils/catalogoVehiculos.js`, incluye "Universal") y, con marca elegida, los botones de modelo ("Todos" + modelos comunes) filtran por el texto de compatibilidad, combinados con la búsqueda y el estado. Se guardan en la URL (`?marca=&modelo=`, junto a `?filtro=`); al cambiar la marca se limpia el modelo. Se muestra "N piezas", "Limpiar filtros" y, sin resultados, "No hay piezas para {Marca} {Modelo}."

## Flujo — Crear pieza (Q34, Q36)

1. Presiona "Nueva pieza" y llena código, nombre, compatibilidad, costo, existencias iniciales y stock mínimo.
2. `crear_pieza` (`rpc`) normaliza el código (mayúsculas, sin espacios) y crea la pieza. Si las existencias iniciales son mayores a 0 registra un movimiento `entrada` con motivo "Existencia inicial".
3. Al terminar abre el detalle de la pieza.

## Flujo — Detalle de pieza, entradas, ajustes y edición (Q34, Q38)

1. `/taller/inventario/:id` muestra el código grande (estilo placa), nombre, compatibilidad, costo, las existencias con su estado y la tabla de movimientos (Fecha, Tipo, Cantidad con signo, Existencias resultantes, Orden con enlace, Motivo, Quién).
2. **Registrar entrada:** cantidad y motivo opcional → `registrar_entrada` suma al stock y registra un movimiento `entrada`.
3. **Ajustar existencias:** nuevas existencias y motivo obligatorio → `ajustar_existencias` fija el valor y registra un movimiento `ajuste` con la diferencia (positiva o negativa).
4. **Editar:** nombre, compatibilidad, costo y stock mínimo (`update` directo de esas columnas). El código y las existencias no se editan.
5. **Desactivar / Activar:** cambia `activa`. Las piezas no se borran, para conservar el historial.

## Flujo — Usar piezas en una orden (Q35, Q36, Q40, Q43)

1. En `/taller/ordenes/:id` la sección "Refacciones usadas" muestra Código, Pieza, Cant., Costo unit. y Subtotal por fila, y el **Total** de refacciones.
2. Si quien ve la orden es el administrador o el mecánico asignado y la orden no está entregada, ve "Agregar refacción": un buscador de piezas activas (con sus existencias visibles) y la cantidad.
3. `usar_pieza_en_orden` valida, descuenta del stock y registra un movimiento `salida` ligado a la orden. Si la pieza ya estaba en la orden suma la cantidad y conserva su costo unitario original.
4. Cada fila tiene "Quitar" (con confirmación): `quitar_pieza_de_orden` devuelve todo al stock, registra un movimiento `devolucion` y borra la fila.
5. Los demás empleados y las órdenes entregadas ven la sección en solo lectura.
6. **Al agregar refacciones a una orden se proponen primero las compatibles con el vehículo (Q43):** el selector se abre filtrado por la marca y modelo del vehículo ("Piezas compatibles con {Marca} {Modelo}") con "Ver todas las piezas"; si no hay coincidencia o piezas compatibles, muestra todas con "No hay piezas registradas para este vehículo; se muestran todas."

## Flujo — Aviso en el inicio del taller (Q37)

En `/taller`, si hay piezas con existencias ≤ mínimo (incluidas las agotadas), aparece la alerta "N piezas con bajo stock o agotadas" con enlace a `/taller/inventario?filtro=bajo`.

## Flujo — Vista del cliente (Q41)

En `/cliente/vehiculos/:id`, tanto en la orden en curso como en cada servicio del historial, el cliente ve "Refacciones" con el nombre y la cantidad de cada pieza usada (`rpc` `piezas_usadas`). **Nunca ve costos ni existencias.** Si la orden no usó piezas no se muestra la sección.

## Reglas

- **Q34:** administrador y empleados gestionan todo el inventario: alta, edición, entradas, ajustes y desactivar.
- **Q35:** las piezas se ligan a las órdenes; al usarlas se descuentan del stock y no se puede usar más de lo que hay.
- **Q36:** cada pieza tiene costo en MXN (2 decimales); la orden muestra subtotales y total de refacciones. Al usar una pieza se copia el costo (`costo_unitario`): cambios posteriores del costo no alteran órdenes ya hechas.
- **Q37:** stock mínimo por pieza; alerta "Bajo stock" (existencias ≤ mínimo y > 0) y "Agotado" (0).
- **Q38:** historial de movimientos: `entrada`, `salida` (por orden), `devolucion` (al quitar de una orden) y `ajuste` (con motivo obligatorio), con quién y cuándo. `cantidad` lleva signo (salida negativa, devolución positiva, ajuste = diferencia) y cada movimiento guarda `existencias_resultantes`.
- **Q39:** compatibilidad con vehículos como texto libre (ej. "Nissan Versa 2012–2019"), buscable.
- **Q40:** agregar o quitar piezas de una orden lo hace el mecánico asignado o el administrador, solo con la orden no entregada (misma regla de F09).
- **Q41:** el cliente ve en su historial las piezas usadas y sus cantidades, sin costos.
- Las piezas no se borran: se desactivan (`activa = false`). Una pieza inactiva no se puede usar en órdenes nuevas, pero conserva su historial y sigue visible en el inventario (filtro "Inactivas").
- `existencias` y `codigo` **nunca** se editan por `update` directo: las existencias cambian solo con las funciones de inventario, de modo que siempre son iguales a la suma de los movimientos.
- Moneda: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` en `utils/moneda.js`.
- El costo de refacciones no es una cotización: la cotización con mano de obra sigue fuera del MVP.

## Validaciones

- Solo `empleado` y `admin` ejecutan las funciones de inventario (se valida con `mi_rol()` antes que nada).
- Código: 2 a 20 caracteres entre letras, números y guiones; único. Nombre: 2 a 120 caracteres. Costo, existencias y stock mínimo: no negativos.
- Entrada y uso: cantidad entera mayor a 0.
- Ajuste: nuevas existencias ≥ 0, motivo obligatorio y distintas de las actuales.
- Usar pieza: orden no entregada, pieza activa y existencias suficientes; se bloquea la fila de la pieza (`for update`) para que dos personas no gasten la misma existencia.
- Un empleado solo agrega o quita piezas en las órdenes asignadas a él (el administrador, en cualquiera no entregada).

## Casos de error

| Situación | Mensaje |
|---|---|
| Un cliente o usuario desactivado llama una función de inventario | "No tienes permiso para realizar esta acción." |
| Código repetido al crear | "Ya existe una pieza con ese código." |
| Entrada o uso con cantidad 0 o negativa | "La cantidad debe ser mayor a 0." |
| Ajuste sin motivo | "Escribe el motivo del ajuste." |
| Ajuste a las mismas existencias | "Las existencias no cambiaron." |
| Usar más piezas de las que hay | "No hay suficientes existencias: quedan {n}." |
| Usar una pieza inactiva | "Esta pieza está desactivada." |
| Orden ya entregada | "Orden cerrada." |
| Empleado en una orden de otro mecánico | "Esta orden está asignada a otro mecánico." |
| Empleado en una orden sin asignar | "Esta orden no tiene mecánico asignado. Pide al administrador que la asigne." |
| La orden no existe | "Orden no encontrada." |
| La pieza no existe | "Pieza no encontrada." |
| La fila de la orden ya no existe al quitar | "Refacción no encontrada en la orden." |
| Código, nombre, costo, existencias o mínimo inválidos | "El código debe tener de 2 a 20 caracteres: letras, números o guiones." · "El nombre debe tener entre 2 y 120 caracteres." · "Escribe un costo válido." · "Las existencias no pueden ser negativas." · "El stock mínimo no puede ser negativo." · "Las existencias nuevas no pueden ser negativas." |
| Inventario vacío | "Aún no hay refacciones registradas." + botón "Nueva pieza" |
| Búsqueda sin resultados | "No hay refacciones que coincidan." |
| Falla de conexión | "No se pudo cargar el inventario." + botón "Reintentar" |

## Resultado esperado

El taller consulta y mantiene su inventario con historial; cada orden muestra las refacciones usadas con subtotales y total, el stock baja y sube solo con esos movimientos, y el cliente ve qué piezas se usaron en su vehículo sin ver costos.

## Criterios de aceptación

- [ ] El menú del taller tiene "Inventario"; un cliente que abre `/taller/inventario` ve "No tienes permiso".
- [ ] La tabla muestra Código, Pieza, Compatible con, Existencias, Mínimo, Costo y Estado ("Disponible", "Bajo stock", "Agotado", "Inactiva"); en celular se ve como fichas.
- [ ] La búsqueda por código, nombre o compatibilidad y los filtros (Todas, Bajo stock y agotadas, Inactivas) funcionan.
- [ ] Filtrar el inventario por marca y modelo común (Q42): se combina con búsqueda y estado, persiste en `?marca=&modelo=`, muestra "N piezas" y "Limpiar filtros", y el vacío dice "No hay piezas para {Marca} {Modelo}."
- [ ] Al agregar refacciones a una orden se proponen primero las compatibles con el vehículo (Q43), con "Ver todas las piezas" y el aviso cuando no hay compatibles.
- [ ] "Nueva pieza" crea la pieza con el código normalizado a mayúsculas; un código repetido muestra "Ya existe una pieza con ese código."
- [ ] Una pieza creada con existencias iniciales muestra un movimiento "Existencia inicial".
- [ ] "Registrar entrada" suma al stock y aparece en los movimientos con quién y cuándo.
- [ ] "Ajustar existencias" exige motivo ("Escribe el motivo del ajuste.") y registra la diferencia con signo.
- [ ] "Editar" cambia nombre, compatibilidad, costo y mínimo; el código y las existencias no son editables.
- [ ] "Desactivar" oculta la pieza del buscador de la orden y "Activar" la devuelve; la pieza conserva su historial.
- [ ] Desde la consola, `update piezas set existencias = …` y `update piezas set codigo = …` son rechazados con "permission denied".
- [ ] En el detalle de una orden, el mecánico asignado agrega una refacción: baja el stock, aparece Código, Pieza, Cant., Costo unit., Subtotal y el Total se actualiza.
- [ ] Agregar la misma pieza otra vez suma la cantidad y conserva el costo unitario original.
- [ ] Usar más piezas de las que hay muestra "No hay suficientes existencias: quedan {n}."
- [ ] "Quitar" (con confirmación) devuelve las piezas al stock y registra una "Devolución".
- [ ] Un empleado no asignado, y cualquiera con la orden entregada, ve "Refacciones usadas" sin botones de agregar ni quitar; desde la consola recibe "Esta orden está asignada a otro mecánico." / "Orden cerrada."
- [ ] `/taller` muestra "N piezas con bajo stock o agotadas" con enlace a `/taller/inventario?filtro=bajo` solo si N > 0.
- [ ] El cliente ve "Refacciones" (nombre y cantidad, sin costos) en la orden en curso y en su historial; un cliente ajeno recibe 0 filas de `piezas_usadas` y no puede leer `piezas`, `movimientos_inventario` ni `orden_piezas`.
- [ ] Las existencias de cada pieza siempre son iguales a la suma de sus movimientos.
- [ ] Los importes se muestran en pesos mexicanos (ej. "$145.00").
- [ ] `anon` no puede ejecutar las funciones de inventario ni leer las tablas.

## Tasks

- [x] SQL: tipo `tipo_movimiento`, tablas `piezas`, `movimientos_inventario` y `orden_piezas`, índices, trigger `actualizado_en` en `piezas` y RLS habilitado.
- [x] SQL: `crear_pieza`, `registrar_entrada`, `ajustar_existencias`, `usar_pieza_en_orden`, `quitar_pieza_de_orden`, `piezas_usadas` y el helper interno `_validar_edicion_orden` (regla de F09).
- [x] SQL: `revoke`/`grant` de las 3 tablas, `grant update (nombre, compatibilidad, costo, stock_minimo, activa)` en `piezas` y políticas de solo taller.
- [x] `seed.sql`: 12 piezas demo con movimientos y piezas usadas en las órdenes de ABC123 y XYZ9876; grupo 16 de `tests.sql`.
- [ ] Ejecutar en Supabase `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` → `tests.sql`.
- [ ] `utils/moneda.js` (formato MXN).
- [ ] `services/inventario.js`: listar/buscar piezas, detalle y movimientos, `crearPieza`, `registrarEntrada`, `ajustarExistencias`, editar y activar/desactivar, `usarPiezaEnOrden`, `quitarPiezaDeOrden`, `piezasUsadas`, piezas de una orden.
- [ ] `taller/Inventario` (`/taller/inventario`): tabla/fichas, búsqueda, filtros y "Nueva pieza"; ítem "Inventario" en el menú.
- [ ] `taller/DetallePieza` (`/taller/inventario/:id`): encabezado, acciones y movimientos.
- [ ] `taller/DetalleOrden`: sección "Refacciones usadas" con agregar/quitar y total.
- [ ] `taller/Inicio`: alerta de bajo stock.
- [ ] `cliente/HistorialServicios` y `cliente/DetalleVehiculo`: "Refacciones" sin costos.
- [ ] Probar criterios de aceptación.
