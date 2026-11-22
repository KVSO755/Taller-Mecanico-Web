# Modelo de datos

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
