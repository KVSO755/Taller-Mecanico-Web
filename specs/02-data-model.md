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
  kilometraje   km al recibir el vehículo
  diagnostico   texto (puede estar vacío al inicio)
  trabajo_realizado texto (obligatorio para pasar a "listo")
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
```

## Relaciones

```text
Perfil (cliente) 1 ── N Vehiculo
Vehiculo         1 ── N Cita
Vehiculo         1 ── N OrdenServicio
Cita             1 ── 0..1 OrdenServicio
OrdenServicio    1 ── N CambioEstatus
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
| El kilometraje de una orden no puede ser menor al del vehículo | función `crear_orden` (no hay trigger aparte); la misma función actualiza después `vehiculos.kilometraje` |
| Solo el administrador cambia `rol` y `activo`, y no el de su propia cuenta | funciones `cambiar_rol` y `cambiar_activo` |
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
| ordenes | ver las de sus vehículos | ver todas; crear y avanzar estatus vía `rpc`; update directo solo de `diagnostico` y `trabajo_realizado` si estatus <> `entregado` | igual que empleado |
| cambios_estatus | ver los de sus órdenes | ver todos | ver todos |

Ninguna tabla permite `insert`/`update`/`delete` directo salvo lo indicado en la siguiente subsección.

### Escritura: columnas y funciones

RLS filtra **filas**, no **columnas**: una política que deja a un cliente actualizar su perfil también le dejaría cambiar su `rol`. Por eso se revocan `insert`/`update` generales al rol `authenticated` y se otorgan `GRANT` **por columna**:

| Tabla | Escritura directa permitida (rol `authenticated`) |
|---|---|
| perfiles | `update (nombre, telefono)` solo del propio perfil. El `insert` solo ocurre vía el trigger `crear_perfil`. |
| vehiculos | `insert` (`cliente_id` por defecto `auth.uid()`; la política exige `cliente_id = auth.uid()` y rol `cliente`). `update (marca, modelo, anio)` solo de los suyos. El kilometraje **no** lo edita el cliente después de registrar: solo lo actualiza `crear_orden`. |
| ordenes | `update (diagnostico, trabajo_realizado)`, solo empleado/admin y solo si `estatus <> 'entregado'` ("Guardar notas"). |
| citas | ninguna (ni insert ni update directo para nadie). |
| cambios_estatus | ninguna. |

Todo cambio de estado o de rol va por funciones `rpc` `SECURITY DEFINER` con `set search_path = public`, que validan `mi_rol()` y las reglas del negocio:

| Función | Uso | Feature |
|---|---|---|
| `bloques_ocupados(fecha)` | citas activas por hora de un día (sin datos personales) | F04, F05 |
| `agendar_cita(vehiculo_id, fecha_hora, motivo)` | crea la cita `pendiente` | F04 |
| `confirmar_cita(cita_id)` | `pendiente` → `confirmada` (hasta 15 min después del inicio) | F05 |
| `reprogramar_cita(cita_id, nueva_fecha_hora)` | cambia `fecha_hora`; la cita queda `confirmada` | F05 |
| `cancelar_cita(cita_id)` | cancela y fija `cancelada_por` según `mi_rol()`; el cliente solo hasta 1 h antes | F04, F05 |
| `crear_orden(vehiculo_id, cita_id, kilometraje, diagnostico)` | crea orden, cita `atendida`, actualiza km, bitácora | F06 |
| `avanzar_estatus_orden(orden_id, estatus_esperado)` | avanza un paso y escribe la bitácora | F07 |
| `cambiar_rol(perfil_id, rol)` | solo `admin`, no a sí mismo | F02 |
| `cambiar_activo(perfil_id, activo)` | solo `admin`, no a sí mismo | F02 |
| `cancelar_citas_vencidas()` | cancela `pendiente` 15 min después de su hora (`cancelada_por = 'sistema'`) | F04, F05 |

Bloque ilustrativo (el SQL real vive en `supabase/`):

```sql
-- Supabase da ALL a anon y authenticated por defecto: se quita todo y se otorga lo mínimo.
revoke all on perfiles, vehiculos, citas, ordenes, cambios_estatus from anon, authenticated;
grant select on perfiles, vehiculos, citas, ordenes, cambios_estatus to authenticated;  -- RLS filtra filas

grant update (nombre, telefono)               on perfiles  to authenticated;
grant insert (placa, marca, modelo, anio, kilometraje) on vehiculos to authenticated;  -- cliente_id lo llena su default auth.uid()
grant update (marca, modelo, anio)            on vehiculos to authenticated;
grant update (diagnostico, trabajo_realizado) on ordenes   to authenticated;

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
  kilometraje int not null check (kilometraje >= 0),
  diagnostico text,
  trabajo_realizado text,
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
```

Además (se detallan en cada feature):

- función `mi_rol()` (devuelve `null` si `activo = false`) y trigger `crear_perfil` en `auth.users` → inserta el perfil con rol `cliente` al registrarse (F01);
- funciones `rpc` de la tabla "Escritura: columnas y funciones": `bloques_ocupados`, `agendar_cita` (F04); `confirmar_cita`, `reprogramar_cita`, `cancelar_cita`, `cancelar_citas_vencidas` (F04/F05); `crear_orden` (F06); `avanzar_estatus_orden` (F07); `cambiar_rol`, `cambiar_activo` (F02);
- trigger `before update` en `ordenes` que actualiza `actualizado_en` (la columna no es editable directamente);
- `revoke`/`grant` por columna y políticas RLS de la tabla de permisos.
