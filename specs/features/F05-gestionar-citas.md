# Feature F05: Gestionar citas (confirmar, reprogramar, cancelar)

## Objetivo

Que el taller vea todas las citas y decida sobre cada una: confirmarla, moverla a otro horario o cancelarla.

## Actor

Empleado y Administrador.

## Precondiciones

- Sesión iniciada con rol `empleado` o `admin`.
- Existen citas registradas (F04).

## Datos de entrada

- Filtro de fecha (por defecto: hoy) y filtro de estatus.
- Para reprogramar: nueva fecha y hora.

## Flujo principal — Confirmar

1. El empleado abre `/taller/citas`.
2. Al cargar, el sistema invoca `cancelar_citas_vencidas()` como respaldo. Ve la agenda del día como una **retícula hora × 3 lugares** (`AgendaRejilla`): una fila por hora del horario y hasta 3 celdas por fila; las celdas libres se muestran como "Libre" y una hora con 3 citas activas lleva la marca "Lleno". Cada celda muestra placa (lo más grande), cliente, teléfono, vehículo (marca, modelo), motivo y estatus. No hay rótulo de bahía: las citas no guardan bahía, solo se llenan en orden. En celular cada hora es un encabezado con sus citas debajo.
   - La fecha del filtro se sincroniza con la URL (`/taller/citas?fecha=AAAA-MM-DD`; si falta o es inválida, se usa hoy).
   - Con un filtro de estatus distinto de "Todas" la agenda se muestra como lista de fichas en lugar de la retícula.
   - Las citas `cancelada` y `atendida` se listan aparte, en "Canceladas y atendidas", sin botones.
3. En una cita `pendiente` presiona "Confirmar" (la función `confirmar_cita` lo permite hasta 15 minutos después de la hora de inicio).
4. La cita pasa a `confirmada`.

## Flujo — Vista por mes

1. En `/taller/citas` un selector "Día | Mes" cambia la vista; el estado vive en la URL: `?vista=dia&fecha=AAAA-MM-DD` (por defecto, hoy) y `?vista=mes&mes=AAAA-MM`.
2. La vista **Mes** (`AgendaMes`) muestra un calendario de lunes a domingo con "‹ Mes anterior", "Hoy" y "Mes siguiente ›". Los datos salen de `citasPorRango(inicio, fin)` (inicio inclusive, fin exclusivo, zona America/Tijuana; invoca antes `cancelar_citas_vencidas()`).
3. Cada día hábil muestra "N citas" (solo activas: pendiente + confirmada), el desglose de pendientes y confirmadas con cuadrito de color y número, "N/M lugares" (M = bloques del día × 3) y "1 hora llena" / "N horas llenas" si algún bloque tiene 3 activas. Los domingos aparecen "Cerrado" y atenuados; hoy lleva borde cobalto de 2px. Canceladas y atendidas no cuentan.
4. Tocar un día abre la vista Día de esa fecha. En la vista Día, "Ver mes" lleva al mes de la fecha elegida.
5. En celular la cuadrícula se compacta (número del día y número de citas) y debajo aparece la lista "Días con citas" con fecha, citas y pendientes. Estados: cargando, error con "Reintentar" y "No hay citas en {mes}."
6. Cada día tiene `aria-label` completo ("lunes 23 de noviembre: 5 citas, 1 pendiente, 1 hora llena") y se navega con teclado.

## Flujo — Reprogramar

1. En una cita `pendiente` o `confirmada` presiona "Reprogramar".
2. Elige nueva fecha y bloque (solo se muestran bloques con lugar; **mismas reglas que F04**: desde mañana hasta 30 días adelante, dentro del horario, con capacidad y en zona America/Tijuana).
3. Presiona "Guardar". La función `reprogramar_cita` revisa capacidad y cambia `fecha_hora`. La cita queda `confirmada`.

## Flujo — Cancelar

1. Presiona "Cancelar" y confirma (sin pedir motivo).
2. La función `cancelar_cita` pasa la cita a `cancelada` con `cancelada_por = 'taller'` y libera el lugar. El taller puede cancelar en cualquier momento antes de que se cree la orden.

## Flujo — Atender

En una cita `confirmada` **cuya fecha local (America/Tijuana) es hoy** (aunque la hora ya haya pasado) el botón "Crear orden" lleva a F06 con la cita precargada. Al crear la orden, la cita pasa a `atendida`. Si el cliente llega con la cita `pendiente`, el empleado primero la confirma (puede hacerlo hasta 15 minutos después del inicio) y luego crea la orden.

## Cancelación automática y presentación

- Una cita `pendiente` que 15 minutos después de su `fecha_hora` sigue pendiente pasa sola a `cancelada` con `cancelada_por = 'sistema'`. Solo aplica a pendientes; las confirmadas no. Lo hace `cancelar_citas_vencidas()` programada con `pg_cron` cada minuto; además se invoca al cargar la agenda y las listas como respaldo.
- Etiquetas de cancelación: "Cancelada por el taller", "Cancelada por ti" (cliente) y "Cancelada: no se confirmó a tiempo" (sistema).
- Una cita `confirmada` cuya fecha es de un día anterior a hoy se muestra como "No se presentó" (solo visual; no hay nuevo estatus en BD).

## Transiciones permitidas

```text
pendiente  → confirmada | cancelada (taller, cliente o sistema)
confirmada → cancelada  | atendida (solo vía F06, el mismo día)
reprogramar: permitido en pendiente o confirmada
cancelada y atendida: estados finales
```

## Validaciones

- Solo se reprograma a una fecha desde mañana hasta 30 días adelante, dentro del horario y con lugar (misma regla que F04).
- "Confirmar" solo en citas `pendiente`, hasta 15 minutos después de su hora de inicio.
- No se puede modificar una cita `cancelada` o `atendida` (no se muestran botones y la BD lo rechaza).

## Casos de error

| Situación | Mensaje |
|---|---|
| No hay citas en la fecha | "No hay citas para este día." |
| El nuevo bloque se llenó | "Ese horario ya no tiene lugar. Elige otro." |
| La cita cambió mientras se veía (ej. el cliente la canceló) | "Esta cita ya fue modificada. Se actualizó la lista." |
| La cita pendiente ya pasó 15 min de su hora | "Esta cita se canceló porque no se confirmó a tiempo." |
| Falla de conexión | "No se pudo actualizar la cita. Intenta de nuevo." |

## Resultado esperado

El cliente ve en "Mis citas" el nuevo estatus o la nueva fecha.

## Criterios de aceptación

- [x] El empleado ve las citas de todos los clientes del día seleccionado.
- [ ] El selector "Día | Mes" cambia de vista y el estado queda en la URL (`?vista=dia&fecha=` / `?vista=mes&mes=`).
- [ ] La vista Mes muestra por día las citas activas, pendientes/confirmadas, "N/M lugares" y "hora llena"; domingos "Cerrado"; hoy resaltado; canceladas y atendidas no cuentan.
- [ ] Tocar un día del mes abre la vista Día de esa fecha; "Ver mes" regresa al mes de la fecha.
- [ ] En celular la vista Mes no tiene scroll horizontal y muestra la lista "Días con citas"; un mes sin citas muestra "No hay citas en {mes}."
- [ ] Puede filtrar por fecha y por estatus.
- [x] "Confirmar" cambia la cita a `confirmada` y el cliente lo ve.
- [x] "Reprogramar" solo ofrece bloques con lugar y actualiza la fecha.
- [x] "Cancelar" pide confirmación (sin motivo), guarda `cancelada_por = 'taller'` y libera el lugar.
- [ ] "Reprogramar" rechaza fechas anteriores a mañana o posteriores a 30 días.
- [x] Una cita pendiente 15 min después de su hora pasa a cancelada por sistema.
- [ ] Una cita confirmada no se cancela sola.
- [ ] Una cita confirmada de un día anterior se muestra como "No se presentó".
- [ ] "Crear orden" solo aparece en citas confirmadas de hoy.
- [ ] Una cita `cancelada` o `atendida` no tiene botones de acción.
- [x] Un cliente no puede confirmar ni reprogramar citas (`rpc` rechazado por `mi_rol()`); tampoco hacer `update` directo en `citas`.

## Tasks

- [x] SQL: RLS de `citas` para empleado/admin (solo `select` de todas; no hay update directo).
- [x] SQL: funciones `confirmar_cita(cita_id)` (valida transición y los 15 min), `reprogramar_cita(cita_id, nueva_fecha_hora)` (reutiliza la validación de F04: desde mañana, 30 días, horario, capacidad) y `cancelar_cita(cita_id)` (ver F04); todas `SECURITY DEFINER` con `set search_path = public` y validan transiciones de estatus.
- [x] SQL: función `cancelar_citas_vencidas()` y habilitar/programar `pg_cron` cada minuto (`select cron.schedule('cancelar-citas-vencidas', '* * * * *', 'select cancelar_citas_vencidas()')`).
- [x] `services/citas.js`: `citasPorFecha` (invoca antes `cancelar_citas_vencidas()` como respaldo), `confirmarCita`, `reprogramarCita`, `cancelarCita` (todas vía `rpc`).
- [x] Pantalla `taller/Citas` con filtros (fecha con `?fecha=` y estatus) y agenda como retícula hora × 3 lugares.
- [x] Componente `AgendaRejilla` (retícula hora × 3 lugares), compartido con `taller/Inicio`.
- [x] Modal `ReprogramarCita` reutilizando el selector de bloques de F04.
- [x] Componente `BadgeEstatus` (colores por estatus; incluye "Cancelada por…" y "No se presentó").
- [x] `services/citas.js`: `citasPorRango` y componente `AgendaMes` (vista por mes).
- [ ] Probar criterios de aceptación.
