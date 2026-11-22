<div align="center">

<img src="specs/img/logo-uabc.png" alt="Escudo UABC" width="120">

# UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA

## Facultad de Ingeniería, Arquitectura y Diseño

### Ingeniero en Software y Tecnologías Emergentes

<br>

## Aplicaciones Web

### Metodología SDD (Spec-Driven Development)
### Sistema de Gestión para Taller Mecánico

<br>

**Alumno:**
Kevin Humberto Soto Ortiz (377689)

**Fecha:**
22/11/2026

</div>

---

## Contenido

- [1. Proyecto final — Sistema de Gestión para Taller Mecánico](#1-proyecto-final--sistema-de-gestión-para-taller-mecánico)
- [2. Navegación y pantallas](#2-navegación-y-pantallas)
- [3. Modelo de datos](#3-modelo-de-datos)
- [4. Decisiones técnicas](#4-decisiones-técnicas)
- [5. Feature F01: Registro e inicio de sesión con roles](#5-feature-f01-registro-e-inicio-de-sesión-con-roles)
- [6. Feature F02: Gestión de empleados](#6-feature-f02-gestión-de-empleados)
- [7. Feature F03: Registrar vehículo](#7-feature-f03-registrar-vehículo)
- [8. Feature F04: Agendar cita](#8-feature-f04-agendar-cita)
- [9. Feature F05: Gestionar citas (confirmar, reprogramar, cancelar)](#9-feature-f05-gestionar-citas-confirmar-reprogramar-cancelar)
- [10. Feature F06: Crear orden de servicio](#10-feature-f06-crear-orden-de-servicio)
- [11. Feature F07: Actualizar estatus de la orden](#11-feature-f07-actualizar-estatus-de-la-orden)
- [12. Feature F08: Consultar historial del vehículo](#12-feature-f08-consultar-historial-del-vehículo)
- [13. Feature F09: Asignar órdenes a un mecánico](#13-feature-f09-asignar-órdenes-a-un-mecánico)
- [14. Feature F10: Inventario de refacciones](#14-feature-f10-inventario-de-refacciones)
- [15. Feature F11: Facturación y mano de obra](#15-feature-f11-facturación-y-mano-de-obra)
- [16. Plan de trabajo](#16-plan-de-trabajo)

> Este documento reúne todas las specs de la carpeta `specs/`. Si cambia algo, se edita la spec y se vuelve a generar este archivo.

---

# 1. Proyecto final — Sistema de Gestión para Taller Mecánico

## Nombre

**TallerApp** (nombre provisional).

## Problema

Los talleres mecánicos pequeños y medianos manejan sus citas, órdenes de servicio y el historial de los vehículos en papel, libretas o por teléfono. Esto provoca:

- citas que se empalman porque nadie ve la agenda completa;
- pérdida de información sobre qué se le hizo a cada vehículo;
- clientes que llaman varias veces para saber si su carro ya está listo;
- falta de seguimiento del trabajo de cada mecánico.

## Usuario objetivo

| Rol | Descripción |
|---|---|
| **Cliente** | Persona dueña de uno o más vehículos que necesita agendar servicio y saber el estado de su carro sin llamar al taller. |
| **Empleado / Mecánico** | Trabajador del taller que recibe vehículos, hace el diagnóstico y actualiza el avance de la reparación. |
| **Administrador** | Dueño o encargado del taller que da de alta empleados y supervisa todas las citas y órdenes. |

Usuario principal: **el cliente**, porque es quien inicia el proceso agendando una cita.

## Propuesta de solución

Una aplicación web con acceso por rol donde:

- el cliente registra sus vehículos, agenda citas según los horarios disponibles y consulta el estatus y el historial de su vehículo;
- el taller confirma, reprograma o cancela citas, crea órdenes de servicio y actualiza su estatus;
- todo servicio terminado queda guardado en una bitácora por vehículo.

## MVP

| ID | Feature | Rol(es) | Módulo |
|---|---|---|---|
| F01 | Registro e inicio de sesión con roles | Todos | Usuarios |
| F02 | Gestión de empleados | Administrador | Usuarios |
| F03 | Registrar vehículo | Cliente | Vehículos |
| F04 | Agendar cita | Cliente | Citas |
| F05 | Gestionar citas (confirmar, reprogramar, cancelar) | Empleado, Administrador | Citas |
| F06 | Crear orden de servicio | Empleado, Administrador | Órdenes |
| F07 | Actualizar estatus de orden | Empleado, Administrador | Órdenes |
| F08 | Consultar historial del vehículo | Todos | Historial |
| F09 | Asignar órdenes a un mecánico | Administrador, Empleado | Órdenes |
| F10 | Inventario de refacciones | Empleado, Administrador (el cliente ve las piezas usadas, sin costos) | Inventario |
| F11 | Facturación (factura simple imprimible) y mano de obra | Cliente (pide y ve su factura), Empleado, Administrador (capturan la mano de obra y ven las facturas) | Facturación |

Cada feature tiene su spec en `specs/features/`.

## Tecnología

JavaScript · React (Vite) · Tailwind CSS · Supabase (Auth + PostgreSQL + RLS). Detalle en `03-decisiones-tecnicas.md`.

## Funcionalidades futuras (fuera del MVP)

- Notificaciones por correo o WhatsApp cuando cambia el estatus de la orden.
- Cotización con desglose de refacciones y mano de obra (el costo de las refacciones ya existe en F10 y la mano de obra se captura en F11; la cotización previa con aprobación del cliente sigue fuera del MVP).
- Timbrado CFDI con un PAC (la factura de F11 es un documento simple, no un Comprobante Fiscal Digital por Internet).
- Subir fotos del vehículo al recibirlo.
- Recuperación de contraseña por correo.
- Reportes (servicios por mes, mecánico con más órdenes).

## Supuestos (validados)

Estos puntos no vienen en la propuesta original; fueron validados y son decisiones firmes:

1. **Horario del taller:** lunes a viernes de 08:00 a 18:00 y sábado de 08:00 a 14:00. Domingo cerrado.
2. **Bloques de cita:** de 1 hora.
3. **Capacidad:** máximo **3 citas por bloque** (3 lugares simultáneos; las citas no guardan bahía, solo cuentan por hora). Es el valor que define "disponibilidad" y evita traslapes.
   - **Zona horaria:** fija, `America/Tijuana`, para validar horarios y fechas.
4. Todo el que se registra entra como **cliente**. El administrador convierte a un usuario en **empleado** (F02) cambiándole el rol, ya sea buscándolo por correo o creándole la cuenta desde la pantalla de Empleados (Q30: se registra con un cliente Supabase secundario y luego se cambia el rol con `cambiar_rol`; no se usa la llave `service_role`, que nunca debe ir en el navegador). El primer administrador se asigna a mano en el panel de Supabase.
5. Un vehículo pertenece a un solo cliente. La placa es única en el sistema.
6. El historial (F08) se forma con las órdenes de servicio del vehículo; no es una tabla aparte que se llene a mano.

## Índice de specs

```text
specs/
├── 00-project.md               ← este archivo
├── 01-navigation.md            pantallas, rutas y acceso por rol
├── 02-data-model.md            entidades y reglas de datos
├── 03-decisiones-tecnicas.md   tecnología elegida (después de los datos)
├── 04-plan-de-trabajo.md       tareas y calendario hasta la entrega
└── features/
    ├── F01-registro-login.md
    ├── F02-gestion-empleados.md
    ├── F03-registrar-vehiculo.md
    ├── F04-agendar-cita.md
    ├── F05-gestionar-citas.md
    ├── F06-crear-orden.md
    ├── F07-actualizar-estatus-orden.md
    ├── F08-historial-vehiculo.md
    ├── F09-asignar-ordenes.md
    ├── F10-inventario.md
    └── F11-facturacion.md
```

---

# 2. Navegación y pantallas

## Mapa de pantallas por rol

```text
Público
├── /                           Redirige según sesión y rol (a /login si no hay sesión)
├── /login                      Iniciar sesión               (F01)
├── /registro                   Registro de cliente          (F01)
└── (cualquier otra ruta)       Página no encontrada

Cliente  (/cliente)
├── /cliente                    Inicio: mis vehículos y próximas citas
├── /cliente/vehiculos/nuevo    Registrar vehículo           (F03)
├── /cliente/vehiculos/:id      Detalle + historial; en la orden en curso, "Mecánico: {nombre}"; "Refacciones" (nombre y cantidad, sin costos) en la orden en curso y en cada servicio del historial (F08, F09, F10)
├── /cliente/citas              Mis citas
├── /cliente/citas/nueva        Agendar cita                 (F04)
├── /cliente/facturas           Mis facturas: Folio, Fecha, Placa y Total (F11)
├── /cliente/facturas/nueva     Pedir factura de una orden entregada (admite ?ordenId=); datos fiscales precargados de su última factura (F11)
└── /cliente/facturas/:id       Factura imprimible ("Imprimir / Guardar PDF")  (F11)

Empleado  (/taller)
├── /taller                     Inicio: agenda de hoy (hora × 3 lugares), "Mis trabajos" (empleado) o aviso de órdenes sin asignar (admin), alerta "N piezas con bajo stock o agotadas" (si N > 0), órdenes abiertas y buscador por placa (F09, F10)
├── /taller/citas               Agenda de citas (admite ?vista=dia&fecha=AAAA-MM-DD o ?vista=mes&mes=AAAA-MM) (F05)
├── /taller/ordenes             Lista de órdenes con columnas "Mecánico" y "Trabajo" (diagnóstico o, si no hay, el motivo de la cita; "Sin descripción") y pestañas "Mis trabajos" (por defecto del empleado), "Abiertas", una por estatus y "Sin asignar" (solo admin) (F07, F09)
├── /taller/ordenes/nueva       Crear orden; selector "Mecánico" (admin) o "Se asignará a ti" (empleado) (F06, F09)
├── /taller/ordenes/:id         Detalle y cambio de estatus; línea "Mecánico"; admin: selector "Asignar a"; empleado no asignado: solo lectura con aviso; sección "Refacciones usadas" con total y, para el admin o el asignado (orden no entregada), agregar y "Quitar"; campo "Mano de obra (MXN)" junto a las notas, "Total estimado (sin IVA)" y, si ya se facturó, "Ver factura {folio}" (F07, F09, F10, F11)
├── /taller/vehiculos/:id       Historial del vehículo       (F08)
├── /taller/inventario          Inventario de refacciones: búsqueda, filtros (admite ?filtro=bajo, ?marca= y ?modelo=) y "Nueva pieza" (F10)
├── /taller/inventario/:id      Detalle de pieza: entradas, ajustes, edición, activar/desactivar y movimientos (F10)
└── /taller/facturas/:id        Factura imprimible (mismo componente que la del cliente; solo lectura) (F11)

Administrador  (/admin)
├── todo lo de /taller
└── /admin/empleados            Alta / baja de empleados: "Agregar empleado" con pestañas "Crear cuenta" y "Ya tiene cuenta"; lista con "Trabajos abiertos" (F02, F09)
```

## Flujo principal del sistema

```text
Cliente se registra (F01)
   ↓
Registra su vehículo (F03)
   ↓
Agenda cita (F04)                      estatus cita: pendiente
   ↓
Taller confirma / reprograma (F05)     estatus cita: confirmada
   (si nadie confirma 15 min después de la hora → cancelada por el sistema)
   ↓
Cliente llega → taller crea orden (F06)   cita: atendida · orden: recibido
   (solo si la cita está confirmada y es de hoy)
   ↓
Admin asigna mecánico (F09)  (si crea la orden un empleado, queda asignada a él)
   ↓
El mecánico asignado (o el admin) avanza estatus (F07)
   recibido → en diagnóstico → en reparación → listo → entregado
   ↓
La orden entregada queda en el historial (F08), con las refacciones usadas (F10, sin costos para el cliente)
   (para entregar, el taller captura antes la mano de obra: F07, Q48)
   ↓
El cliente pide la factura de la orden entregada (F11): una por orden, imprimible / PDF
```

## Datos que viajan entre pantallas

| Desde | Hacia | Dato |
|---|---|---|
| `/cliente` | `/cliente/vehiculos/:id` | `vehiculoId` |
| `/cliente/citas/nueva` | (formulario) | `vehiculoId` opcional, si se llega desde un vehículo |
| `/taller/ordenes/nueva` | `/taller/citas` | `fecha` (query `?fecha=AAAA-MM-DD`, para ver la agenda de la cita futura de un vehículo; la vista por día es `?vista=dia&fecha=`, la de mes `?vista=mes&mes=AAAA-MM`) |
| `/taller/citas` | `/taller/ordenes/nueva` | `citaId` (la orden se precarga con el vehículo de la cita) |
| `/taller/ordenes` | `/taller/ordenes/:id` | `ordenId` |
| `/taller` | `/taller/inventario` | `filtro=bajo` (query, desde la alerta de bajo stock) |
| `/taller/inventario` | `/taller/inventario/:id` | `piezaId` |
| `/taller/inventario/:id` | `/taller/ordenes/:id` | `ordenId` (enlace en la columna Orden de los movimientos) |
| `/taller/ordenes/:id` | `/taller/vehiculos/:id` | `vehiculoId` |
| `/cliente/vehiculos/:id`, `/cliente/historial` (servicio entregado) | `/cliente/facturas/nueva` | `ordenId` (query `?ordenId=`) |
| `/cliente/vehiculos/:id`, `/cliente/facturas`, formulario de factura | `/cliente/facturas/:id` | `facturaId` |
| `/taller/ordenes/:id` | `/taller/facturas/:id` | `facturaId` (enlace "Ver factura {folio}") |

## Reglas de acceso

- Sin sesión, cualquier ruta privada redirige a `/login`.
- Al iniciar sesión se redirige según el rol: cliente → `/cliente`; empleado y administrador → `/taller` (el admin entra a Empleados desde el menú).
- Un usuario que entra a una ruta de otro rol recibe la pantalla **"No tienes permiso"**, no la pantalla de otro rol.
- La protección real está en **la base de datos** con políticas RLS, `GRANT` por columna y funciones `rpc` de Supabase (ver `02-data-model.md`). El frontend oculta rutas y botones, pero aunque alguien llame a la API directamente, Supabase rechaza lo que su rol no permite.

## Estados que toda pantalla de lista debe contemplar

- cargando;
- con datos;
- lista vacía (con mensaje y, si aplica, botón para crear el primero);
- error de conexión (con botón "Reintentar").

---

# 3. Modelo de datos

Primero las entidades y sus reglas; al final, cómo se implementan en Supabase.

## Entidades

```text
Perfil {
  id            (= id del usuario en Supabase Auth)
  nombre
  correo        copia del correo de Auth, para buscar en F02
  telefono
  rol           cliente | empleado | admin
  activo        true/false
  creado_en
}

Vehiculo {
  id
  cliente_id    → Perfil
  placa         única, mayúsculas, sin espacios
  marca
  modelo
  anio          1950 … año actual + 1
  kilometraje   entero ≥ 0
  creado_en
}

Cita {
  id
  cliente_id    → Perfil
  vehiculo_id   → Vehiculo
  fecha_hora    inicio del bloque de 1 hora
  motivo        texto corto ("Afinación", "Ruido en frenos")
  estatus       pendiente | confirmada | cancelada | atendida
  cancelada_por cliente | taller | sistema (null si no está cancelada)
  creado_en
}

OrdenServicio {
  id
  vehiculo_id   → Vehiculo
  cita_id       → Cita (opcional: null si la orden es directa)
  creada_por    → Perfil (empleado/admin)
  asignado_a    → Perfil (empleado/admin, opcional: null = sin asignar)
  kilometraje   km al recibir el vehículo
  diagnostico   texto (puede estar vacío al inicio)
  trabajo_realizado texto (obligatorio para pasar a "listo")
  mano_obra     MXN ≥ 0, null hasta que el taller la captura (obligatoria para pasar a "entregado", Q48)
  estatus       recibido | en_diagnostico | en_reparacion | listo | entregado
  creado_en
  actualizado_en
  entregado_en
}

CambioEstatus {          ← bitácora de cada cambio de una orden
  id
  orden_id      → OrdenServicio
  estatus_anterior
  estatus_nuevo
  cambiado_por  → Perfil
  creado_en
}

Pieza {                  ← F10: catálogo de refacciones (no se borran: se desactivan)
  id
  codigo        único, mayúsculas y guiones ("FIL-ACE-01")
  nombre
  compatibilidad texto libre ("Nissan Versa 2012–2019")
  costo         MXN, 2 decimales
  existencias   entero ≥ 0 (solo cambia con las funciones de inventario)
  stock_minimo  entero ≥ 0 (alerta "Bajo stock")
  activa        true/false
  creado_en
  actualizado_en
}

MovimientoInventario {   ← F10: historial de cada cambio de existencias
  id
  pieza_id      → Pieza
  tipo          entrada | salida | devolucion | ajuste
  cantidad      con signo: + entra, − sale (salida negativa, devolución positiva, ajuste = diferencia)
  existencias_resultantes
  orden_id      → OrdenServicio (salida / devolución)
  motivo        obligatorio en ajuste
  hecho_por     → Perfil
  creado_en
}

OrdenPieza {             ← F10: refacciones usadas en una orden
  id
  orden_id      → OrdenServicio
  pieza_id      → Pieza
  cantidad      > 0
  costo_unitario copia del costo de la pieza al usarla
  agregado_por  → Perfil
  creado_en     (una fila por pieza y orden)
}

Factura {                ← F11: factura simple (no CFDI); una por orden; se crea solo con solicitar_factura
  id
  folio         único, 'A-' + id con 6 dígitos ("A-000001")
  orden_id      → OrdenServicio (único: una factura por orden)
  cliente_id    → Perfil (quien la pidió)
  rfc           mayúsculas, formato SAT de 12 o 13 caracteres
  razon_social  3 a 250 caracteres
  regimen_fiscal clave SAT de 3 dígitos (601, 603, 605, 606, 612, 616, 621, 625, 626)
  codigo_postal 5 dígitos
  uso_cfdi      G01, G02, G03, I01, I02, I03, I04, I08, D01, S01, CP01
  correo
  subtotal, iva, total   MXN, 2 decimales (iva = redondeo de subtotal × 0.16)
  emitida_en
}

FacturaConcepto {        ← F11: copia congelada de lo facturado (no cambia si luego cambia la orden o el inventario)
  id
  factura_id    → Factura
  descripcion   "{pieza} ({código})" o "Mano de obra"
  cantidad      > 0
  precio_unitario  ≥ 0
  importe       cantidad × precio_unitario
}
```

## Relaciones

```text
Perfil (cliente) 1 ── N Vehiculo
Vehiculo         1 ── N Cita
Vehiculo         1 ── N OrdenServicio
Cita             1 ── 0..1 OrdenServicio
Perfil (mecánico) 1 ── N OrdenServicio   (asignado_a; además de creada_por)
OrdenServicio    1 ── N CambioEstatus
Pieza            1 ── N MovimientoInventario
OrdenServicio    1 ── N OrdenPieza   N ── 1 Pieza
OrdenServicio    1 ── N MovimientoInventario   (salida / devolución)
Perfil           1 ── N MovimientoInventario   (hecho_por)
OrdenServicio    1 ── 0..1 Factura   (unique en facturas.orden_id)
Perfil (cliente) 1 ── N Factura
Factura          1 ── N FacturaConcepto
```

## Reglas de negocio de los datos

**Cita activa** = estatus `pendiente` o `confirmada` **y** `fecha_hora > now()`. Esta definición se usa en la capacidad por bloque y en la regla de "un vehículo no puede tener dos citas activas".

**Zona horaria fija: `America/Tijuana`.** Las funciones SQL validan día, hora y "desde mañana" con `fecha_hora at time zone 'America/Tijuana'`; `utils/horarios.js` usa la misma zona.

| Regla | Dónde se garantiza |
|---|---|
| La placa no se repite | `unique` en `vehiculos.placa` |
| Máximo 3 citas activas por bloque | funciones `agendar_cita` / `reprogramar_cita` |
| Un vehículo no tiene dos citas activas | función `agendar_cita` |
| Solo se agenda (o reprograma) en horario del taller, desde mañana hasta 30 días adelante | funciones `agendar_cita` y `reprogramar_cita` + validación en el formulario |
| El cliente solo cancela su cita hasta 1 hora antes de `fecha_hora`; el taller, en cualquier momento antes de que se cree la orden | función `cancelar_cita` (según `mi_rol()`) |
| Una cita `pendiente` que sigue pendiente 15 min después de su `fecha_hora` pasa a `cancelada` con `cancelada_por = 'sistema'` (las `confirmada` no) | función `cancelar_citas_vencidas()` con `pg_cron` cada minuto; respaldo: se invoca al cargar la agenda y las listas de citas |
| Una orden desde cita solo se crea si la cita está `confirmada` y su fecha local (America/Tijuana) es hoy, aunque la hora ya haya pasado | función `crear_orden` |
| Una cita genera como máximo una orden | `unique` en `ordenes.cita_id` |
| El estatus de la orden solo avanza un paso | función `avanzar_estatus_orden` |
| Una orden `entregado` ya no se modifica | función `avanzar_estatus_orden` + `GRANT`/RLS de `ordenes` |
| Solo el mecánico asignado y el admin avanzan el estatus y guardan notas de una orden; una orden sin asignar solo la edita el admin (Q31) | función `avanzar_estatus_orden` + política RLS `ordenes_update` |
| El admin asigna/reasigna mientras la orden esté abierta; si crea la orden un empleado queda asignada a él, si la crea el admin elige mecánico (opcional); el mecánico debe ser empleado/admin activo (Q32) | funciones `crear_orden` y `asignar_orden` |
| El cliente ve solo el nombre del mecánico de su vehículo (Q33) | función `nombre_mecanico` |
| El kilometraje de una orden no puede ser menor al del vehículo | función `crear_orden` (no hay trigger aparte); la misma función actualiza después `vehiculos.kilometraje` |
| Solo el administrador cambia `rol` y `activo`, y no el de su propia cuenta | funciones `cambiar_rol` y `cambiar_activo` |
| Todo el inventario lo gestionan empleado y admin (Q34); `existencias` y `codigo` no se editan por `update` directo | `GRANT update` por columna en `piezas` + funciones de inventario |
| No se puede usar más de lo que hay; el stock baja al usar una pieza en una orden y sube al quitarla (Q35) | funciones `usar_pieza_en_orden` y `quitar_pieza_de_orden` (lock `for update` de la pieza) |
| El costo se copia a la orden al usar la pieza; la orden muestra subtotales y total (Q36) | `orden_piezas.costo_unitario` |
| Cada cambio de existencias deja un movimiento con quién y cuándo; el ajuste exige motivo; `existencias` = suma de movimientos (Q38) | funciones de inventario + `movimientos_inventario` |
| Solo el administrador o el mecánico asignado agregan/quitan piezas, y solo con la orden no entregada (Q40) | helper `_validar_edicion_orden` (misma regla que F09) |
| Una pieza inactiva no se usa en órdenes nuevas; las piezas no se borran | función `usar_pieza_en_orden` + sin `delete` |
| El cliente ve las piezas usadas de su vehículo sin costos (Q41) | función `piezas_usadas` |
| Para pasar a `entregado` la orden debe tener `mano_obra` capturada (≥ 0; 0 es válido) (Q48) | función `avanzar_estatus_orden` + `check (mano_obra >= 0)` |
| La factura solo se pide con la orden `entregado`, solo el cliente dueño del vehículo, una por orden (Q46); los datos fiscales se validan (RFC, razón social, régimen, CP, uso de CFDI, correo) | función `solicitar_factura` (lock `for update` de la orden) + `unique (orden_id)` + `check` de `facturas` |
| Los conceptos de la factura son una copia congelada de las refacciones usadas (cantidad × `costo_unitario`) más "Mano de obra"; IVA 16 % sobre el subtotal, redondeado a 2 decimales (Q45) | `solicitar_factura` + `factura_conceptos` |
| Nadie inserta, edita ni borra facturas directamente | sin `GRANT` de escritura en `facturas` y `factura_conceptos` |
| Un usuario con `activo = false` queda bloqueado de inmediato | `mi_rol()` devuelve `null` y todas las políticas lo rechazan |

Las reglas importantes se validan **en la base de datos**, no solo en React, porque el cliente de Supabase se puede llamar directamente desde el navegador.

Presentación (sin nuevos estatus en BD):

- una cita `confirmada` cuya fecha es de un día anterior a hoy se muestra como **"No se presentó"**;
- una cita `cancelada` se muestra según `cancelada_por`: "Cancelada por ti" (cliente), "Cancelada por el taller" (taller), "Cancelada: no se confirmó a tiempo" (sistema).

## Permisos por rol (RLS)

`mi_rol()` devuelve el rol del usuario actual (`auth.uid()`), o `null` si su perfil tiene `activo = false` (o no existe). Por eso **todas** las políticas bloquean al usuario desactivado de inmediato.

| Tabla | Cliente | Empleado | Admin |
|---|---|---|---|
| perfiles | ver el suyo; editar solo `nombre` y `telefono` propios | ver todos | ver todos; cambiar `rol` y `activo` solo vía `rpc` |
| vehiculos | ver los suyos; crear (`cliente_id = auth.uid()`); editar solo `marca`, `modelo`, `anio` de los suyos | ver todos | ver todos |
| citas | ver las suyas; agendar y cancelar las suyas solo vía `rpc` | ver todas; confirmar, reprogramar y cancelar solo vía `rpc` | igual que empleado |
| ordenes | ver las de sus vehículos | ver todas; crear vía `rpc`; avanzar estatus vía `rpc` y update directo solo de `diagnostico` y `trabajo_realizado` únicamente en las órdenes que tiene asignadas (`asignado_a = auth.uid()`) y si estatus <> `entregado` | igual, pero en cualquier orden no entregada (también sin asignar); asigna con `asignar_orden` |
| cambios_estatus | ver los de sus órdenes | ver todos | ver todos |
| piezas | sin acceso (ve nombre y cantidad por `piezas_usadas`) | ver todas; `update` directo solo de `nombre`, `compatibilidad`, `costo`, `stock_minimo`, `activa`; alta y existencias vía `rpc` | igual que empleado |
| movimientos_inventario | sin acceso | ver todos | ver todos |
| orden_piezas | sin acceso (usa `piezas_usadas`) | ver todas; agregar/quitar solo vía `rpc` | igual que empleado |
| facturas | ver las suyas (`cliente_id = auth.uid()`); se crean solo con `solicitar_factura` | ver todas (solo lectura) | ver todas (solo lectura) |
| factura_conceptos | ver los de sus facturas | ver todos | ver todos |

Ninguna tabla permite `insert`/`update`/`delete` directo salvo lo indicado en la siguiente subsección.

### Escritura: columnas y funciones

RLS filtra **filas**, no **columnas**: una política que deja a un cliente actualizar su perfil también le dejaría cambiar su `rol`. Por eso se revocan `insert`/`update` generales al rol `authenticated` y se otorgan `GRANT` **por columna**:

| Tabla | Escritura directa permitida (rol `authenticated`) |
|---|---|
| perfiles | `update (nombre, telefono)` solo del propio perfil. El `insert` solo ocurre vía el trigger `crear_perfil`. |
| vehiculos | `insert` (`cliente_id` por defecto `auth.uid()`; la política exige `cliente_id = auth.uid()` y rol `cliente`). `update (marca, modelo, anio)` solo de los suyos. El kilometraje **no** lo edita el cliente después de registrar: solo lo actualiza `crear_orden`. |
| ordenes | `update (diagnostico, trabajo_realizado, mano_obra)`, solo el admin o el empleado asignado (`asignado_a = auth.uid()`) y solo si `estatus <> 'entregado'` ("Guardar notas"). `asignado_a` no es editable directo. |
| citas | ninguna (ni insert ni update directo para nadie). |
| cambios_estatus | ninguna. |
| piezas | `update (nombre, compatibilidad, costo, stock_minimo, activa)` solo del taller (empleado/admin). `codigo` y `existencias` no son editables directo. Sin `insert` ni `delete`. |
| movimientos_inventario, orden_piezas | ninguna (solo `select` del taller). |
| facturas, factura_conceptos | ninguna (solo `select`; las crea `solicitar_factura`). |

Todo cambio de estado o de rol va por funciones `rpc` `SECURITY DEFINER` con `set search_path = public`, que validan `mi_rol()` y las reglas del negocio:

| Función | Uso | Feature |
|---|---|---|
| `bloques_ocupados(fecha)` | citas activas por hora de un día (sin datos personales) | F04, F05 |
| `agendar_cita(vehiculo_id, fecha_hora, motivo)` | crea la cita `pendiente` | F04 |
| `confirmar_cita(cita_id)` | `pendiente` → `confirmada` (hasta 15 min después del inicio) | F05 |
| `reprogramar_cita(cita_id, nueva_fecha_hora)` | cambia `fecha_hora`; la cita queda `confirmada` | F05 |
| `cancelar_cita(cita_id)` | cancela y fija `cancelada_por` según `mi_rol()`; el cliente solo hasta 1 h antes | F04, F05 |
| `crear_orden(vehiculo_id, cita_id, kilometraje, diagnostico, asignado_a default null)` | crea orden, cita `atendida`, actualiza km, bitácora; empleado: se asigna a sí mismo; admin: `asignado_a` opcional | F06, F09 |
| `avanzar_estatus_orden(orden_id, estatus_esperado)` | avanza un paso y escribe la bitácora; un empleado solo si es el asignado | F07, F09 |
| `asignar_orden(orden_id, empleado_id)` | solo `admin`; orden abierta; `empleado_id` null quita la asignación | F09 |
| `nombre_mecanico(orden_id)` | nombre del asignado; solo para el taller o el dueño del vehículo (si no, `null`) | F09 |
| `cambiar_rol(perfil_id, rol)` | solo `admin`, no a sí mismo | F02 |
| `cambiar_activo(perfil_id, activo)` | solo `admin`, no a sí mismo | F02 |
| `crear_pieza(codigo, nombre, compatibilidad, costo, existencias, stock_minimo)` | empleado/admin; normaliza el código; con existencias > 0 registra la entrada "Existencia inicial" | F10 |
| `registrar_entrada(pieza_id, cantidad, motivo default null)` | empleado/admin; suma al stock y registra `entrada` | F10 |
| `ajustar_existencias(pieza_id, nuevas, motivo)` | empleado/admin; fija las existencias; motivo obligatorio; registra `ajuste` con la diferencia | F10 |
| `usar_pieza_en_orden(orden_id, pieza_id, cantidad)` | admin o mecánico asignado, orden no entregada; descuenta, suma si ya estaba, registra `salida` | F10 |
| `quitar_pieza_de_orden(orden_pieza_id)` | mismas reglas; devuelve al stock y registra `devolucion` | F10 |
| `piezas_usadas(orden_id)` | nombre, código y cantidad de las piezas de una orden, sin costos; para el taller o el cliente dueño del vehículo | F10 |
| `solicitar_factura(orden_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo)` | solo el cliente dueño del vehículo; orden `entregado` y sin factura; valida los datos fiscales, congela los conceptos, calcula subtotal/IVA/total y el folio; devuelve la factura | F11 |
| `cancelar_citas_vencidas()` | cancela `pendiente` 15 min después de su hora (`cancelada_por = 'sistema'`) | F04, F05 |

Bloque ilustrativo (el SQL real vive en `supabase/`):

```sql
-- Supabase da ALL a anon y authenticated por defecto: se quita todo y se otorga lo mínimo.
revoke all on perfiles, vehiculos, citas, ordenes, cambios_estatus from anon, authenticated;
grant select on perfiles, vehiculos, citas, ordenes, cambios_estatus to authenticated;  -- RLS filtra filas
revoke all on piezas, movimientos_inventario, orden_piezas from anon, authenticated;     -- F10
grant select on piezas, movimientos_inventario, orden_piezas to authenticated;           -- políticas: solo taller
revoke all on facturas, factura_conceptos from anon, authenticated;                       -- F11
grant select on facturas, factura_conceptos to authenticated;                            -- políticas: cliente dueño o taller
grant update (nombre, compatibilidad, costo, stock_minimo, activa) on piezas to authenticated;

grant update (nombre, telefono)               on perfiles  to authenticated;
grant insert (placa, marca, modelo, anio, kilometraje) on vehiculos to authenticated;  -- cliente_id lo llena su default auth.uid()
grant update (marca, modelo, anio)            on vehiculos to authenticated;
grant update (diagnostico, trabajo_realizado, mano_obra) on ordenes to authenticated;

-- anon no tiene acceso a nada (no hay pantallas públicas con datos).
-- Funciones: Postgres da EXECUTE a PUBLIC por defecto → se revoca y se otorga solo a authenticated.
--   revoke execute on function agendar_cita(...) from public, anon;
--   grant  execute on function agendar_cita(...) to authenticated;
-- cancelar_citas_vencidas() se otorga a authenticated (respaldo al cargar la agenda, Q23):
--   es idempotente y solo toca pendientes vencidas, así que llamarla no da ningún poder extra.
-- mi_rol() es SECURITY DEFINER y STABLE para no recursar en la RLS de perfiles.

-- Las funciones rpc se ejecutan con los privilegios del dueño:
-- create or replace function agendar_cita(...) returns ... language plpgsql
--   security definer set search_path = public as $$ ... $$;
```

## Esquema SQL (Supabase)

```sql
create type rol_usuario   as enum ('cliente','empleado','admin');
create type estatus_cita  as enum ('pendiente','confirmada','cancelada','atendida');
create type estatus_orden as enum ('recibido','en_diagnostico','en_reparacion','listo','entregado');
create type tipo_movimiento as enum ('entrada','salida','devolucion','ajuste');  -- F10

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  rol rol_usuario not null default 'cliente',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table vehiculos (
  id bigint generated always as identity primary key,
  cliente_id uuid not null default auth.uid() references perfiles,
  placa text not null unique,
  marca text not null,
  modelo text not null,
  anio int not null check (anio between 1950 and extract(year from now())::int + 1),
  kilometraje int not null check (kilometraje >= 0),
  creado_en timestamptz not null default now()
);

create table citas (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references perfiles,
  vehiculo_id bigint not null references vehiculos,
  fecha_hora timestamptz not null,
  motivo text not null,
  estatus estatus_cita not null default 'pendiente',
  cancelada_por text check (cancelada_por in ('cliente','taller','sistema')),  -- null si no está cancelada
  creado_en timestamptz not null default now(),
  check ((estatus = 'cancelada') = (cancelada_por is not null))
);

create table ordenes (
  id bigint generated always as identity primary key,
  vehiculo_id bigint not null references vehiculos,
  cita_id bigint unique references citas,
  creada_por uuid not null references perfiles,
  asignado_a uuid references perfiles(id),  -- F09: null = sin asignar; índice idx_ordenes_asignado
  kilometraje int not null check (kilometraje >= 0),
  diagnostico text,
  trabajo_realizado text,
  mano_obra numeric(10,2) check (mano_obra is null or mano_obra >= 0),  -- F11
  estatus estatus_orden not null default 'recibido',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  entregado_en timestamptz
);

create table cambios_estatus (
  id bigint generated always as identity primary key,
  orden_id bigint not null references ordenes on delete cascade,
  estatus_anterior estatus_orden,
  estatus_nuevo estatus_orden not null,
  cambiado_por uuid not null references perfiles,
  creado_en timestamptz not null default now()
);

-- F10 · Inventario de refacciones
create table piezas (
  id bigint generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[A-Z0-9-]{2,20}$'),
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  compatibilidad text,
  costo numeric(10,2) not null check (costo >= 0),
  existencias int not null default 0 check (existencias >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table movimientos_inventario (
  id bigint generated always as identity primary key,
  pieza_id bigint not null references piezas,
  tipo tipo_movimiento not null,
  cantidad int not null,                 -- con signo
  existencias_resultantes int not null check (existencias_resultantes >= 0),
  orden_id bigint references ordenes,
  motivo text,                           -- obligatorio en ajuste
  hecho_por uuid not null references perfiles,
  creado_en timestamptz not null default now()
);

create table orden_piezas (
  id bigint generated always as identity primary key,
  orden_id bigint not null references ordenes on delete cascade,
  pieza_id bigint not null references piezas,
  cantidad int not null check (cantidad > 0),
  costo_unitario numeric(10,2) not null check (costo_unitario >= 0),
  agregado_por uuid not null references perfiles,
  creado_en timestamptz not null default now(),
  unique (orden_id, pieza_id)
);

-- F11 · Facturación (factura simple, no CFDI)
create table facturas (
  id bigint generated always as identity primary key,
  folio text not null unique,                 -- 'A-000001' (serie A + id con 6 dígitos)
  orden_id bigint not null unique references ordenes,
  cliente_id uuid not null references perfiles,
  rfc text not null check (rfc ~ '^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$'),
  razon_social text not null check (char_length(trim(razon_social)) between 3 and 250),
  regimen_fiscal text not null,               -- catálogo cerrado en la función
  codigo_postal text not null check (codigo_postal ~ '^[0-9]{5}$'),
  uso_cfdi text not null,                     -- catálogo cerrado en la función
  correo text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  iva numeric(12,2) not null check (iva >= 0),
  total numeric(12,2) not null check (total >= 0),
  emitida_en timestamptz not null default now()
);

create table factura_conceptos (
  id bigint generated always as identity primary key,
  factura_id bigint not null references facturas on delete cascade,
  descripcion text not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  importe numeric(12,2) not null check (importe >= 0)
);
```

Además (se detallan en cada feature):

- función `mi_rol()` (devuelve `null` si `activo = false`) y trigger `crear_perfil` en `auth.users` → inserta el perfil con rol `cliente` al registrarse (F01);
- funciones `rpc` de la tabla "Escritura: columnas y funciones": `bloques_ocupados`, `agendar_cita` (F04); `confirmar_cita`, `reprogramar_cita`, `cancelar_cita`, `cancelar_citas_vencidas` (F04/F05); `crear_orden` (F06/F09); `avanzar_estatus_orden` (F07/F09); `asignar_orden`, `nombre_mecanico` (F09); `cambiar_rol`, `cambiar_activo` (F02);
- `ordenes` tiene dos llaves a `perfiles` (`creada_por`, `asignado_a`): los embeds de PostgREST usan hint (`perfiles!ordenes_asignado_a_fkey`);
- trigger `before update` en `ordenes` que actualiza `actualizado_en` (la columna no es editable directamente) y el equivalente en `piezas`;
- F10: funciones `crear_pieza`, `registrar_entrada`, `ajustar_existencias`, `usar_pieza_en_orden`, `quitar_pieza_de_orden` y `piezas_usadas`, más el helper interno `_validar_edicion_orden` (no se otorga a nadie; aplica la regla de F09). Índices en `movimientos_inventario (pieza_id, creado_en desc)` y `(orden_id)`, y en `orden_piezas (orden_id)`. Embeds de PostgREST sin ambigüedad: `orden_piezas` y `movimientos_inventario` tienen una sola llave a `piezas`, a `ordenes` y a `perfiles`;
- F11: tablas `facturas` y `factura_conceptos` (índices en `facturas (cliente_id)` y `factura_conceptos (factura_id)`), columna `ordenes.mano_obra` y la función `solicitar_factura`; `avanzar_estatus_orden` exige `mano_obra` para entregar;
- `revoke`/`grant` por columna y políticas RLS de la tabla de permisos.

---

# 4. Decisiones técnicas

Se decidieron **después** de definir el problema, las features y los datos.

| Necesidad | Herramienta | Por qué |
|---|---|---|
| Lenguaje | JavaScript | Requisito del equipo. |
| Interfaz | React + Vite | Componentes por pantalla; Vite arranca rápido. |
| Rutas | React Router 7 (`react-router`) | Rutas por rol (`/cliente`, `/taller`, `/admin`). Las páginas se cargan por sección con `React.lazy` + `Suspense` (carga diferida). |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) | Estilos rápidos sin escribir CSS aparte; responsivo para celular. |
| Diseño / UI | Sistema propio con Tailwind v4 `@theme` (tokens de color, tipografía y clases base en `src/index.css`) | Dirección visual «Manual de servicio», documentada en `DESIGN.md` (contexto de producto en `PRODUCT.md`). Componentes base: `Boton`, `Input`, `Alerta`, `BadgeEstatus`, `EncabezadoPagina`, `AgendaRejilla`, `ProgresoOrden`. |
| Tipografía | Barlow y Barlow Condensed, autoalojadas | Archivos en `public/fonts` (sin depender de un CDN); solo pesos 400 y 700. |
| Linter | oxlint (`npm run lint`) | Revisión rápida del código sin configuración pesada (`.oxlintrc.json`). |
| Login | Supabase Auth (correo + contraseña) | Ya maneja contraseñas, sesiones y tokens. En Supabase se desactiva **"Confirm email"** para que el registro inicie sesión de inmediato (F01). |
| Base de datos | Supabase (PostgreSQL) | Relaciones entre clientes, vehículos, citas y órdenes. |
| Permisos | Row Level Security (RLS) + `GRANT` por columna | RLS filtra filas, no columnas; por eso se revoca la escritura general y se otorgan columnas concretas (ver `02-data-model.md`). |
| Reglas críticas | Funciones SQL (`rpc`, `SECURITY DEFINER`, `set search_path = public`) | Capacidad de citas, cambios de estado y de rol se validan en un solo lugar. |
| Tareas programadas | `pg_cron` (extensión habilitada en Supabase) | Cancela cada minuto las citas pendientes que no se confirmaron a tiempo (`cancelar_citas_vencidas()`). |
| Despliegue | Vercel | La app se publica desde el repositorio público de GitHub. |

**No** se usan en el MVP: Redux/Zustand (basta con un `AuthContext` y estado local), Edge Functions, librerías de componentes de UI de terceros (el sistema de diseño es propio).

## Estructura del repositorio

```text
Taller_Mecanico/
├── specs/                     ← specs SDD
├── supabase/                  se aplican a mano en el SQL Editor, en este orden:
│   ├── schema.sql             1. tablas, tipos, triggers, pg_cron
│   ├── functions.sql          2. mi_rol, bloques_ocupados, agendar_cita, confirmar_cita, reprogramar_cita,
│   │                             cancelar_cita, crear_orden, avanzar_estatus_orden, cambiar_rol,
│   │                             cambiar_activo, cancelar_citas_vencidas
│   ├── policies.sql           3. RLS + revoke/grant por columna
│   ├── seed.sql               4. datos de demo (busca las cuentas por correo)
│   └── tests.sql              pruebas de RLS y capacidad (4 clientes al mismo bloque)
├── src/
│   ├── lib/supabase.js        cliente de Supabase
│   ├── context/AuthContext.jsx  sesión + perfil + rol
│   ├── components/            Boton, Input, Alerta, Spinner, EstadoLista, BadgeEstatus, EncabezadoPagina, AgendaRejilla,
│   │                             ProgresoOrden, FormVehiculo, HistorialServicios, ReprogramarCita, PantallaAcceso, Layout
│   ├── routes/RutaProtegida.jsx
│   ├── pages/
│   │   ├── auth/              Login, Registro
│   │   ├── cliente/           Inicio, NuevoVehiculo, DetalleVehiculo, Citas, NuevaCita
│   │   ├── taller/            Inicio, Citas, Ordenes, NuevaOrden, DetalleOrden, HistorialVehiculo
│   │   └── admin/             Empleados
│   ├── services/              auth.js, vehiculos.js, citas.js, ordenes.js, perfiles.js, errores.js
│   ├── utils/                 horarios.js (bloques disponibles), fechas.js, placa.js, estatusCita.js, estatusOrden.js
│   └── index.css              @theme (tokens), fuentes y clases base
├── public/fonts/              Barlow y Barlow Condensed (autoalojadas)
├── DESIGN.md                  sistema de diseño (dirección «Manual de servicio»)
├── PRODUCT.md                 contexto de producto
├── .env.local                 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (en .gitignore, no se sube a git)
├── .env.example               mismas variables sin valores (sí va en el repo)
├── vercel.json                rewrite SPA: todas las rutas → /index.html
├── .gitignore
└── README.md                  instalación, variables y cuentas demo
```

## Reglas

- En el navegador solo va la **anon key**. La `service_role` nunca se pone en el frontend.
- Las páginas no llaman a Supabase directo: pasan por `services/`, para que la lógica de datos esté en un lugar.
- Fechas en la BD como `timestamptz`; en pantalla se muestran en hora local (America/Tijuana).
- **Zona horaria fija `America/Tijuana`:** las funciones SQL validan día, hora y "desde mañana" con `fecha_hora at time zone 'America/Tijuana'`, y `utils/horarios.js` usa la misma zona (no la del navegador).
- **SQL a mano:** se pega en el SQL Editor de Supabase en el orden `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql`. Los archivos son **re-ejecutables** (`create or replace`, `drop policy if exists`, `create table if not exists`, `drop … if exists` donde aplique).
- **Entrega:** repositorio público en GitHub + app desplegada en Vercel + documento de metodología. `.env.local` está en `.gitignore`; `.env.example` va en el repo; `vercel.json` hace el rewrite SPA para que las rutas de React Router funcionen al recargar.
- **Cuentas demo:** `admin`, `empleado`, `cliente1` y `cliente2` se crean desde `/registro`; `seed.sql` las busca por correo y les asigna rol. Sus contraseñas no se publican: se entregan por separado.

## Seguridad

- Los datos se protegen en la BD: RLS en todas las tablas, permisos por columna y escrituras sensibles solo mediante RPC `SECURITY DEFINER` con `search_path` fijo.
- El frontend usa únicamente la anon key de Supabase; nunca la service role.
- Todo el tráfico va por HTTPS con HSTS.
- CSP estricta (`vercel.json`): sin scripts externos ni inline; solo se permite conectar a Supabase.
- Protección contra clickjacking: `frame-ancestors 'none'` y `X-Frame-Options: DENY`.
- React escapa todo el texto; no se usa `dangerouslySetInnerHTML`.
- Los filtros de búsqueda se escapan antes de enviarse a la API.
- Validación en el cliente y restricciones de formato/longitud en la BD (teléfono de 10 dígitos, límites de texto).
- Mensajes de inicio de sesión genéricos (no revelan si el correo existe).
- `npm audit`: 0 vulnerabilidades.

---

# 5. Feature F01: Registro e inicio de sesión con roles

## Objetivo

Que cada persona entre al sistema con su cuenta y vea solo las pantallas de su rol.

## Actor

Cliente (registro e inicio de sesión). Empleado y administrador (solo inicio de sesión).

## Precondiciones

- Para iniciar sesión: tener una cuenta creada.
- Para registrarse: no tener una cuenta con ese correo.

## Datos de entrada

**Registro:** nombre completo, teléfono, correo, contraseña, confirmar contraseña.
**Inicio de sesión:** correo, contraseña.

## Flujo principal — Registro

1. El usuario abre `/registro`.
2. Captura sus datos y presiona "Crear cuenta".
3. El sistema valida los datos.
4. Supabase Auth crea el usuario; un trigger crea su perfil con rol `cliente` (nombre y teléfono de `raw_user_meta_data`, correo de `new.email`; si falta el nombre usa la parte del correo antes de `@`).
5. Como "Confirm email" está desactivado en Supabase, el sistema inicia la sesión y lo lleva a `/cliente`.

## Flujo principal — Inicio de sesión

1. El usuario abre `/login`, captura correo y contraseña y presiona "Entrar".
2. Supabase valida las credenciales.
3. El sistema lee el perfil (`rol`, `activo`). `mi_rol()` devuelve `null` si `activo = false`, así que un usuario desactivado queda bloqueado por todas las políticas aunque tenga una sesión abierta.
4. Redirige: cliente → `/cliente`; empleado/admin → `/taller`.

## Flujo — Cerrar sesión

Botón "Salir" en el menú → se cierra la sesión → regresa a `/login`.

## Validaciones

- Nombre: obligatorio, mínimo 3 caracteres.
- Teléfono: obligatorio, 10 dígitos.
- Correo: obligatorio y con formato válido.
- Contraseña: mínimo 8 caracteres (se valida en el formulario y en Supabase Auth: *Minimum password length* = 8).
- Confirmar contraseña: igual a la contraseña.
- El botón "Crear cuenta" / "Entrar" está deshabilitado mientras se envía (evita doble envío).

## Casos de error

| Situación | Mensaje |
|---|---|
| Correo ya registrado | "Ya existe una cuenta con este correo." |
| Correo o contraseña incorrectos | "Correo o contraseña incorrectos." (no decir cuál de los dos) |
| Perfil con `activo = false` | Se cierra la sesión: "Tu cuenta está desactivada. Contacta al taller." |
| Sin conexión | "No se pudo conectar. Revisa tu internet e intenta de nuevo." |
| Usuario entra a una ruta de otro rol | Pantalla "No tienes permiso" con botón a su inicio. |
| Usuario sin sesión entra a ruta privada | Redirige a `/login`. |
| Ruta inexistente | Pantalla "Página no encontrada" (`NoEncontrado`) con enlace a su inicio. |

## Resultado esperado

El usuario queda con sesión iniciada y ve únicamente el menú y las pantallas de su rol. Al recargar la página la sesión se mantiene.

## Criterios de aceptación

- [ ] Un cliente nuevo puede registrarse y queda en `/cliente`.
- [x] El perfil se crea automáticamente con rol `cliente`.
- [ ] No se puede registrar dos veces el mismo correo.
- [ ] No se puede enviar el registro si las contraseñas no coinciden.
- [ ] Con credenciales incorrectas aparece el mensaje genérico de error.
- [x] Un empleado que inicia sesión llega a `/taller`.
- [ ] Un cliente que escribe `/taller` en la URL ve "No tienes permiso".
- [ ] Al recargar la página no se pierde la sesión.
- [ ] "Salir" cierra la sesión y regresa a `/login`.
- [x] Una cuenta desactivada no puede entrar, y si ya tenía sesión abierta, las consultas dejan de devolver datos.
- [x] Un cliente que intenta `update perfiles set rol='admin'` desde la consola es rechazado (solo tiene permiso sobre `nombre` y `telefono`).
- [ ] El registro inicia sesión sin pedir confirmar el correo.

## Tasks

- [x] Crear proyecto en Supabase y guardar URL + anon key en `.env.local` (en `.gitignore`); crear `.env.example` sin valores.
- [ ] En Supabase (Authentication → Providers → Email) desactivar "Confirm email".
- [ ] En Supabase → Authentication → Sign In / Providers → Email: *Minimum password length* = 8.
- [x] Habilitar la extensión `pg_cron` (se usa en F05).
- [x] Crear proyecto React con Vite + Tailwind + React Router.
- [x] Crear `src/lib/supabase.js`.
- [x] SQL: tabla `perfiles` + trigger `crear_perfil` al insertar en `auth.users` (toma `nombre` y `telefono` de `raw_user_meta_data`, `correo` de `new.email`, y `coalesce(nombre, split_part(email,'@',1))`).
- [x] SQL: función `mi_rol()` (devuelve `null` si `activo = false`) y RLS de `perfiles` (cliente: el suyo; empleado/admin: todos).
- [x] SQL: `revoke` de insert/update general en `perfiles` y `grant update (nombre, telefono)`; el `insert` solo lo hace el trigger.
- [x] Crear `AuthContext` (sesión, perfil, `login`, `registro`, `logout`, escucha `onAuthStateChange`).
- [x] Crear `RutaProtegida` que recibe los roles permitidos.
- [x] Pantalla `Login` (comparte `PantallaAcceso` con `Registro`).
- [x] Pantalla `Registro` con validaciones.
- [x] Pantalla `SinPermiso`.
- [x] `Layout` con menú según el rol y botón "Salir".
- [x] Pantalla `NoEncontrado` y ruta `/` que redirige según sesión y rol (`routes/rutaInicio.js`).
- [x] Asignar rol `admin` a la primera cuenta desde el panel de Supabase.
- [x] Crear desde `/registro` las 4 cuentas demo (admin, empleado, cliente1, cliente2) (sus contraseñas se entregan por separado, no van en el repo) (`seed.sql` las busca por correo y asigna roles).
- [ ] Probar criterios de aceptación.

---

# 6. Feature F02: Gestión de empleados

## Objetivo

Que el administrador decida quién trabaja en el taller: crear la cuenta de un empleado nuevo o dar acceso de empleado a alguien que ya tiene cuenta, y quitárselo cuando ya no trabaje ahí.

## Actor

Administrador.

## Precondiciones

- El administrador tiene sesión iniciada.
- Para "Ya tiene cuenta": la persona ya creó su cuenta en `/registro` (entra como cliente).
- Para "Crear cuenta": ninguna (el administrador la crea desde la pantalla).

## Datos de entrada

- Crear cuenta: nombre, teléfono, correo y contraseña temporal.
- Ya tiene cuenta: correo del usuario a buscar.
- Acción: "Hacer empleado", "Quitar acceso de empleado", "Desactivar" / "Activar".

## Flujo — Crear cuenta de empleado (Q30)

1. El administrador abre `/admin/empleados` y en el panel "Agregar empleado" elige la pestaña "Crear cuenta".
2. Captura nombre, teléfono, correo y contraseña temporal, y presiona "Crear cuenta".
3. El frontend registra la cuenta con un cliente de Supabase **secundario** (sin persistir sesión), de modo que la sesión del administrador no cambia. El trigger `crear_perfil` (F01) crea el perfil como `cliente`.
4. Con el cliente principal (el del administrador) llama a `cambiar_rol(nuevo_id, 'empleado')` (`rpc`; exige `admin`).
5. El empleado aparece en la lista. El administrador le comunica la contraseña temporal; el empleado entra con ella en `/login`.

No requiere la llave `service_role`: el registro ya es público y el rol solo lo cambia `cambiar_rol`, que valida `admin` en la base de datos.

## Flujo principal — Dar de alta un empleado que ya tiene cuenta

1. El administrador abre `/admin/empleados`.
2. Ve la lista de empleados (nombre, correo, teléfono, estado activo/inactivo y "Trabajos abiertos": número de órdenes abiertas asignadas, ver F09).
3. En "Agregar empleado", pestaña "Ya tiene cuenta", escribe el correo de la persona y presiona "Buscar".
4. El sistema muestra el usuario encontrado (nombre y rol actual).
5. El administrador presiona "Hacer empleado" y confirma.
6. El sistema llama a `cambiar_rol` (`rpc`); el rol cambia a `empleado` y aparece en la lista.

## Flujo — Quitar acceso / desactivar

- "Quitar acceso": el rol vuelve a `cliente` (conserva sus vehículos si tenía).
- "Desactivar": `activo = false`; la persona ya no puede iniciar sesión (ver F01). "Activar" lo revierte.
- Ambas acciones piden confirmación.

## Validaciones

- El correo es obligatorio y con formato válido.
- Crear cuenta: nombre de al menos 3 caracteres; teléfono de exactamente 10 dígitos; correo con formato válido; contraseña temporal de al menos 8 caracteres (Q27).
- Si la cuenta se crea pero `cambiar_rol` falla, queda como cliente y el administrador puede terminar desde "Ya tiene cuenta".
- No se puede cambiar el rol ni desactivar **la propia cuenta** del administrador (evita que el taller se quede sin admin).
- Solo el rol `admin` puede cambiar `rol` y `activo`: las funciones `cambiar_rol` y `cambiar_activo` lo validan con `mi_rol()` (no solo la pantalla) y rechazan que el admin se modifique a sí mismo.
- Un empleado desactivado (`activo = false`) queda bloqueado de inmediato: `mi_rol()` devuelve `null`.

## Casos de error

| Situación | Mensaje |
|---|---|
| No existe usuario con ese correo | "No hay ninguna cuenta con ese correo. Pide a la persona que se registre primero." |
| El usuario ya es empleado | "Esta persona ya es empleado." |
| Crear cuenta: correo ya registrado | "Ya existe una cuenta con este correo." |
| Crear cuenta: contraseña corta | "La contraseña debe tener al menos 8 caracteres." |
| Crear cuenta: nombre corto | "Escribe el nombre completo (mínimo 3 caracteres)." |
| Crear cuenta: teléfono inválido | "El teléfono debe tener 10 dígitos." |
| Crear cuenta: correo inválido | "Escribe un correo válido." |
| Falla al guardar | "No se pudo guardar el cambio. Intenta de nuevo." |
| Lista vacía | "Aún no hay empleados registrados." |

## Resultado esperado

La persona dada de alta inicia sesión y entra a `/taller` con permisos de empleado.

## Criterios de aceptación

- [x] El administrador ve la lista de empleados.
- [x] Buscar un correo existente muestra el usuario; uno inexistente muestra el mensaje de error.
- [x] "Hacer empleado" cambia el rol y la persona aparece en la lista.
- [ ] Al volver a iniciar sesión, el nuevo empleado llega a `/taller`.
- [x] "Desactivar" impide que esa persona inicie sesión.
- [ ] El administrador no ve botones para modificarse a sí mismo.
- [x] Un empleado que intenta cambiar un rol (desde la consola) es rechazado por Supabase.
- [x] Un cliente que intenta `update perfiles set rol='admin'` desde la consola es rechazado.
- [x] Un empleado desactivado con sesión abierta deja de ver datos de inmediato.
- [ ] "Crear cuenta" con datos válidos crea al empleado, aparece en la lista y la sesión del administrador sigue siendo la suya.
- [ ] El empleado recién creado inicia sesión con la contraseña temporal y llega a `/taller`.
- [ ] Nombre menor a 3 caracteres, teléfono distinto de 10 dígitos, correo inválido o contraseña menor a 8 caracteres bloquean el formulario con su mensaje.
- [ ] Un correo ya registrado muestra "Ya existe una cuenta con este correo."
- [ ] La pestaña "Ya tiene cuenta" (buscar por correo y hacer empleado) sigue funcionando.
- [ ] La lista muestra "Trabajos abiertos" por empleado.

## Tasks

- [x] Verificar que el trigger de F01 llena `correo` en `perfiles` (la columna ya existe en el esquema) para poder buscar por correo.
- [x] SQL: funciones `cambiar_rol(perfil_id, rol)` y `cambiar_activo(perfil_id, activo)` (`SECURITY DEFINER`, `set search_path = public`): solo `admin`, no sobre su propia cuenta. No hay `update` directo de `rol`/`activo` (solo `nombre` y `telefono`, F01).
- [x] `services/perfiles.js`: `listarEmpleados`, `buscarPorCorreo`, `cambiarRol` y `cambiarActivo` (ambos vía `supabase.rpc`).
- [x] Pantalla `admin/Empleados` con lista y estados (cargando, vacía, error).
- [x] Formulario "Agregar empleado" (buscar + confirmar).
- [x] Botones con confirmación para quitar acceso y desactivar.
- [ ] `services/perfiles.js`: `crearEmpleado({ nombre, telefono, correo, contrasena })` con cliente Supabase secundario (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`, `storageKey` propio) para `auth.signUp` y luego `cambiar_rol` con el cliente principal.
- [ ] Pantalla `admin/Empleados`: panel con pestañas "Crear cuenta" y "Ya tiene cuenta"; columna "Trabajos abiertos".
- [ ] Probar criterios de aceptación.

---

# 7. Feature F03: Registrar vehículo

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

---

# 8. Feature F04: Agendar cita

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
3. El cliente elige vehículo y fecha, en pasos numerados (si llega desde un vehículo, la URL trae `?vehiculoId=` y ya viene elegido).
4. El sistema muestra solo los bloques con lugar disponible de ese día.
5. El cliente elige un bloque, escribe el motivo y presiona "Agendar".
6. El sistema llama a la función `agendar_cita` (`rpc`; no hay `insert` directo en `citas`), que vuelve a revisar la capacidad **en la base de datos** (por si alguien tomó el último lugar mientras tanto).
7. La cita se guarda con estatus `pendiente`.
8. El cliente va a `/cliente/citas` y ve su cita con la etiqueta "Pendiente de confirmar".

## Flujo alterno — Cancelar mi cita

En `/cliente/citas`, una cita `pendiente` o `confirmada` tiene botón "Cancelar" (con confirmación) **solo hasta 1 hora antes** de `fecha_hora`. Llama a `cancelar_cita`: pasa a `cancelada` con `cancelada_por = 'cliente'` y libera el lugar. Después de ese límite el botón desaparece y se muestra "Ya no puedes cancelar en línea. Llama al taller." La función valida esta regla según `mi_rol()` (el taller sí puede cancelar, F05).

## Estados que ve el cliente en "Mis citas"

`/cliente/citas` agrupa las citas en "Próximas" (activas y futuras) y "Anteriores"; en escritorio se muestran como tabla (folio, fecha y hora, placa, motivo, estado, acción) y en celular como fichas.

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
- [x] No se pueden elegir domingos ni fechas pasadas.
- [x] Un bloque con 3 citas activas no aparece como disponible.
- [x] Si dos clientes intentan el último lugar a la vez, solo uno lo obtiene; el otro ve el mensaje.
- [x] Un vehículo con cita activa no puede agendar otra.
- [x] La cita se guarda como `pendiente` y aparece en "Mis citas".
- [x] Cancelar una cita la pasa a `cancelada` (`cancelada_por = 'cliente'`) y el lugar vuelve a estar disponible.
- [x] No se puede cancelar con menos de 1 hora: el botón desaparece, aparece "Ya no puedes cancelar en línea. Llama al taller." y `cancelar_cita` también lo rechaza si se llama directo.
- [x] Una cita pendiente 15 minutos después de su hora aparece como "Cancelada: no se confirmó a tiempo".
- [ ] Una cita confirmada de un día anterior se muestra como "No se presentó".
- [x] Un cliente que intenta `insert`/`update` directo en `citas` desde la consola es rechazado.
- [ ] Una cita pasada (`fecha_hora <= now()`) no cuenta para la capacidad ni como cita activa del vehículo.

## Tasks

- [x] SQL: tabla `citas` (con `cancelada_por`) + RLS (cliente: ver las suyas) y `revoke` de insert/update/delete: toda escritura va por `rpc`.
- [x] SQL: función `cancelar_cita(cita_id)` (`SECURITY DEFINER`): el cliente solo cancela las suyas hasta 1 h antes; el taller, en cualquier momento antes de que se cree la orden; fija `cancelada_por` según `mi_rol()`.
- [x] SQL: función `cancelar_citas_vencidas()` y programarla con `pg_cron` cada minuto (ver F05).
- [x] SQL: función `agendar_cita(vehiculo_id, fecha_hora, motivo)` (`SECURITY DEFINER`, `set search_path = public`) que valida horario y fechas en America/Tijuana, dueño, capacidad y cita activa del vehículo, y bloquea con `lock`/`for update` para evitar carreras.
- [x] SQL: función `bloques_ocupados(fecha)` que devuelve cuántas citas activas hay por hora (sin datos personales).
- [x] `utils/horarios.js`: generar bloques del día según el horario, siempre en zona `America/Tijuana`.
- [x] `services/citas.js`: `agendarCita`, `misCitas` (invoca antes `cancelar_citas_vencidas()` como respaldo), `cancelarCita`, `bloquesDisponibles` (usa `bloques_ocupados`).
- [x] Pantalla `cliente/NuevaCita` (selector de vehículo, fecha, bloques).
- [x] Pantalla `cliente/Citas` con estatus (incluye "Cancelada por…" y "No se presentó"), botón cancelar hasta 1 h antes y aviso "Ya no puedes cancelar en línea. Llama al taller."
- [ ] Probar criterios de aceptación (incluir prueba con 3 citas en el mismo bloque).

---

# 9. Feature F05: Gestionar citas (confirmar, reprogramar, cancelar)

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

---

# 10. Feature F06: Crear orden de servicio

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
- diagnóstico inicial (opcional: puede escribirse después en F07);
- mecánico (F09): si crea un empleado, la orden queda asignada a él; si crea el administrador, elige mecánico o "Sin asignar".

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
4. Si el vehículo tiene una cita activa futura, la pantalla muestra "Este vehículo tiene cita el {fecha}." con un botón "Cancelar cita" (`cancelar_cita`) y un enlace a esa fecha en la agenda (`/taller/citas?fecha=…`). La orden directa se permite de todos modos; la cita **no** se cancela sola.
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

- [x] Desde una cita confirmada se crea la orden con el vehículo precargado.
- [x] Al crearla, la cita pasa a `atendida`.
- [x] No se crea orden desde una cita `pendiente` ni desde una cita de otro día.
- [ ] Una cita confirmada de hoy cuya hora ya pasó sí permite crear la orden.
- [ ] En una orden directa con cita futura activa se muestra "Este vehículo tiene cita el {fecha}." con botón para cancelarla, y la cita no se cancela sola.
- [ ] Se puede crear una orden directa buscando por placa.
- [x] No se acepta un kilometraje menor al del vehículo.
- [x] Al crear la orden, el kilometraje del vehículo se actualiza.
- [x] No se pueden crear dos órdenes abiertas para el mismo vehículo.
- [x] La orden nueva tiene estatus `recibido` y un registro en la bitácora de cambios.
- [ ] El cliente ve el estatus "Recibido" en su vehículo.

## Tasks

- [x] SQL: tablas `ordenes` y `cambios_estatus` + RLS (solo `select`; sin insert/update directo salvo las notas de F07).
- [x] SQL: función `crear_orden(vehiculo_id, cita_id, kilometraje, diagnostico)` (`SECURITY DEFINER`, `set search_path = public`, solo empleado/admin) que valida el kilometraje contra el del vehículo, que la cita esté `confirmada` y sea de hoy (America/Tijuana), y hace todo en una transacción (orden, cita atendida, `vehiculos.kilometraje`, bitácora).
- [x] `services/ordenes.js`: `crearOrden` (vía `rpc`), `buscarVehiculoPorPlaca`, `obtenerCitaParaOrden`, `ordenAbiertaDeVehiculo`, `ordenDeCita` y `citaActivaDeVehiculo`.
- [x] Pantalla `taller/NuevaOrden` (modo cita y modo directo).
- [x] Aviso de cita futura con botón "Cancelar cita" en el modo directo de `taller/NuevaOrden`.
- [x] Botón "Crear orden" en `taller/Citas` (solo citas confirmadas de hoy).
- [ ] Probar criterios de aceptación.

---

# 11. Feature F07: Actualizar estatus de la orden

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
- Mano de obra (MXN, ≥ 0; F11, Q45).
- Acción "Avanzar a {siguiente estatus}".

## Flujo principal

1. El empleado abre `/taller/ordenes` (por defecto muestra las órdenes abiertas, de la más antigua a la más nueva; el filtro son pestañas: "Abiertas" y un estatus por pestaña).
2. Entra a una orden en `/taller/ordenes/:id`.
3. Ve: vehículo, cliente y teléfono, kilometraje, estatus actual, diagnóstico, trabajo realizado, las refacciones usadas con su total (F10) y la bitácora de cambios.
4. Edita diagnóstico, trabajo realizado o mano de obra y presiona "Guardar notas" (`update` directo solo de esas tres columnas; empleado/admin y solo si la orden no está `entregado`).
5. Presiona "Avanzar a {siguiente}" y confirma.
6. La función `avanzar_estatus_orden` (`rpc`; no hay `update` directo de `estatus`) valida y cambia el estatus, registra el cambio en la bitácora con quién y cuándo.
7. La pantalla muestra el nuevo estatus.

## Reglas de avance

- Un empleado solo avanza y edita las órdenes **asignadas a él**; el administrador, cualquiera (ver F09, Q31). Una orden sin asignar solo la avanza el administrador.
- Solo se avanza **un paso** a la vez y nunca hacia atrás.
- Para pasar a `en_reparacion` el diagnóstico debe estar escrito.
- Para pasar a `listo` el trabajo realizado debe estar escrito.
- **Q48:** para pasar a `entregado` la mano de obra debe estar capturada (≥ 0; 0 es válido); si es `null`, la función rechaza el avance.
- Al pasar a `entregado` se guarda `entregado_en`; la orden queda cerrada y ya no se edita.

## Flujo — Vista del cliente

En `/cliente/vehiculos/:id` el cliente ve la orden abierta con una barra de progreso de 5 pasos (`ProgresoOrden`: 5 llamadas numeradas sobre una línea guía, con el paso actual marcado), el diagnóstico y la fecha del último cambio. No ve botones de edición.

## Casos de error

| Situación | Mensaje |
|---|---|
| Falta diagnóstico al pasar a reparación | "Escribe el diagnóstico antes de pasar a reparación." |
| Falta trabajo realizado al pasar a listo | "Describe el trabajo realizado antes de marcar como listo." |
| Falta la mano de obra al pasar a entregado (Q48) | "Captura la mano de obra antes de marcar como entregado." |
| Otro empleado ya avanzó la orden | "La orden ya fue actualizada por otra persona." y se recarga. |
| Orden asignada a otro mecánico | "Esta orden está asignada a otro mecánico." (notas en solo lectura, sin botón de avanzar) |
| Orden sin asignar (empleado) | "Esta orden no tiene mecánico asignado. Pide al administrador que la asigne." |
| Orden entregada | Sin botones de edición; aviso "Orden cerrada". |
| Sin órdenes abiertas | "No hay órdenes abiertas." |
| Falla de conexión | "No se pudo actualizar la orden. Intenta de nuevo." |

## Resultado esperado

El estatus cambia y el cliente lo ve en el detalle de su vehículo al recargar.

## Criterios de aceptación

- [ ] El empleado ve la lista de órdenes abiertas y puede filtrar por estatus.
- [ ] Solo aparece el botón para avanzar al siguiente estatus.
- [x] No se puede pasar a `en_reparacion` sin diagnóstico.
- [x] No se puede pasar a `listo` sin trabajo realizado.
- [x] Cada cambio queda en la bitácora con usuario y fecha.
- [x] Una orden `entregado` no se puede editar.
- [ ] No se puede pasar a `entregado` sin mano de obra capturada: "Captura la mano de obra antes de marcar como entregado." (Q48); con mano de obra 0 sí se puede.
- [ ] El cliente ve el estatus actual con barra de progreso y no puede modificarlo.
- [x] Un cliente que intenta actualizar una orden (desde la consola) es rechazado.
- [x] Un empleado que intenta `update ordenes set estatus=…` directo es rechazado (solo puede cambiar `diagnostico`, `trabajo_realizado` y `mano_obra`).
- [x] Un empleado que intenta guardar notas en una orden `entregado` es rechazado.

## Tasks

- [x] SQL: función `avanzar_estatus_orden(orden_id, estatus_esperado)` (`SECURITY DEFINER`, `set search_path = public`, solo empleado/admin; valida paso siguiente, campos obligatorios, escribe bitácora; usa `estatus_esperado` para detectar cambios simultáneos).
- [x] SQL: `revoke update` general en `ordenes` y `grant update (diagnostico, trabajo_realizado)`; política RLS para que solo empleado/admin lo usen y solo si `estatus <> 'entregado'`. Trigger `before update` que actualiza `actualizado_en`.
- [x] `services/ordenes.js`: `listarOrdenes`, `obtenerOrden`, `guardarNotas` (update directo de las dos columnas), `avanzarEstatus` (vía `rpc`).
- [x] Pantalla `taller/Ordenes` con filtro.
- [x] Pantalla `taller/DetalleOrden` con notas, botón de avance y bitácora.
- [x] Componente `ProgresoOrden` (5 llamadas numeradas sobre una línea guía) usado por taller y cliente y en las fichas de `taller/Inicio`.
- [x] Mostrar la orden abierta en `cliente/DetalleVehiculo`.
- [x] SQL (F11): `ordenes.mano_obra numeric(10,2) check (>= 0)`, en el `grant update (diagnostico, trabajo_realizado, mano_obra)`; `avanzar_estatus_orden` exige `mano_obra` al pasar a `entregado` (Q48).
- [ ] `taller/DetalleOrden`: campo "Mano de obra (MXN)" junto a las notas (F11).
- [ ] Probar criterios de aceptación.

---

# 12. Feature F08: Consultar historial del vehículo

## Objetivo

Tener una bitácora de todo lo que se le ha hecho a cada vehículo, para que el cliente y el taller la consulten sin depender de papeles.

## Actor

Cliente (solo sus vehículos). Empleado y Administrador (cualquier vehículo).

## Precondiciones

- El vehículo existe.

## Datos de entrada

- `vehiculoId` (desde "Mis vehículos" o desde una orden).
- Para el taller: búsqueda por placa.

## Qué muestra

**Encabezado:** placa, marca, modelo, año, kilometraje actual, dueño (solo para el taller).

**Orden en curso** (si existe): estatus con barra de progreso (F07).

**Servicios anteriores** (órdenes `entregado`), del más reciente al más antiguo:

- fecha de entrega;
- kilometraje al recibirlo;
- motivo de la cita (si vino de cita);
- diagnóstico;
- trabajo realizado;
- refacciones usadas (nombre y cantidad, **sin costos**; F10, Q41).

Al expandir un servicio se ve su bitácora de cambios de estatus con fechas.

## Flujo principal — Cliente

1. En `/cliente` presiona un vehículo de "Mis vehículos".
2. El sistema abre `/cliente/vehiculos/:id` con encabezado, orden en curso e historial.

## Flujo principal — Taller

1. Desde el detalle de una orden presiona "Ver historial del vehículo", o en el inicio de `/taller` busca por placa.
2. El sistema abre `/taller/vehiculos/:id`.

## Validaciones

- El cliente solo puede abrir vehículos suyos (RLS; un usuario con `activo = false` no ve nada porque `mi_rol()` devuelve `null`). Si cambia el `id` en la URL a uno ajeno, ve "Vehículo no encontrado".

## Casos de error

| Situación | Mensaje |
|---|---|
| Vehículo sin servicios | "Este vehículo aún no tiene servicios registrados." |
| Vehículo no existe o no es del cliente | "Vehículo no encontrado." + botón para regresar. |
| Placa no encontrada (taller) | "No hay ningún vehículo con esa placa." |
| Falla de conexión | "No se pudo cargar el historial." + botón "Reintentar". |

## Resultado esperado

Cliente y taller ven la misma información del vehículo; cada servicio entregado aparece automáticamente sin capturarlo de nuevo.

## Criterios de aceptación

- [x] El cliente ve el historial de cada uno de sus vehículos.
- [x] Al entregar una orden (F07), aparece en el historial sin pasos extra.
- [ ] Los servicios se ordenan del más reciente al más antiguo.
- [ ] Un vehículo sin servicios muestra el mensaje vacío.
- [ ] Un cliente que cambia el id en la URL a un vehículo ajeno ve "Vehículo no encontrado".
- [ ] El taller encuentra el historial buscando por placa.

## Tasks

- [x] `services/vehiculos.js`: `historialVehiculo(id)` (vehículo + órdenes con su cita y bitácora en una consulta con `select` anidado).
- [x] Componente `HistorialServicios` (lista expandible) reutilizado por cliente y taller.
- [x] Pantalla `cliente/DetalleVehiculo` (encabezado + orden en curso + historial).
- [x] Pantalla `taller/HistorialVehiculo`.
- [x] Buscador por placa en `taller/Inicio`.
- [ ] Probar criterios de aceptación.

---

# 13. Feature F09: Asignar órdenes a un mecánico

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

---

# 14. Feature F10: Inventario de refacciones

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

---

# 15. Feature F11: Facturación y mano de obra

## Objetivo

Que el cliente pueda pedir, cuando su servicio ya fue entregado, una factura simple imprimible (o PDF) con las refacciones usadas y la mano de obra, y que el taller capture la mano de obra de cada orden y vea las facturas emitidas.

## Actor

Cliente (pide y consulta sus facturas). Empleado y Administrador (capturan la mano de obra en la orden y consultan cualquier factura en solo lectura).

## Precondiciones

- Existe una orden en estatus `entregado` (F06, F07) con mano de obra capturada (Q48).
- El cliente es dueño del vehículo de la orden.
- Depende de F07 (estatus), F08 (historial) y F10 (refacciones usadas con su costo).

## Datos de entrada

- **Mano de obra** (taller): monto en MXN, ≥ 0, en la orden (`ordenes.mano_obra`).
- **Datos fiscales** (cliente): RFC, razón social, régimen fiscal (select con nombres del SAT), código postal, uso de CFDI (select) y correo.

## Flujo — Capturar la mano de obra (Q45, Q48)

1. En `/taller/ordenes/:id` el campo "Mano de obra (MXN)" aparece junto a las notas; se guarda con "Guardar notas" (`update` directo de `diagnostico`, `trabajo_realizado` y `mano_obra`; admin o mecánico asignado, solo con la orden no entregada).
2. El resumen de refacciones muestra además "Mano de obra" y "Total estimado (sin IVA)" (refacciones + mano de obra).
3. Para "Avanzar a entregado" la mano de obra debe estar capturada (0 es válido); si no, `avanzar_estatus_orden` rechaza el avance.
4. Si la orden ya tiene factura, el detalle muestra el enlace "Ver factura {folio}" (`/taller/facturas/:id`).

## Flujo — Pedir la factura (Q44, Q46, Q50)

1. En `cliente/HistorialServicios` y `cliente/DetalleVehiculo`, cada servicio `entregado` sin factura muestra "Pedir factura"; si ya tiene, "Ver factura {folio}".
2. "Pedir factura" abre `/cliente/facturas/nueva?ordenId=` con RFC, Razón social, Régimen fiscal, Código postal, Uso de CFDI y Correo. Los datos se precargan desde la última factura del cliente (Q50); no se guardan en su perfil.
3. Las validaciones del formulario son iguales a las de la base de datos.
4. Al enviar, `solicitar_factura` (`rpc`) crea la factura con sus conceptos y la pantalla abre `/cliente/facturas/:id`.

## Flujo — Ver, listar e imprimir facturas (Q44, Q49)

1. `/cliente/facturas` ("Mis facturas", ítem en el menú del cliente) lista Folio, Fecha, Placa y Total.
2. `/cliente/facturas/:id` y `/taller/facturas/:id` (mismo componente) muestran: encabezado "Factura" con folio y fecha; emisor (datos de demostración, Q49) y receptor; tabla de conceptos (Descripción, Cant., Precio unit., Importe); Subtotal, IVA 16 % y Total en MXN; vehículo (placa, marca y modelo) y orden; y la leyenda "Este documento no es un Comprobante Fiscal Digital por Internet (CFDI)."
3. El botón "Imprimir / Guardar PDF" ejecuta `window.print()`; con `@media print` se oculta el menú y los botones y queda una hoja carta limpia, en blanco y negro, con el estilo del sistema.

## Reglas

- **Q44:** la factura es un documento simple imprimible / PDF, no un CFDI.
- **Q45:** conceptos = cada refacción usada (`"{nombre} ({código})"`, cantidad × `costo_unitario` de `orden_piezas`) + "Mano de obra" (cantidad 1, solo si es mayor a 0). Subtotal = suma de importes; IVA = `round(subtotal × 0.16, 2)`; Total = subtotal + IVA. Los conceptos son una copia congelada: no cambian si después cambia la orden, el costo o el inventario.
- **Q46:** solo con la orden `entregado`, una factura por orden, solo el cliente dueño del vehículo; se genera al momento de pedirla.
- **Q47 (descripción del trabajo):** en la agenda se ve el motivo de la cita; en las órdenes del taller (`/taller/ordenes`, tabla y fichas, fichas del inicio y "Mis trabajos") se muestra una columna/fila "Trabajo" con el resumen truncado a 1–2 líneas: el diagnóstico si existe y, si no, el motivo de la cita; si no hay ninguno, "Sin descripción". Sin campos nuevos.
- **Q48:** no se entrega una orden sin mano de obra capturada.
- **Q49:** emisor de demostración: "TallerApp · Taller de demostración", RFC genérico XAXX010101000, CP 22000 (Tijuana), marcado como datos de demostración.
- **Q50:** los datos fiscales se precargan desde la última factura del cliente.
- **Folio:** `'A-' || lpad(id, 6, '0')` (serie A), p. ej. `A-000001`; único.
- **Catálogos cerrados** (validados en la función): régimen fiscal 601, 603, 605, 606, 612, 616, 621, 625, 626; uso de CFDI G01, G02, G03, I01, I02, I03, I04, I08, D01, S01, CP01.
- Nadie inserta, edita ni borra facturas directamente: solo `select` (cliente dueño o taller) y la `rpc`. El empleado y el administrador no piden facturas: reciben "Orden no encontrada." (no son dueños de ningún vehículo).
- Concurrencia: `solicitar_factura` bloquea la orden (`for update`) y `facturas.orden_id` es `unique`, de modo que dos solicitudes simultáneas no generan dos facturas.

## Validaciones

- RFC (se normaliza a mayúsculas y sin espacios): `^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$`.
- Razón social: 3 a 250 caracteres. Código postal: 5 dígitos. Correo: formato básico (`algo@dominio.ext`).
- Régimen fiscal y uso de CFDI: dentro de los catálogos anteriores.
- Debe haber al menos un concepto con importe > 0.

## Casos de error

| Situación | Mensaje |
|---|---|
| La orden no existe, no es del cliente, o quien llama es empleado/admin/desactivado | "Orden no encontrada." |
| Orden no entregada | "La factura solo se puede pedir cuando el servicio está entregado." |
| La orden ya tiene factura | "Esta orden ya tiene la factura {folio}." |
| RFC inválido | "Escribe un RFC válido." |
| Razón social fuera de 3 a 250 caracteres | "Escribe la razón social (de 3 a 250 caracteres)." |
| Régimen fiscal fuera del catálogo | "Elige un régimen fiscal válido." |
| Código postal inválido | "El código postal debe tener 5 dígitos." |
| Uso de CFDI fuera del catálogo | "Elige un uso de CFDI válido." |
| Correo inválido | "Escribe un correo válido." |
| Sin refacciones y con mano de obra 0 | "Este servicio no tiene montos para facturar." |
| Entregar sin mano de obra (Q48) | "Captura la mano de obra antes de marcar como entregado." |
| Sin facturas (Mis facturas) | "Aún no tienes facturas." |
| Falla de conexión | "No se pudo cargar la factura." + botón "Reintentar" |

## Resultado esperado

Tras la entrega, el cliente pide su factura una sola vez, con sus datos fiscales, y obtiene un documento imprimible con folio, conceptos, IVA y total que nunca cambia; el taller ve la misma factura en solo lectura desde la orden.

## Criterios de aceptación

- [ ] El empleado asignado (o el admin) captura "Mano de obra (MXN)" junto a las notas y se guarda con "Guardar notas"; en una orden entregada el campo es de solo lectura.
- [ ] No se puede pasar a `entregado` sin mano de obra: "Captura la mano de obra antes de marcar como entregado."; con 0 sí se puede.
- [ ] El resumen de refacciones muestra "Mano de obra" y "Total estimado (sin IVA)".
- [ ] En un servicio entregado sin factura, el cliente ve "Pedir factura" en el historial y en el detalle del vehículo; con factura ve "Ver factura {folio}".
- [ ] El formulario de factura precarga los datos de la última factura del cliente y valida RFC, razón social, régimen, código postal, uso de CFDI y correo con los mensajes exactos.
- [ ] Una orden no entregada no se puede facturar: "La factura solo se puede pedir cuando el servicio está entregado."
- [ ] Una segunda solicitud para la misma orden muestra "Esta orden ya tiene la factura {folio}."
- [ ] Un cliente ajeno que llama `solicitar_factura` recibe "Orden no encontrada."; empleado y admin también.
- [ ] La factura creada tiene folio `A-` + 6 dígitos, subtotal = suma de conceptos, IVA = `round(subtotal × 0.16, 2)` y total = subtotal + IVA.
- [ ] Los conceptos incluyen cada refacción usada ("{nombre} ({código})") y "Mano de obra" (si es mayor a 0).
- [ ] Si después cambian `orden_piezas`, el costo de la pieza o la mano de obra, la factura y sus conceptos no cambian.
- [ ] Un servicio sin refacciones y con mano de obra 0 muestra "Este servicio no tiene montos para facturar."
- [ ] "Mis facturas" lista Folio, Fecha, Placa y Total y tiene su ítem en el menú del cliente.
- [ ] `/cliente/facturas/:id` y `/taller/facturas/:id` muestran emisor de demostración, receptor, conceptos, Subtotal, IVA 16 %, Total, vehículo, orden y la leyenda de que no es CFDI.
- [ ] "Imprimir / Guardar PDF" deja una hoja carta limpia sin menú ni botones.
- [ ] Un cliente ajeno no ve facturas ni conceptos de otro (0 filas); el taller ve todas.
- [ ] Desde la consola, `insert`, `update` y `delete` directos sobre `facturas` y `factura_conceptos` son rechazados con "permission denied".
- [ ] `anon` no puede leer las tablas ni ejecutar `solicitar_factura`.
- [ ] El detalle de la orden del taller muestra "Ver factura {folio}" cuando existe.
- [ ] `/taller/ordenes` (tabla y fichas), "Mis trabajos" y las fichas del inicio muestran "Trabajo" (diagnóstico o motivo de la cita; "Sin descripción").
- [ ] En la agenda el motivo de la cita se ve siempre, también en celular.
- [ ] Los importes se muestran en pesos mexicanos (ej. "$1,144.92").

## Tasks

- [x] SQL: `ordenes.mano_obra` con `check (>= 0)`, tablas `facturas` y `factura_conceptos`, índices en `facturas (cliente_id)` y `factura_conceptos (factura_id)` y RLS habilitado.
- [x] SQL: `avanzar_estatus_orden` exige `mano_obra` al pasar a `entregado` (Q48).
- [x] SQL: `solicitar_factura(orden_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo)` (`SECURITY DEFINER`, `set search_path = public`, lock `for update` de la orden, solo `authenticated`).
- [x] SQL: `revoke all` y `grant select` en las dos tablas, políticas `select` (cliente dueño o taller) y `grant update (diagnostico, trabajo_realizado, mano_obra) on ordenes`.
- [x] `seed.sql`: mano de obra en las órdenes entregadas de ABC123, una factura de demostración en la más antigua y la más reciente sin factura; grupo 17 de `tests.sql`.
- [ ] Ejecutar en Supabase `schema.sql` → `functions.sql` → `policies.sql` → `seed.sql` → `tests.sql`.
- [ ] `services/facturas.js`: `solicitarFactura`, `listarFacturas`, `obtenerFactura` (con conceptos, orden y vehículo), `ultimaFactura` (precarga) y factura de una orden.
- [ ] `utils/facturacion.js`: catálogos con nombres SAT, validaciones iguales a las de la BD y datos del emisor de demostración (Q49).
- [ ] `cliente/NuevaFactura` (`/cliente/facturas/nueva`) y `cliente/Facturas` (`/cliente/facturas`, ítem "Mis facturas" en el menú).
- [ ] Componente `Factura` imprimible (`/cliente/facturas/:id` y `/taller/facturas/:id`) con `@media print`.
- [ ] `cliente/HistorialServicios` y `cliente/DetalleVehiculo`: "Pedir factura" / "Ver factura {folio}".
- [ ] `taller/DetalleOrden`: campo "Mano de obra (MXN)", "Total estimado (sin IVA)" y "Ver factura {folio}".
- [ ] Q47: "Trabajo" en `/taller/ordenes`, "Mis trabajos" y fichas del inicio; verificar el motivo en la agenda (móvil).
- [ ] Probar criterios de aceptación.

---

# 16. Plan de trabajo

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
