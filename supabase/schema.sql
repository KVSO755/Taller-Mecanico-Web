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

-- ---------- Índices ----------
create index if not exists idx_citas_fecha_activas
  on citas (fecha_hora) where estatus in ('pendiente','confirmada');
create index if not exists idx_citas_vehiculo     on citas (vehiculo_id);
create index if not exists idx_ordenes_vehiculo   on ordenes (vehiculo_id);
create index if not exists idx_ordenes_estatus    on ordenes (estatus);
create index if not exists idx_cambios_orden      on cambios_estatus (orden_id);

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

-- ---------- RLS (políticas en policies.sql) ----------
alter table perfiles        enable row level security;
alter table vehiculos       enable row level security;
alter table citas           enable row level security;
alter table ordenes         enable row level security;
alter table cambios_estatus enable row level security;
