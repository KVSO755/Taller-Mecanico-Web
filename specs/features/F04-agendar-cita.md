# Feature F04: Agendar cita

## Objetivo

Que el cliente aparte una cita para su vehículo en un horario con lugar disponible, sin que el taller tenga citas empalmadas.

## Actor

Cliente.

## Precondiciones

- El cliente tiene sesión iniciada.
- El cliente tiene al menos un vehículo registrado (F03).

## Datos de entrada

- vehículo (de los suyos);
- fecha;
- hora (bloque de 1 hora disponible);
- motivo (texto corto).

## Reglas de disponibilidad

- Horario: lunes a viernes 08:00–18:00 (último bloque 17:00); sábado 08:00–14:00 (último bloque 13:00); domingo cerrado.
- Zona horaria fija **America/Tijuana**: las funciones SQL validan día, hora y "desde mañana" con `fecha_hora at time zone 'America/Tijuana'`; `utils/horarios.js` usa la misma zona.
- **Cita activa** = estatus `pendiente` o `confirmada` **y** `fecha_hora > now()`.
- Capacidad: máximo **3** citas activas en el mismo bloque.
- Solo fechas futuras: desde mañana hasta 30 días adelante.
- Un vehículo no puede tener dos citas activas al mismo tiempo.

## Flujo principal

1. El cliente presiona "Agendar cita".
2. El sistema muestra el formulario en `/cliente/citas/nueva`.
3. El cliente elige vehículo y fecha.
4. El sistema muestra solo los bloques con lugar disponible de ese día.
5. El cliente elige un bloque, escribe el motivo y presiona "Agendar".
6. El sistema llama a la función `agendar_cita` (`rpc`; no hay `insert` directo en `citas`), que vuelve a revisar la capacidad **en la base de datos** (por si alguien tomó el último lugar mientras tanto).
7. La cita se guarda con estatus `pendiente`.
8. El cliente va a `/cliente/citas` y ve su cita con la etiqueta "Pendiente de confirmar".

## Flujo alterno — Cancelar mi cita

En `/cliente/citas`, una cita `pendiente` o `confirmada` tiene botón "Cancelar" (con confirmación) **solo hasta 1 hora antes** de `fecha_hora`. Llama a `cancelar_cita`: pasa a `cancelada` con `cancelada_por = 'cliente'` y libera el lugar. Después de ese límite el botón desaparece y se muestra "Ya no puedes cancelar en línea. Llama al taller." La función valida esta regla según `mi_rol()` (el taller sí puede cancelar, F05).

## Estados que ve el cliente en "Mis citas"

- `pendiente`: "Pendiente de confirmar".
- Si una cita `pendiente` sigue sin confirmarse 15 minutos después de su hora, el sistema la pasa a `cancelada` con `cancelada_por = 'sistema'` (`cancelar_citas_vencidas()`, con `pg_cron` cada minuto; además se invoca al cargar la lista como respaldo). Solo aplica a pendientes, no a confirmadas.
- `cancelada`: "Cancelada por ti" (cliente), "Cancelada por el taller" (taller) o "Cancelada: no se confirmó a tiempo" (sistema).
- `confirmada` de un día anterior a hoy: "No se presentó" (solo visual, sin nuevo estatus en BD).

## Validaciones

- Vehículo, fecha, hora y motivo son obligatorios.
- Motivo: entre 5 y 200 caracteres.
- El vehículo debe pertenecer al cliente (lo revisa la función).

## Casos de error

| Situación | Mensaje |
|---|---|
| Cliente sin vehículos | "Primero registra un vehículo" + botón a F03. |
| Día cerrado (domingo) | "El taller no abre ese día." y no se muestran bloques. |
| Día sin lugares | "No hay horarios disponibles ese día. Elige otra fecha." |
| El bloque se llenó al momento de guardar | "Ese horario se acaba de ocupar. Elige otro." y se recargan los bloques. |
| El vehículo ya tiene una cita activa | "Este vehículo ya tiene una cita el {fecha}." |
| Cancelar con menos de 1 hora de anticipación | "Ya no puedes cancelar en línea. Llama al taller." |
| Falla de conexión | "No se pudo agendar la cita. Intenta de nuevo." |

## Resultado esperado

La cita aparece en "Mis citas" del cliente como pendiente y en la agenda del taller (F05).

## Criterios de aceptación

- [ ] Un cliente sin vehículos no puede abrir el formulario y ve el aviso.
- [ ] No se pueden elegir domingos ni fechas pasadas.
- [ ] Un bloque con 3 citas activas no aparece como disponible.
- [ ] Si dos clientes intentan el último lugar a la vez, solo uno lo obtiene; el otro ve el mensaje.
- [ ] Un vehículo con cita activa no puede agendar otra.
- [ ] La cita se guarda como `pendiente` y aparece en "Mis citas".
- [ ] Cancelar una cita la pasa a `cancelada` (`cancelada_por = 'cliente'`) y el lugar vuelve a estar disponible.
- [ ] No se puede cancelar con menos de 1 hora: el botón desaparece, aparece "Ya no puedes cancelar en línea. Llama al taller." y `cancelar_cita` también lo rechaza si se llama directo.
- [ ] Una cita pendiente 15 minutos después de su hora aparece como "Cancelada: no se confirmó a tiempo".
- [ ] Una cita confirmada de un día anterior se muestra como "No se presentó".
- [ ] Un cliente que intenta `insert`/`update` directo en `citas` desde la consola es rechazado.
- [ ] Una cita pasada (`fecha_hora <= now()`) no cuenta para la capacidad ni como cita activa del vehículo.

## Tasks

- [ ] SQL: tabla `citas` (con `cancelada_por`) + RLS (cliente: ver las suyas) y `revoke` de insert/update/delete: toda escritura va por `rpc`.
- [ ] SQL: función `cancelar_cita(cita_id)` (`SECURITY DEFINER`): el cliente solo cancela las suyas hasta 1 h antes; el taller, en cualquier momento antes de que se cree la orden; fija `cancelada_por` según `mi_rol()`.
- [ ] SQL: función `cancelar_citas_vencidas()` y programarla con `pg_cron` cada minuto (ver F05).
- [ ] SQL: función `agendar_cita(vehiculo_id, fecha_hora, motivo)` (`SECURITY DEFINER`, `set search_path = public`) que valida horario y fechas en America/Tijuana, dueño, capacidad y cita activa del vehículo, y bloquea con `lock`/`for update` para evitar carreras.
- [ ] SQL: función `bloques_ocupados(fecha)` que devuelve cuántas citas activas hay por hora (sin datos personales).
- [ ] `utils/horarios.js`: generar bloques del día según el horario, siempre en zona `America/Tijuana`.
- [ ] `services/citas.js`: `agendarCita`, `misCitas` (invoca antes `cancelar_citas_vencidas()` como respaldo), `cancelarCita`, `bloquesDisponibles` (usa `bloques_ocupados`).
- [ ] Pantalla `cliente/NuevaCita` (selector de vehículo, fecha, bloques).
- [ ] Pantalla `cliente/Citas` con estatus (incluye "Cancelada por…" y "No se presentó"), botón cancelar hasta 1 h antes y aviso "Ya no puedes cancelar en línea. Llama al taller."
- [ ] Probar criterios de aceptación (incluir prueba con 3 citas en el mismo bloque).
