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

Además de las pruebas manuales, `supabase/tests.sql` reúne pruebas de RLS (cliente ajeno, cambio de `rol` desde consola, update directo de `ordenes.estatus`) y de capacidad (4 clientes al mismo bloque: el 4.º es rechazado).

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
| 19:30 – 20:30 | README (instalación, variables, cuentas demo y sus contraseñas); actualizar specs y **regenerar el documento de metodología** concatenando las specs | Documento regenerado |
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

| Feature | Spec | SQL | Pantallas | Criterios |
|---|---|---|---|---|
| F01 | ✔ | ☐ | ☐ | ☐ |
| F02 | ✔ | ☐ | ☐ | ☐ |
| F03 | ✔ | ☐ | ☐ | ☐ |
| F04 | ✔ | ☐ | ☐ | ☐ |
| F05 | ✔ | ☐ | ☐ | ☐ |
| F06 | ✔ | ☐ | ☐ | ☐ |
| F07 | ✔ | ☐ | ☐ | ☐ |
| F08 | ✔ | ☐ | ☐ | ☐ |

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
