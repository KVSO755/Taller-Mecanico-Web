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
2. Al cargar, el sistema invoca `cancelar_citas_vencidas()` como respaldo. Ve la agenda del día agrupada por hora: cliente, teléfono, vehículo (placa, marca, modelo), motivo y estatus.
3. En una cita `pendiente` presiona "Confirmar" (la función `confirmar_cita` lo permite hasta 15 minutos después de la hora de inicio).
4. La cita pasa a `confirmada`.

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

- [ ] El empleado ve las citas de todos los clientes del día seleccionado.
- [ ] Puede filtrar por fecha y por estatus.
- [ ] "Confirmar" cambia la cita a `confirmada` y el cliente lo ve.
- [ ] "Reprogramar" solo ofrece bloques con lugar y actualiza la fecha.
- [ ] "Cancelar" pide confirmación (sin motivo), guarda `cancelada_por = 'taller'` y libera el lugar.
- [ ] "Reprogramar" rechaza fechas anteriores a mañana o posteriores a 30 días.
- [ ] Una cita pendiente 15 min después de su hora pasa a cancelada por sistema.
- [ ] Una cita confirmada no se cancela sola.
- [ ] Una cita confirmada de un día anterior se muestra como "No se presentó".
- [ ] "Crear orden" solo aparece en citas confirmadas de hoy.
- [ ] Una cita `cancelada` o `atendida` no tiene botones de acción.
- [ ] Un cliente no puede confirmar ni reprogramar citas (`rpc` rechazado por `mi_rol()`); tampoco hacer `update` directo en `citas`.

## Tasks

- [ ] SQL: RLS de `citas` para empleado/admin (solo `select` de todas; no hay update directo).
- [ ] SQL: funciones `confirmar_cita(cita_id)` (valida transición y los 15 min), `reprogramar_cita(cita_id, nueva_fecha_hora)` (reutiliza la validación de F04: desde mañana, 30 días, horario, capacidad) y `cancelar_cita(cita_id)` (ver F04); todas `SECURITY DEFINER` con `set search_path = public` y validan transiciones de estatus.
- [ ] SQL: función `cancelar_citas_vencidas()` y habilitar/programar `pg_cron` cada minuto (`select cron.schedule('cancelar-citas-vencidas', '* * * * *', 'select cancelar_citas_vencidas()')`).
- [ ] `services/citas.js`: `citasPorFecha` (invoca antes `cancelar_citas_vencidas()` como respaldo), `confirmarCita`, `reprogramarCita`, `cancelarCita` (todas vía `rpc`).
- [ ] Pantalla `taller/Citas` con filtros y agenda por hora.
- [ ] Modal `ReprogramarCita` reutilizando el selector de bloques de F04.
- [ ] Componente `BadgeEstatus` (colores por estatus; incluye "Cancelada por…" y "No se presentó").
- [ ] Probar criterios de aceptación.
