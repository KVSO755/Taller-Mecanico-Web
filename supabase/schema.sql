-- =====================================================================
-- TallerApp · schema.sql  (paso 1 de 3)
-- Contiene: tipos enum, tablas, índices, trigger de actualizado_en y
-- habilitación de RLS (las políticas van en policies.sql).
-- Orden en el SQL Editor: schema.sql -> functions.sql -> policies.sql
-- (luego seed.sql / tests.sql). Re-ejecutable: se puede correr de nuevo
-- sin borrar datos.
-- =====================================================================

-- ---------- Tipos ----------
do $$ begin
  create type rol_usuario as enum ('cliente','empleado','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estatus_cita as enum ('pendiente','confirmada','cancelada','atendida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estatus_orden as enum ('recibido','en_diagnostico','en_reparacion','listo','entregado');
exception when duplicate_object then null; end $$;

-- F10: tipos de movimiento del inventario de refacciones.
do $$ begin
  create type tipo_movimiento as enum ('entrada','salida','devolucion','ajuste');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------
create table if not exists perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique,
  telefono text,
  rol rol_usuario not null default 'cliente',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists vehiculos (
  id bigint generated always as identity primary key,
  cliente_id uuid not null default auth.uid() references perfiles,
  placa text not null unique,
  marca text not null,
  modelo text not null,
  anio int not null check (anio between 1950 and extract(year from now())::int + 1),
  kilometraje int not null check (kilometraje >= 0),
  creado_en timestamptz not null default now(),
  constraint vehiculos_placa_formato check (placa ~ '^[A-Z0-9]{5,8}$')
);

-- Para BD creadas antes de esta restricción (re-ejecutable).
do $$ begin
  alter table vehiculos add constraint vehiculos_placa_formato check (placa ~ '^[A-Z0-9]{5,8}$');
exception when duplicate_object then null; end $$;

create table if not exists citas (
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

create table if not exists ordenes (
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

create table if not exists cambios_estatus (
  id bigint generated always as identity primary key,
  orden_id bigint not null references ordenes on delete cascade,
  estatus_anterior estatus_orden,
  estatus_nuevo estatus_orden not null,
  cambiado_por uuid not null references perfiles,
  creado_en timestamptz not null default now()
);

-- F09: mecánico asignado a la orden (null = sin asignar). Re-ejecutable.
alter table ordenes add column if not exists asignado_a uuid references perfiles(id);

-- F10 · Inventario de refacciones (Q34-Q41).
-- Las piezas no se borran: se desactivan (activa = false) para conservar historial.
-- existencias y codigo NUNCA se editan por update directo (ver policies.sql):
-- existencias solo cambia con las funciones rpc de inventario.
create table if not exists piezas (
  id bigint generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[A-Z0-9-]{2,20}$'),   -- se guarda en mayúsculas
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  compatibilidad text,                                                  -- texto libre (Q39)
  costo numeric(10,2) not null check (costo >= 0),                      -- MXN (Q36)
  existencias int not null default 0 check (existencias >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),       -- Q37
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists movimientos_inventario (
  id bigint generated always as identity primary key,
  pieza_id bigint not null references piezas,
  tipo tipo_movimiento not null,
  cantidad int not null,                 -- con signo: + entra, - sale (salida negativa, devolución positiva, ajuste = delta)
  existencias_resultantes int not null check (existencias_resultantes >= 0),
  orden_id bigint references ordenes,    -- salida / devolución
  motivo text,                           -- obligatorio en ajuste
  hecho_por uuid not null references perfiles,
  creado_en timestamptz not null default now()
);

create table if not exists orden_piezas (
  id bigint generated always as identity primary key,
  orden_id bigint not null references ordenes on delete cascade,
  pieza_id bigint not null references piezas,
  cantidad int not null check (cantidad > 0),
  costo_unitario numeric(10,2) not null check (costo_unitario >= 0),   -- copia del costo al momento de usarla
  agregado_por uuid not null references perfiles,
  creado_en timestamptz not null default now(),
  unique (orden_id, pieza_id)
);

-- F11 · Facturación (Q44-Q50). Mano de obra capturada por el taller (Q45, Q48).
alter table ordenes add column if not exists mano_obra numeric(10,2);
do $$ begin
  alter table ordenes add constraint ordenes_mano_obra_check check (mano_obra is null or mano_obra >= 0);
exception when duplicate_object then null; end $$;

-- Factura simple (no CFDI, Q44). Se crea solo con la rpc solicitar_factura;
-- los conceptos son una copia congelada (no cambian si luego cambia la orden).
create table if not exists facturas (
  id bigint generated always as identity primary key,
  folio text not null unique,                 -- 'A-000001' (serie A + id con 6 dígitos)
  orden_id bigint not null unique references ordenes,
  cliente_id uuid not null references perfiles,
  rfc text not null check (rfc ~ '^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$'),
  razon_social text not null check (char_length(trim(razon_social)) between 3 and 250),
  regimen_fiscal text not null,               -- clave SAT de 3 dígitos (catálogo cerrado en la función)
  codigo_postal text not null check (codigo_postal ~ '^[0-9]{5}$'),
  uso_cfdi text not null,                     -- catálogo cerrado en la función
  correo text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  iva numeric(12,2) not null check (iva >= 0),
  total numeric(12,2) not null check (total >= 0),
  emitida_en timestamptz not null default now()
);

create table if not exists factura_conceptos (
  id bigint generated always as identity primary key,
  factura_id bigint not null references facturas on delete cascade,
  descripcion text not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  importe numeric(12,2) not null check (importe >= 0)
);

-- ---------- Índices ----------
create index if not exists idx_citas_fecha_activas
  on citas (fecha_hora) where estatus in ('pendiente','confirmada');
create index if not exists idx_citas_vehiculo     on citas (vehiculo_id);
create index if not exists idx_ordenes_vehiculo   on ordenes (vehiculo_id);
create index if not exists idx_ordenes_estatus    on ordenes (estatus);
create index if not exists idx_ordenes_asignado   on ordenes (asignado_a);
create index if not exists idx_cambios_orden      on cambios_estatus (orden_id);
create index if not exists idx_movimientos_pieza  on movimientos_inventario (pieza_id, creado_en desc);
create index if not exists idx_movimientos_orden  on movimientos_inventario (orden_id);
create index if not exists idx_orden_piezas_orden on orden_piezas (orden_id);
create index if not exists idx_facturas_cliente   on facturas (cliente_id);
create index if not exists idx_factura_conceptos_factura on factura_conceptos (factura_id);

-- Un vehículo tiene como máximo una orden abierta (red de seguridad de crear_orden).
create unique index if not exists uq_ordenes_una_abierta_por_vehiculo
  on ordenes (vehiculo_id) where estatus <> 'entregado';

-- ---------- Trigger: actualizado_en ----------
create or replace function public.tg_ordenes_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

revoke execute on function public.tg_ordenes_actualizado_en() from public, anon, authenticated;

drop trigger if exists ordenes_actualizado_en on ordenes;
create trigger ordenes_actualizado_en
  before update on ordenes
  for each row execute function public.tg_ordenes_actualizado_en();

-- F10: mismo patrón para piezas.actualizado_en.
create or replace function public.tg_piezas_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

revoke execute on function public.tg_piezas_actualizado_en() from public, anon, authenticated;

drop trigger if exists piezas_actualizado_en on piezas;
create trigger piezas_actualizado_en
  before update on piezas
  for each row execute function public.tg_piezas_actualizado_en();

-- ---------- RLS (políticas en policies.sql) ----------
alter table perfiles        enable row level security;
alter table vehiculos       enable row level security;
alter table citas           enable row level security;
alter table ordenes         enable row level security;
alter table cambios_estatus enable row level security;
alter table piezas                 enable row level security;
alter table movimientos_inventario enable row level security;
alter table orden_piezas           enable row level security;
alter table facturas               enable row level security;
alter table factura_conceptos      enable row level security;

-- ---------- Restricciones de formato y longitud (Q52) ----------
-- NOT VALID: no revisan filas existentes, pero se aplican a toda escritura nueva.
do $$ begin
  alter table perfiles add constraint perfiles_telefono_formato
    check (telefono is null or telefono ~ '^[0-9]{10}$') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table perfiles add constraint perfiles_nombre_largo
    check (char_length(trim(nombre)) between 2 and 120) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table vehiculos add constraint vehiculos_marca_largo
    check (char_length(trim(marca)) between 1 and 60) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table vehiculos add constraint vehiculos_modelo_largo
    check (char_length(trim(modelo)) between 1 and 60) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table citas add constraint citas_motivo_largo
    check (char_length(trim(motivo)) between 5 and 200) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table ordenes add constraint ordenes_diagnostico_largo
    check (diagnostico is null or char_length(diagnostico) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table ordenes add constraint ordenes_trabajo_largo
    check (trabajo_realizado is null or char_length(trabajo_realizado) <= 2000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table movimientos_inventario add constraint movs_motivo_largo
    check (motivo is null or char_length(motivo) <= 300) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table piezas add constraint piezas_compat_largo
    check (compatibilidad is null or char_length(compatibilidad) <= 500) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table facturas add constraint facturas_correo_largo
    check (correo is null or char_length(correo) <= 254) not valid;
exception when duplicate_object then null; end $$;

