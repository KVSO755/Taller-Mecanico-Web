# Plan de trabajo

**Entrega:** domingo 22 de noviembre de 2026, 22:00.
**Inicio:** sábado 21 de noviembre de 2026.

**Entregables:** repositorio público en GitHub + app desplegada en Vercel + documento de metodología.

**Fuente de verdad:** las specs en `specs/`. El documento de metodología (`Metodologia_SDD_Taller_Mecanico.md`) no se edita a mano: se **regenera concatenando las specs** en el bloque de las 19:30.

## Orden de implementación

Se sigue el flujo real del sistema: sin login no hay vehículos, sin vehículos no hay citas, sin citas no hay órdenes.

```text
F01 Login/roles → F03 Vehículo → F04 Agendar cita → F05 Gestionar citas
   → F06 Crear orden → F07 Estatus → F08 Historial → F02 Empleados
```

F02 va al final porque, si falta tiempo, el rol de empleado se puede asignar a mano en Supabase y el resto del sistema funciona igual.

## Ciclo por feature

```text
1. Releer la spec
2. SQL (tabla, RLS, función) en Supabase
3. services/*.js
4. Pantallas
5. Probar criterios de aceptación (manualmente, marcando [x] en la spec)
6. Si algo cambió, actualizar la spec
```

Además de las pruebas manuales, `supabase/tests.sql` reúne pruebas de RLS (cliente ajeno, cambio de `rol` desde consola, update directo de `ordenes.estatus`) y de capacidad (4 clientes al mismo bloque: el 4.º es rechazado). Pasó completo contra la base real (14 grupos; F09, F10 y F11 agregan los grupos 15, 16 y 17, pendientes de ejecutar: columnas y RLS, capacidad de 3 por bloque, domingo/fechas pasadas/segunda cita activa, cancelar con menos de 1 h, cancelación automática a 15 min, `crear_orden`, `avanzar_estatus_orden`, `cambiar_rol`/`cambiar_activo`, usuario desactivado y `anon` sin acceso).

**Preparación de SQL:** se aplica a mano en el SQL Editor de Supabase, en el orden `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` (archivos re-ejecutables). Se desactiva "Confirm email" en Auth y se habilita `pg_cron`.

## Calendario

### Sábado 21

| Hora | Trabajo | Listo cuando… |
|---|---|---|
| 12:00 – 13:00 | Revisar specs; crear proyecto Supabase (desactivar "Confirm email", habilitar `pg_cron`) y React + Vite + Tailwind + Router | La app abre en `localhost` y conecta a Supabase |
| 13:00 – 15:30 | **F01** Registro, login, roles, `RutaProtegida`, Layout | Criterios F01 ✔ |
| 15:30 – 16:15 | Comida / descanso | |
| 16:15 – 17:30 | **F03** Registrar vehículo | Criterios F03 ✔ |
| 17:30 – 20:30 | **F04** Agendar cita (función `agendar_cita`, bloques) | Criterios F04 ✔ |
| 20:30 – 22:30 | **F05** Gestionar citas | Criterios F05 ✔ |

**Meta del sábado:** un cliente puede registrarse, registrar su carro y agendar; el taller puede confirmar la cita.

### Domingo 22

| Hora | Trabajo | Listo cuando… |
|---|---|---|
| 09:00 – 11:00 | **F06** Crear orden | Criterios F06 ✔ |
| 11:00 – 13:30 | **F07** Actualizar estatus + barra de progreso | Criterios F07 ✔ |
| 13:30 – 14:15 | Comida | |
| 14:15 – 15:45 | **F08** Historial | Criterios F08 ✔ |
| 15:45 – 17:00 | **F02** Gestión de empleados | Criterios F02 ✔ |
| 17:00 – 18:30 | Prueba completa del flujo con los 3 roles (ver abajo); corregir errores | Flujo completo sin errores |
| 18:30 – 19:30 | Crear desde `/registro` las 4 cuentas demo (admin, empleado, cliente1, cliente2); `seed.sql` (busca las cuentas por correo, asigna roles, inserta vehículos, citas, órdenes y bitácora); `supabase/tests.sql`; detalles de Tailwind (responsivo, estados vacíos) | |
| 19:30 – 20:30 | README (instalación, variables, cuentas demo); actualizar specs y **regenerar el documento de metodología** concatenando las specs | Documento regenerado |
| 20:30 – 21:30 | **Colchón** para imprevistos. Dentro de este bloque: despliegue (~20 min): repositorio público en GitHub (`.env.local` en `.gitignore`, `.env.example` en el repo), proyecto en Vercel con las variables `VITE_*` y `vercel.json` con rewrite SPA | App abre en la URL de Vercel y el login funciona |
| 21:30 – 22:00 | Entrega | Entregado antes de las 22:00 |

## Si se atrasa el plan

Recortar en este orden (sin tocar el flujo principal):

1. F02 → asignar roles a mano en Supabase.
2. Bitácora expandible de F08 → mostrar solo la lista de servicios.
3. Filtros en F05 y F07 → mostrar solo "hoy" / "abiertas".
4. Reprogramar en F05 → dejar solo confirmar y cancelar.

**Nunca recortar:** RLS, validación de capacidad de citas, avance de estatus en orden.

## Prueba final (flujo completo)

1. Cliente A se registra, registra el vehículo `ABC123` y agenda cita para mañana a las 10:00.
2. Clientes B, C y D intentan agendar a la misma hora → el 4.º no puede.
3. Empleado confirma la cita de A.
4. Empleado crea la orden desde la cita (km mayor al registrado).
5. Empleado avanza: diagnóstico → reparación → listo → entregado (con notas).
6. Cliente A ve cada cambio y al final el servicio en su historial.
7. Cliente A intenta abrir `/taller` → "No tienes permiso".
8. Admin hace empleado a un usuario y luego lo desactiva → ya no entra (y una sesión abierta queda bloqueada de inmediato).
9. Cliente intenta `update perfiles set rol='admin'` desde la consola → rechazado.
10. Empleado intenta `update ordenes set estatus=…` directo → rechazado.
11. Cliente intenta cancelar con menos de 1 hora de anticipación → rechazado.
12. Una cita pendiente 15 min después de su hora pasa a cancelada por el sistema.

## Avance

**Spec**, **SQL** y **Pantallas** están listos en las features F01–F08; F09 (y la ampliación Q30 de F02), F10 y F11 tienen la spec y el SQL escritos, pendientes de ejecutar en Supabase y de las pantallas. **Criterios** muestra los criterios de aceptación marcados `[x]` en cada spec (los demás esperan prueba manual en navegador, ver al final).

| Feature | Spec | SQL | Pantallas | Criterios |
|---|---|---|---|---|
| F01 | ✔ | ✔ | ✔ | 4/12 |
| F02 | ✔ | ✔ | ✔ | 7/9 |
| F03 | ✔ | ✔ | ✔ | 5/10 |
| F04 | ✔ | ✔ | ✔ | 9/12 |
| F05 | ✔ | ✔ | ✔ | 6/12 |
| F06 | ✔ | ✔ | ✔ | 7/11 |
| F07 | ✔ | ✔ | ✔ | 7/10 |
| F08 | ✔ | ✔ | ✔ | 2/6 |
| F09 | ✔ | ☐ | ☐ | 0/14 |
| F10 | ✔ | ☐ | ☐ | 0/20 |
| F11 | ✔ | ✔ | ☐ | 0/22 |

## Registro de cambios

Decisiones aplicadas el 21/11/2026.

| # | Fecha | Decisión |
|---|---|---|
| Q1 | 21/11/2026 | Los supuestos de `00-project.md` pasan de "a validar" a "validados" (decisiones firmes). |
| Q2 | 21/11/2026 | RLS filtra filas, no columnas: se revoca insert/update general a `authenticated` y se otorga `GRANT` por columna. |
| Q3 | 21/11/2026 | `mi_rol()` devuelve `null` si `activo = false`: el usuario desactivado queda bloqueado de inmediato. |
| Q4 | 21/11/2026 | "Cita activa" = `pendiente`/`confirmada` y `fecha_hora > now()`; aplica a capacidad y a una cita activa por vehículo. |
| Q5 | 21/11/2026 | Zona horaria fija `America/Tijuana` en funciones SQL y en `utils/horarios.js`. |
| Q6 | 21/11/2026 | Se desactiva "Confirm email" en Supabase. |
| Q7 | 21/11/2026 | Se quita el "motivo de cancelación (opcional)" de F05. |
| Q8 | 21/11/2026 | F03: el cliente edita marca, modelo y año; el kilometraje solo lo actualizan las órdenes (`crear_orden`). |
| Q9 | 21/11/2026 | Reprogramar (F05) usa las mismas reglas que F04: desde mañana, horario y capacidad. |
| Q10 | 21/11/2026 | Entrega: repositorio público en GitHub, app en Vercel y documento de metodología; `.env.local` en `.gitignore`, `.env.example` y `vercel.json` en el repo. |
| Q11 | 21/11/2026 | Las specs son la fuente de verdad; el documento de metodología se regenera concatenándolas a las 19:30. |
| Q12 | 21/11/2026 | Pruebas manuales marcando [x] más `supabase/tests.sql` (RLS y capacidad con 4 clientes al mismo bloque). |
| Q13 | 21/11/2026 | Todo cambio de estado o rol va por funciones `rpc` `SECURITY DEFINER` con `set search_path = public`; citas, ordenes y cambios_estatus sin insert/update directo. |
| Q14 | 21/11/2026 | Orden desde cita solo si la cita está `confirmada` y su fecha local es hoy (aunque la hora ya pasó). |
| Q15 | 21/11/2026 | Orden directa permitida con cita futura activa del vehículo: aviso y botón para cancelarla; no se cancela sola. |
| Q16 | 21/11/2026 | El cliente cancela hasta 1 hora antes; después, "Llama al taller"; `cancelar_cita` valida según `mi_rol()`. |
| Q17 | 21/11/2026 | Cita `confirmada` de un día anterior se muestra como "No se presentó" (sin nuevo estatus en BD). |
| Q18 | 21/11/2026 | Trigger `crear_perfil` toma nombre/teléfono de `raw_user_meta_data` y correo de `new.email`; 4 cuentas demo creadas desde `/registro` y `seed.sql` las busca por correo. |
| Q19 | 21/11/2026 | SQL aplicado a mano en orden `schema` → `functions` → `policies` → `seed`, con archivos re-ejecutables. |
| Q20 | 21/11/2026 | El despliegue en Vercel entra en el bloque de README/colchón (~20 min). |
| Q21 | 21/11/2026 | Se agrega este registro de cambios. |
| Q22 | 21/11/2026 | Si el cliente llega con la cita pendiente, el empleado la confirma primero (puede hasta 15 min después del inicio). |
| Q23 | 21/11/2026 | Una cita pendiente 15 min después de su hora pasa a `cancelada` por el sistema; `cancelar_citas_vencidas()` con `pg_cron` cada minuto y respaldo al cargar listas. |
| Q24 | 21/11/2026 | Nueva columna `citas.cancelada_por` (`cliente`/`taller`/`sistema`) y sus etiquetas en pantalla. |
| Q25 | 21/11/2026 | El taller puede cancelar una cita en cualquier momento antes de que se cree la orden. |
| Q26 | 21/11/2026 | Se mantiene "desde mañana hasta 30 días" para agendar y reprogramar. |
| Q27 | 21/11/2026 | Contraseña mínima de 8 caracteres (formulario + Supabase Auth). |
| Q28 | 21/11/2026 | Diseño: dirección visual «Manual de servicio» elegida con Impeccable; el sistema está en `DESIGN.md`; la agenda es una retícula hora × 3 lugares (sin rótulo de bahía porque las citas no guardan bahía); el avance de orden se muestra como 5 llamadas numeradas. |
| Q29 | 21/11/2026 | Demo: el seed llena el siguiente día hábil (bloque lleno a las 10:00). |
| Q30 | 21/11/2026 | F02: el admin crea cuentas de empleado desde Empleados (nombre, correo, teléfono, contraseña temporal ≥ 8) con un cliente Supabase secundario + `cambiar_rol`; se conserva "buscar por correo y hacer empleado". |
| Q31 | 21/11/2026 | F09: solo el mecánico asignado y el admin avanzan estatus y guardan notas de una orden; los demás empleados la ven sin editar. Lo valida la BD (`avanzar_estatus_orden` y RLS `ordenes_update`). |
| Q32 | 21/11/2026 | F09: el admin asigna y reasigna mientras la orden esté abierta (`asignar_orden`); si crea la orden un empleado queda asignada a él, si la crea el admin elige mecánico (opcional); una orden sin asignar solo la edita el admin; cada empleado ve "Mis trabajos". |
| Q33 | 21/11/2026 | F09: el cliente ve solo el nombre del mecánico asignado a su vehículo (`nombre_mecanico`). |
| Q34 | 21/11/2026 | F10: admin y empleados gestionan todo el inventario de refacciones (alta, edición, entradas, ajustes y desactivar). |
| Q35 | 21/11/2026 | F10: las piezas se ligan a las órdenes; al usarlas se descuentan del stock y no se puede usar más de lo que hay (`usar_pieza_en_orden`, con lock de la pieza). |
| Q36 | 21/11/2026 | F10: cada pieza tiene costo en MXN (2 decimales); la orden muestra subtotales y total de refacciones y copia el costo al usarla (`costo_unitario`). |
| Q37 | 21/11/2026 | F10: stock mínimo por pieza con alerta "Bajo stock" (existencias ≤ mínimo y > 0) y "Agotado" (0); alerta en el inicio del taller. |
| Q38 | 21/11/2026 | F10: historial de movimientos (`entrada`, `salida`, `devolucion`, `ajuste` con motivo obligatorio) con quién y cuándo; `existencias` solo cambia por funciones y siempre es la suma de los movimientos. |
| Q39 | 21/11/2026 | F10: la compatibilidad con vehículos es texto libre (ej. "Nissan Versa 2012–2019"), buscable. |
| Q40 | 21/11/2026 | F10: agregar o quitar piezas de una orden lo hace el mecánico asignado o el admin, solo con la orden no entregada (misma regla de F09, helper `_validar_edicion_orden`). |
| Q41 | 21/11/2026 | F10: el cliente ve en su historial las piezas usadas y sus cantidades, sin costos (`piezas_usadas`). Las piezas no se borran: se desactivan. |
| Q42 | 21/11/2026 | F10: el inventario se filtra por marca y modelo común (catálogo en `utils/catalogoVehiculos.js`, búsqueda en `compatibilidad`), con la selección en la URL. |
| Q43 | 21/11/2026 | F10: al agregar refacciones a una orden se proponen primero las compatibles con la marca/modelo del vehículo, con opción "Ver todas las piezas". |
| Q44 | 21/11/2026 | F11: factura simple imprimible / PDF (no CFDI): folio, datos fiscales del cliente, conceptos, subtotal, IVA 16 % y total, con la leyenda "Este documento no es un Comprobante Fiscal Digital por Internet (CFDI)." |
| Q45 | 21/11/2026 | F11: conceptos = refacciones usadas (cantidad × `costo_unitario`) + "Mano de obra" que el taller captura en la orden (`ordenes.mano_obra`); IVA 16 % sobre el subtotal, redondeado a 2 decimales. |
| Q46 | 21/11/2026 | F11: el cliente pide la factura solo con la orden `entregado`; una por orden; se genera al pedirla (`solicitar_factura`) y sus conceptos quedan congelados. |
| Q47 | 21/11/2026 | F11: descripción del trabajo para el empleado: en la agenda se ve el motivo de la cita; en las órdenes, el resumen es el diagnóstico si existe y, si no, el motivo de la cita ("Sin descripción" si no hay ninguno). Sin campos nuevos. |
| Q48 | 21/11/2026 | F07/F11: para pasar a `entregado` la orden debe tener mano de obra capturada (≥ 0): "Captura la mano de obra antes de marcar como entregado." |
| Q49 | 21/11/2026 | F11: emisor de demostración "TallerApp · Taller de demostración", RFC genérico XAXX010101000, CP 22000 (Tijuana), marcado como datos de demostración. |
| Q50 | 21/11/2026 | F11: los datos fiscales del cliente se precargan desde su última factura; no se guardan en el perfil. |
| Q51 | 21/11/2026 | Agenda del taller con vista por día y por mes (admin y empleado). |
| Q52 | 21/11/2026 | Endurecimiento de seguridad (cabeceras HTTP, CSP, restricciones de longitud/formato en BD). |
| Q53 | 22/11/2026 | F01: recuperar contraseña por correo (`/recuperar` → enlace → `/restablecer`), para todos los roles; mensaje igual exista o no el correo; al guardar va a su inicio. Correo integrado de Supabase por ahora (SMTP propio para clientes reales). Sale de "fuera del MVP". |

## Pruebas realizadas

- **`supabase/tests.sql`:** pasó completo contra la base real (14 grupos).
- **QA de extremo a extremo (41/41 OK)** con las mismas llamadas de los `services`, contra la base real: login de los 4 roles y perfil; vehículos (listar, crear, placa repetida rechazada, `update` de kilometraje rechazado, editar marca); bloques disponibles, agendar cita y "Mis citas"; agenda del taller con cliente y vehículo, confirmar y reprogramar; cancelación del cliente con anticipación; crear orden desde la cita de hoy (cita `atendida`, kilometraje y bitácora), notas, avance hasta `entregado` y conflicto de estatus esperado; historial del vehículo; administración de empleados (listar, buscar por correo, hacer empleado y revertir, desactivar con bloqueo inmediato y reactivar); un cliente no puede confirmar una cita.
- **Revisión visual** (escritorio y celular): login, inicio del cliente, agendar cita, inicio del taller, agenda del taller con bloque lleno y detalle de orden.

## Pendiente de prueba manual

Sin verificar todavía en navegador por una persona; sus criterios quedan sin marcar en las specs:

- [ ] F01: registro de un cliente nuevo desde `/registro` (queda en `/cliente`, sin confirmar correo) y rechazo de correo repetido.
- [ ] F01: contraseñas distintas bloquean el registro; credenciales incorrectas muestran el mensaje genérico.
- [ ] F01: recargar la página no pierde la sesión.
- [ ] F01: "Salir" cierra la sesión y regresa a `/login`.
- [ ] F01: un cliente que escribe `/taller` en la URL ve "No tienes permiso".
- [ ] F02: el administrador no ve botones para modificarse a sí mismo; el nuevo empleado llega a `/taller` al volver a entrar.
- [ ] F03: la placa "abc-123" se normaliza a "ABC123" en el formulario.
- [ ] F03: mensajes de validación (campos vacíos, año fuera de rango, kilometraje negativo) y botón "Agregar vehículo" desde el inicio.
- [ ] F04: aviso de cliente sin vehículos; domingos y fechas pasadas no seleccionables; cita confirmada de un día anterior como "No se presentó".
- [ ] F05: vista por mes de la agenda (Día | Mes, conteos, "hora llena", domingos cerrados, tocar un día abre la vista Día, "Ver mes", celular sin scroll horizontal).
- [ ] F05: filtro por estatus; reprogramar rechaza fechas fuera de rango; "Crear orden" solo en citas confirmadas de hoy; citas canceladas/atendidas sin botones; una cita confirmada no se cancela sola.
- [ ] F06: orden directa por placa y aviso de cita futura con "Cancelar cita"; crear orden de una cita de hoy cuya hora ya pasó; el cliente ve "Recibido" en su vehículo.
- [ ] F07: lista de órdenes abiertas con filtros; solo aparece el botón del siguiente estatus; el cliente ve la barra de progreso sin poder editarla.
- [ ] F08: orden de los servicios (más reciente primero), mensaje de vehículo sin servicios, "Vehículo no encontrado" al cambiar el id en la URL y búsqueda por placa en el taller.
- [ ] F02 (Q30): crear cuenta de empleado desde `/admin/empleados` (la sesión del admin no cambia, el empleado entra con la contraseña temporal, correo repetido y validaciones del formulario).
- [ ] F09: ejecutar en Supabase `schema.sql`, `functions.sql`, `policies.sql`, `seed.sql` y `tests.sql` (grupo 15) en ese orden.
- [ ] F09: el empleado que crea una orden la ve en "Mis trabajos"; el admin elige mecánico al crear y asigna, reasigna y quita desde el detalle.
- [ ] F09: un empleado no asignado ve la orden en solo lectura (sin avanzar ni guardar notas) con el aviso correcto; "Sin asignar" y el aviso del admin en `/taller`.
- [ ] F09: el cliente ve "Mecánico: {nombre}" en su vehículo con orden en curso.
- [ ] F10: ejecutar en Supabase `schema.sql`, `functions.sql`, `policies.sql`, `seed.sql` y `tests.sql` (grupo 16) en ese orden.
- [ ] F10: `/taller/inventario` con búsqueda por compatibilidad ("Versa"), filtros "Bajo stock y agotadas" e "Inactivas", estados y fichas en celular; "Nueva pieza" con código repetido.
- [ ] F10: detalle de pieza: registrar entrada, ajustar (motivo obligatorio), editar, desactivar/activar y tabla de movimientos con enlace a la orden.
- [ ] F10: en el detalle de una orden, agregar y quitar refacciones (stock, subtotales, total, "No hay suficientes existencias: quedan {n}."); solo lectura para no asignados y órdenes entregadas.
- [ ] F11: ejecutar en Supabase `schema.sql`, `functions.sql`, `policies.sql`, `seed.sql` y `tests.sql` (grupo 17) en ese orden.
- [ ] F11: `taller/DetalleOrden` captura "Mano de obra (MXN)" con "Guardar notas" y no deja entregar sin ella; muestra "Total estimado (sin IVA)" y "Ver factura {folio}".
- [ ] F11: el cliente pide factura de la orden entregada sin factura (formulario con validaciones, precarga desde su última factura), ve "Ver factura {folio}" y "Mis facturas".
- [ ] F11: la factura imprimible (`/cliente/facturas/:id` y `/taller/facturas/:id`) se ve limpia al imprimir o guardar como PDF (hoja carta, sin menú ni botones) y muestra la leyenda de que no es CFDI.
- [ ] F11 (Q47): columna/fila "Trabajo" en `/taller/ordenes`, "Mis trabajos" y fichas del inicio; el motivo de la cita se ve en la agenda también en celular.
- [ ] F10: alerta de bajo stock en `/taller` con enlace al filtro; el cliente ve "Refacciones" sin costos en su vehículo y en el historial.
