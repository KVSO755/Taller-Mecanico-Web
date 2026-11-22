-- =====================================================================
-- TallerApp · functions.sql  (paso 2 de 3)
-- Contiene: mi_rol(), trigger crear_perfil, helpers internos (_validar_bloque,
-- _capacidad_disponible, _validar_mecanico, _validar_edicion_orden), las funciones rpc de negocio (SECURITY DEFINER),
-- REVOKE/GRANT de ejecución y la tarea pg_cron.
-- Orden en el SQL Editor: schema.sql -> functions.sql -> policies.sql
-- Re-ejecutable (create or replace / drop trigger if exists / unschedule).
--
-- Convenciones:
--  * Todas las funciones usan SECURITY DEFINER + search_path = public y validan
--    mi_rol() antes de actuar (auth.uid() es null para anon => mi_rol() null).
--  * Los errores de negocio son `raise exception '<mensaje>'` (SQLSTATE P0001);
--    el frontend muestra el mensaje tal cual.
--  * Zona horaria fija del taller: America/Tijuana.
-- =====================================================================

-- ---------------------------------------------------------------------
-- mi_rol(): rol del usuario actual, o null si no existe o activo = false.
-- SECURITY DEFINER para que las políticas RLS no entren en recursión
-- al consultar perfiles.
-- ---------------------------------------------------------------------
create or replace function public.mi_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo;
$$;

-- ---------------------------------------------------------------------
-- crear_perfil(): trigger AFTER INSERT en auth.users (F01).
-- ---------------------------------------------------------------------
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, telefono, correo, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
    -- Q52: solo dígitos; si no son exactamente 10, se guarda null (no se rechaza el registro).
    case when length(regexp_replace(coalesce(new.raw_user_meta_data->>'telefono', ''), '[^0-9]', '', 'g')) = 10
         then regexp_replace(new.raw_user_meta_data->>'telefono', '[^0-9]', '', 'g') end,
    lower(new.email),
    'cliente'
  );
  return new;
end;
$$;

drop trigger if exists crear_perfil on auth.users;
create trigger crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------------------------------------------------------------------
-- _validar_bloque(fecha_hora): horario del taller en America/Tijuana.
--   L-V bloques 08..17, sábado 08..13, domingo cerrado,
--   fecha local desde mañana hasta hoy + 30 días, inicio en punto.
-- ---------------------------------------------------------------------
create or replace function public._validar_bloque(p_fecha_hora timestamptz)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local  timestamp;
  v_hoy    date;
  v_dia    int;
  v_hora   int;
  v_ultima int;
begin
  if p_fecha_hora is null then
    raise exception 'Elige una fecha y una hora.' using errcode = 'P0001';
  end if;

  v_local := p_fecha_hora at time zone 'America/Tijuana';

  if v_local <> date_trunc('hour', v_local) then
    raise exception 'El horario debe iniciar en punto (bloques de 1 hora).' using errcode = 'P0001';
  end if;

  v_dia  := extract(isodow from v_local)::int;   -- 1 = lunes ... 7 = domingo
  v_hora := extract(hour from v_local)::int;

  if v_dia = 7 then
    raise exception 'El taller no abre ese día.' using errcode = 'P0001';
  end if;

  v_ultima := case when v_dia = 6 then 13 else 17 end;   -- último bloque que puede iniciar
  if v_hora < 8 or v_hora > v_ultima then
    raise exception 'Ese horario está fuera del horario del taller.' using errcode = 'P0001';
  end if;

  v_hoy := (now() at time zone 'America/Tijuana')::date;
  if v_local::date < v_hoy + 1 then
    raise exception 'Solo se puede elegir una fecha a partir de mañana.' using errcode = 'P0001';
  end if;
  if v_local::date > v_hoy + 30 then
    raise exception 'Solo se puede elegir una fecha dentro de los próximos 30 días.' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- _capacidad_disponible(fecha_hora, excluir_cita_id): true si el bloque
-- tiene lugar (< 3 citas activas). Toma un lock transaccional por bloque
-- para serializar agendados simultáneos; el lock se libera al terminar la
-- transacción. La llave usa epoch (no ::text) para no depender del TimeZone
-- de la sesión.
-- ---------------------------------------------------------------------
create or replace function public._capacidad_disponible(p_fecha_hora timestamptz, p_excluir_cita_id bigint default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ocupadas int;
begin
  perform pg_advisory_xact_lock(hashtext('bloque:' || extract(epoch from p_fecha_hora)::bigint::text));

  select count(*) into v_ocupadas
  from public.citas c
  where c.fecha_hora = p_fecha_hora
    and c.estatus in ('pendiente','confirmada')
    and c.fecha_hora > now()
    and (p_excluir_cita_id is null or c.id <> p_excluir_cita_id);

  return v_ocupadas < 3;
end;
$$;

-- ---------------------------------------------------------------------
-- bloques_ocupados(fecha): citas activas por hora de un día (local Tijuana).
-- Solo devuelve bloques con al menos una cita; sin datos personales.
-- ---------------------------------------------------------------------
create or replace function public.bloques_ocupados(fecha date)
returns table (hora timestamptz, ocupadas int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.mi_rol() is null then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  return query
    select c.fecha_hora, count(*)::int
    from public.citas c
    where c.estatus in ('pendiente','confirmada')
      and c.fecha_hora > now()
      and c.fecha_hora >= (fecha::timestamp at time zone 'America/Tijuana')
      and c.fecha_hora <  ((fecha + 1)::timestamp at time zone 'America/Tijuana')
    group by c.fecha_hora
    order by c.fecha_hora;
end;
$$;

-- ---------------------------------------------------------------------
-- agendar_cita (F04): solo cliente, vehículo propio.
-- ---------------------------------------------------------------------
create or replace function public.agendar_cita(p_vehiculo_id bigint, p_fecha_hora timestamptz, p_motivo text)
returns citas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_veh    vehiculos;
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_activa timestamptz;
  v_cita   citas;
begin
  if public.mi_rol() is distinct from 'cliente' then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  -- Bloquea el vehículo: evita dos citas activas simultáneas del mismo vehículo.
  select * into v_veh from public.vehiculos
  where id = p_vehiculo_id and cliente_id = auth.uid()
  for update;
  if not found then
    raise exception 'Vehículo no encontrado.' using errcode = 'P0001';
  end if;

  if char_length(v_motivo) < 5 or char_length(v_motivo) > 200 then
    raise exception 'El motivo debe tener entre 5 y 200 caracteres.' using errcode = 'P0001';
  end if;

  perform public._validar_bloque(p_fecha_hora);

  select c.fecha_hora into v_activa
  from public.citas c
  where c.vehiculo_id = p_vehiculo_id
    and c.estatus in ('pendiente','confirmada')
    and c.fecha_hora > now()
  limit 1;
  if found then
    raise exception 'Este vehículo ya tiene una cita el %.',
      to_char(v_activa at time zone 'America/Tijuana', 'DD/MM/YYYY "a las" HH24:MI')
      using errcode = 'P0001';
  end if;

  if not public._capacidad_disponible(p_fecha_hora, null) then
    raise exception 'Ese horario se acaba de ocupar. Elige otro.' using errcode = 'P0001';
  end if;

  insert into public.citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (auth.uid(), p_vehiculo_id, p_fecha_hora, v_motivo, 'pendiente')
  returning * into v_cita;

  return v_cita;
end;
$$;

-- ---------------------------------------------------------------------
-- confirmar_cita (F05): empleado/admin; pendiente -> confirmada,
-- permitido hasta fecha_hora + 15 min.
-- ---------------------------------------------------------------------
create or replace function public.confirmar_cita(p_cita_id bigint)
returns citas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita citas;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    raise exception 'Cita no encontrada.' using errcode = 'P0001';
  end if;

  if v_cita.estatus <> 'pendiente' then
    raise exception 'Esta cita ya fue modificada. Se actualizó la lista.' using errcode = 'P0001';
  end if;

  if now() > v_cita.fecha_hora + interval '15 minutes' then
    raise exception 'Esta cita se canceló porque no se confirmó a tiempo.' using errcode = 'P0001';
  end if;

  update public.citas set estatus = 'confirmada' where id = p_cita_id returning * into v_cita;
  return v_cita;
end;
$$;

-- ---------------------------------------------------------------------
-- reprogramar_cita (F05): empleado/admin; pendiente/confirmada -> confirmada
-- en el nuevo bloque.
-- ---------------------------------------------------------------------
create or replace function public.reprogramar_cita(p_cita_id bigint, p_nueva_fecha_hora timestamptz)
returns citas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita citas;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    raise exception 'Cita no encontrada.' using errcode = 'P0001';
  end if;

  if v_cita.estatus not in ('pendiente','confirmada') then
    raise exception 'Esta cita ya fue modificada. Se actualizó la lista.' using errcode = 'P0001';
  end if;

  -- Pendiente que ya pasó su ventana: el cron aún no la cancelaba.
  if v_cita.estatus = 'pendiente' and now() > v_cita.fecha_hora + interval '15 minutes' then
    raise exception 'Esta cita se canceló porque no se confirmó a tiempo.' using errcode = 'P0001';
  end if;

  perform public._validar_bloque(p_nueva_fecha_hora);

  if not public._capacidad_disponible(p_nueva_fecha_hora, p_cita_id) then
    raise exception 'Ese horario ya no tiene lugar. Elige otro.' using errcode = 'P0001';
  end if;

  update public.citas
  set fecha_hora = p_nueva_fecha_hora, estatus = 'confirmada'
  where id = p_cita_id
  returning * into v_cita;

  return v_cita;
end;
$$;

-- ---------------------------------------------------------------------
-- cancelar_cita (F04/F05): cliente (suyas, hasta 1 h antes) o empleado/admin
-- (cualquier momento); cancelada_por según rol.
-- ---------------------------------------------------------------------
create or replace function public.cancelar_cita(p_cita_id bigint)
returns citas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol  rol_usuario := public.mi_rol();
  v_cita citas;
  v_por  text;
begin
  if v_rol is null then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select * into v_cita from public.citas where id = p_cita_id for update;
  -- Para un cliente, una cita ajena se trata como inexistente.
  if not found or (v_rol = 'cliente' and v_cita.cliente_id <> auth.uid()) then
    raise exception 'Cita no encontrada.' using errcode = 'P0001';
  end if;

  if v_cita.estatus not in ('pendiente','confirmada') then
    raise exception 'Esta cita ya fue modificada. Se actualizó la lista.' using errcode = 'P0001';
  end if;

  if v_rol = 'cliente' then
    if now() > v_cita.fecha_hora - interval '1 hour' then
      raise exception 'Ya no puedes cancelar en línea. Llama al taller.' using errcode = 'P0001';
    end if;
    v_por := 'cliente';
  else
    v_por := 'taller';
  end if;

  update public.citas
  set estatus = 'cancelada', cancelada_por = v_por
  where id = p_cita_id
  returning * into v_cita;

  return v_cita;
end;
$$;

-- ---------------------------------------------------------------------
-- cancelar_citas_vencidas(): pendientes con 15 min vencidos -> cancelada por
-- 'sistema'. Idempotente. La llama pg_cron (sin sesión: auth.uid() null) y
-- el frontend como respaldo (cualquier usuario activo).
-- ---------------------------------------------------------------------
create or replace function public.cancelar_citas_vencidas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if auth.uid() is not null and public.mi_rol() is null then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  update public.citas
  set estatus = 'cancelada', cancelada_por = 'sistema'
  where estatus = 'pendiente'
    and fecha_hora + interval '15 minutes' < now();

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- _validar_mecanico(uuid) (F09): perfil activo con rol empleado/admin.
-- Helper interno: no se otorga a anon ni authenticated.
-- ---------------------------------------------------------------------
create or replace function public._validar_mecanico(p_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.perfiles p
    where p.id = p_id and p.activo and p.rol in ('empleado','admin')
  ) then
    raise exception 'Esa persona no es empleado activo del taller.' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- crear_orden (F06/F09): empleado/admin. Todo en una transacción: orden,
-- cita -> atendida, km del vehículo, primera fila de bitácora.
-- Empleado: la orden queda asignada a él. Admin: p_asignado_a (opcional).
-- El drop evita dejar la firma anterior (4 parámetros) como sobrecarga.
-- ---------------------------------------------------------------------
drop function if exists public.crear_orden(bigint, bigint, int, text);

create or replace function public.crear_orden(
  p_vehiculo_id bigint,
  p_cita_id bigint,
  p_kilometraje int,
  p_diagnostico text,
  p_asignado_a uuid default null
)
returns ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol      rol_usuario := public.mi_rol();
  v_veh      vehiculos;
  v_cita     citas;
  v_abierta  bigint;
  v_asignado uuid;
  v_orden    ordenes;
begin
  if v_rol is null or v_rol not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  -- Bloquea el vehículo: serializa dos creaciones simultáneas de orden.
  select * into v_veh from public.vehiculos where id = p_vehiculo_id for update;
  if not found then
    raise exception 'Vehículo no encontrado.' using errcode = 'P0001';
  end if;

  if p_cita_id is not null then
    select * into v_cita from public.citas where id = p_cita_id for update;
    if not found then
      raise exception 'Cita no encontrada.' using errcode = 'P0001';
    end if;
    if v_cita.vehiculo_id <> p_vehiculo_id then
      raise exception 'La cita no corresponde a este vehículo.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.ordenes o where o.cita_id = p_cita_id) then
      raise exception 'Esta cita ya tiene una orden.' using errcode = 'P0001';
    end if;
    if v_cita.estatus <> 'confirmada'
       or (v_cita.fecha_hora at time zone 'America/Tijuana')::date
          <> (now() at time zone 'America/Tijuana')::date then
      raise exception 'Solo se puede crear la orden de una cita confirmada de hoy.' using errcode = 'P0001';
    end if;
  end if;

  if p_kilometraje is null or p_kilometraje < 0 then
    raise exception 'Escribe un kilometraje válido.' using errcode = 'P0001';
  end if;
  if p_kilometraje < v_veh.kilometraje then
    raise exception 'El kilometraje no puede ser menor a % km (último registrado).', v_veh.kilometraje
      using errcode = 'P0001';
  end if;

  select o.id into v_abierta
  from public.ordenes o
  where o.vehiculo_id = p_vehiculo_id and o.estatus <> 'entregado'
  limit 1;
  if found then
    raise exception 'Este vehículo ya tiene la orden #% abierta.', v_abierta using errcode = 'P0001';
  end if;

  -- Q32: el empleado se asigna a sí mismo (ignora el parámetro); el admin elige (o null).
  if v_rol = 'empleado' then
    v_asignado := auth.uid();
  else
    v_asignado := p_asignado_a;
    if v_asignado is not null then
      perform public._validar_mecanico(v_asignado);
    end if;
  end if;

  insert into public.ordenes (vehiculo_id, cita_id, creada_por, asignado_a, kilometraje, diagnostico, estatus)
  values (p_vehiculo_id, p_cita_id, auth.uid(), v_asignado, p_kilometraje, nullif(trim(coalesce(p_diagnostico, '')), ''), 'recibido')
  returning * into v_orden;

  if p_cita_id is not null then
    update public.citas set estatus = 'atendida' where id = p_cita_id;
  end if;

  update public.vehiculos set kilometraje = p_kilometraje where id = p_vehiculo_id;

  insert into public.cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por)
  values (v_orden.id, null, 'recibido', auth.uid());

  return v_orden;
end;
$$;

-- ---------------------------------------------------------------------
-- avanzar_estatus_orden (F07): empleado/admin; avanza un solo paso.
-- p_estatus_esperado protege contra dos empleados avanzando a la vez.
-- ---------------------------------------------------------------------
create or replace function public.avanzar_estatus_orden(p_orden_id bigint, p_estatus_esperado estatus_orden)
returns ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden     ordenes;
  v_siguiente estatus_orden;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    raise exception 'Orden no encontrada.' using errcode = 'P0001';
  end if;

  if v_orden.estatus is distinct from p_estatus_esperado then
    raise exception 'La orden ya fue actualizada por otra persona.' using errcode = 'P0001';
  end if;

  v_siguiente := case v_orden.estatus
    when 'recibido'       then 'en_diagnostico'::estatus_orden
    when 'en_diagnostico' then 'en_reparacion'::estatus_orden
    when 'en_reparacion'  then 'listo'::estatus_orden
    when 'listo'          then 'entregado'::estatus_orden
    else null
  end;
  if v_siguiente is null then
    raise exception 'Orden cerrada.' using errcode = 'P0001';
  end if;

  -- Q31: un empleado solo avanza las órdenes asignadas a él (el admin, todas).
  if public.mi_rol() = 'empleado' then
    if v_orden.asignado_a is null then
      raise exception 'Esta orden no tiene mecánico asignado. Pide al administrador que la asigne.' using errcode = 'P0001';
    end if;
    if v_orden.asignado_a <> auth.uid() then
      raise exception 'Esta orden está asignada a otro mecánico.' using errcode = 'P0001';
    end if;
  end if;

  if v_siguiente = 'en_reparacion' and nullif(trim(coalesce(v_orden.diagnostico, '')), '') is null then
    raise exception 'Escribe el diagnóstico antes de pasar a reparación.' using errcode = 'P0001';
  end if;
  if v_siguiente = 'listo' and nullif(trim(coalesce(v_orden.trabajo_realizado, '')), '') is null then
    raise exception 'Describe el trabajo realizado antes de marcar como listo.' using errcode = 'P0001';
  end if;

  -- F11/Q48: para entregar, la mano de obra debe estar capturada (0 es válido).
  if v_siguiente = 'entregado' and v_orden.mano_obra is null then
    raise exception 'Captura la mano de obra antes de marcar como entregado.' using errcode = 'P0001';
  end if;

  update public.ordenes
  set estatus = v_siguiente,
      entregado_en = case when v_siguiente = 'entregado' then now() else entregado_en end
  where id = p_orden_id
  returning * into v_orden;

  insert into public.cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por)
  values (p_orden_id, p_estatus_esperado, v_siguiente, auth.uid());

  return v_orden;
end;
$$;

-- ---------------------------------------------------------------------
-- asignar_orden (F09): solo admin; orden abierta; p_empleado_id null = quitar.
-- ---------------------------------------------------------------------
create or replace function public.asignar_orden(p_orden_id bigint, p_empleado_id uuid)
returns ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden ordenes;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador puede hacer este cambio.' using errcode = 'P0001';
  end if;

  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    raise exception 'Orden no encontrada.' using errcode = 'P0001';
  end if;
  if v_orden.estatus = 'entregado' then
    raise exception 'Orden cerrada.' using errcode = 'P0001';
  end if;

  if p_empleado_id is not null then
    perform public._validar_mecanico(p_empleado_id);
  end if;

  update public.ordenes set asignado_a = p_empleado_id where id = p_orden_id returning * into v_orden;
  return v_orden;
end;
$$;

-- ---------------------------------------------------------------------
-- nombre_mecanico (F09/Q33): nombre del asignado, visible para el taller y
-- para el dueño del vehículo de la orden; null en cualquier otro caso.
-- ---------------------------------------------------------------------
create or replace function public.nombre_mecanico(p_orden_id bigint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rol    rol_usuario := public.mi_rol();
  v_nombre text;
begin
  if v_rol is null then
    return null;
  end if;

  select p.nombre into v_nombre
  from public.ordenes o
  join public.vehiculos v on v.id = o.vehiculo_id
  join public.perfiles p  on p.id = o.asignado_a
  where o.id = p_orden_id
    and (v_rol in ('empleado','admin') or v.cliente_id = auth.uid());

  return v_nombre;
end;
$$;

-- ---------------------------------------------------------------------
-- cambiar_rol / cambiar_activo (F02): solo admin, nunca sobre sí mismo.
-- ---------------------------------------------------------------------
create or replace function public.cambiar_rol(p_perfil_id uuid, p_rol rol_usuario)
returns perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil perfiles;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador puede hacer este cambio.' using errcode = 'P0001';
  end if;
  if p_perfil_id = auth.uid() then
    raise exception 'No puedes modificar tu propia cuenta.' using errcode = 'P0001';
  end if;
  if p_rol is null then
    raise exception 'Indica el rol.' using errcode = 'P0001';
  end if;

  select * into v_perfil from public.perfiles where id = p_perfil_id for update;
  if not found then
    raise exception 'No se encontró a la persona.' using errcode = 'P0001';
  end if;

  if p_rol = 'empleado' and v_perfil.rol = 'empleado' then
    raise exception 'Esta persona ya es empleado.' using errcode = 'P0001';
  end if;

  update public.perfiles set rol = p_rol where id = p_perfil_id returning * into v_perfil;
  return v_perfil;
end;
$$;

create or replace function public.cambiar_activo(p_perfil_id uuid, p_activo boolean)
returns perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil perfiles;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador puede hacer este cambio.' using errcode = 'P0001';
  end if;
  if p_perfil_id = auth.uid() then
    raise exception 'No puedes modificar tu propia cuenta.' using errcode = 'P0001';
  end if;
  if p_activo is null then
    raise exception 'Indica si la cuenta queda activa o desactivada.' using errcode = 'P0001';
  end if;

  update public.perfiles set activo = p_activo where id = p_perfil_id returning * into v_perfil;
  if not found then
    raise exception 'No se encontró a la persona.' using errcode = 'P0001';
  end if;
  return v_perfil;
end;
$$;

-- =====================================================================
-- F10 · Inventario de refacciones (Q34-Q41)
-- Orden de bloqueo en las funciones: orden -> pieza (evita interbloqueos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- _validar_edicion_orden(orden) (F10/Q40): regla de F09 para tocar una orden
-- abierta: empleado/admin; no entregada; un empleado solo si es el asignado
-- (el admin, siempre). Bloquea la orden (for update) y la devuelve.
-- Helper interno: no se otorga a anon ni authenticated.
-- ---------------------------------------------------------------------
create or replace function public._validar_edicion_orden(p_orden_id bigint)
returns ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol   rol_usuario := public.mi_rol();
  v_orden ordenes;
begin
  if v_rol is null or v_rol not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    raise exception 'Orden no encontrada.' using errcode = 'P0001';
  end if;

  if v_orden.estatus = 'entregado' then
    raise exception 'Orden cerrada.' using errcode = 'P0001';
  end if;

  if v_rol = 'empleado' then
    if v_orden.asignado_a is null then
      raise exception 'Esta orden no tiene mecánico asignado. Pide al administrador que la asigne.' using errcode = 'P0001';
    end if;
    if v_orden.asignado_a <> auth.uid() then
      raise exception 'Esta orden está asignada a otro mecánico.' using errcode = 'P0001';
    end if;
  end if;

  return v_orden;
end;
$$;

-- ---------------------------------------------------------------------
-- crear_pieza (F10/Q34): empleado/admin. Normaliza el código (mayúsculas,
-- sin espacios). Con existencias iniciales > 0 registra una 'entrada'.
-- ---------------------------------------------------------------------
create or replace function public.crear_pieza(
  p_codigo text,
  p_nombre text,
  p_compatibilidad text,
  p_costo numeric,
  p_existencias int,
  p_stock_minimo int
)
returns piezas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_exist  int  := coalesce(p_existencias, 0);
  v_min    int  := coalesce(p_stock_minimo, 0);
  v_pieza  piezas;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  if v_codigo !~ '^[A-Z0-9-]{2,20}$' then
    raise exception 'El código debe tener de 2 a 20 caracteres: letras, números o guiones.' using errcode = 'P0001';
  end if;
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 120 then
    raise exception 'El nombre debe tener entre 2 y 120 caracteres.' using errcode = 'P0001';
  end if;
  if p_costo is null or p_costo < 0 or p_costo >= 100000000 then
    raise exception 'Escribe un costo válido.' using errcode = 'P0001';
  end if;
  if v_exist < 0 then
    raise exception 'Las existencias no pueden ser negativas.' using errcode = 'P0001';
  end if;
  if v_min < 0 then
    raise exception 'El stock mínimo no puede ser negativo.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.piezas z where z.codigo = v_codigo) then
    raise exception 'Ya existe una pieza con ese código.' using errcode = 'P0001';
  end if;

  begin
    insert into public.piezas (codigo, nombre, compatibilidad, costo, existencias, stock_minimo)
    values (v_codigo, v_nombre, nullif(trim(coalesce(p_compatibilidad, '')), ''), round(p_costo, 2), v_exist, v_min)
    returning * into v_pieza;
  exception when unique_violation then
    raise exception 'Ya existe una pieza con ese código.' using errcode = 'P0001';
  end;

  if v_exist > 0 then
    insert into public.movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, motivo, hecho_por)
    values (v_pieza.id, 'entrada', v_exist, v_exist, 'Existencia inicial', auth.uid());
  end if;

  return v_pieza;
end;
$$;

-- ---------------------------------------------------------------------
-- registrar_entrada (F10/Q38): empleado/admin; suma existencias.
-- ---------------------------------------------------------------------
create or replace function public.registrar_entrada(p_pieza_id bigint, p_cantidad int, p_motivo text default null)
returns piezas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pieza piezas;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.' using errcode = 'P0001';
  end if;

  select * into v_pieza from public.piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'Pieza no encontrada.' using errcode = 'P0001';
  end if;

  update public.piezas set existencias = existencias + p_cantidad
  where id = p_pieza_id
  returning * into v_pieza;

  insert into public.movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, motivo, hecho_por)
  values (p_pieza_id, 'entrada', p_cantidad, v_pieza.existencias, nullif(trim(coalesce(p_motivo, '')), ''), auth.uid());

  return v_pieza;
end;
$$;

-- ---------------------------------------------------------------------
-- ajustar_existencias (F10/Q38): empleado/admin; fija las existencias y
-- registra el delta como 'ajuste'. El motivo es obligatorio.
-- ---------------------------------------------------------------------
create or replace function public.ajustar_existencias(p_pieza_id bigint, p_nuevas int, p_motivo text)
returns piezas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pieza  piezas;
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_delta  int;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  if p_nuevas is null or p_nuevas < 0 then
    raise exception 'Las existencias nuevas no pueden ser negativas.' using errcode = 'P0001';
  end if;
  if v_motivo = '' then
    raise exception 'Escribe el motivo del ajuste.' using errcode = 'P0001';
  end if;

  select * into v_pieza from public.piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'Pieza no encontrada.' using errcode = 'P0001';
  end if;

  v_delta := p_nuevas - v_pieza.existencias;
  if v_delta = 0 then
    raise exception 'Las existencias no cambiaron.' using errcode = 'P0001';
  end if;

  update public.piezas set existencias = p_nuevas
  where id = p_pieza_id
  returning * into v_pieza;

  insert into public.movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, motivo, hecho_por)
  values (p_pieza_id, 'ajuste', v_delta, p_nuevas, v_motivo, auth.uid());

  return v_pieza;
end;
$$;

-- ---------------------------------------------------------------------
-- usar_pieza_en_orden (F10/Q35, Q40): admin o mecánico asignado, orden no
-- entregada. Descuenta del stock; si la pieza ya está en la orden suma la
-- cantidad y conserva su costo_unitario original.
-- ---------------------------------------------------------------------
create or replace function public.usar_pieza_en_orden(p_orden_id bigint, p_pieza_id bigint, p_cantidad int)
returns orden_piezas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden  ordenes;
  v_pieza  piezas;
  v_op     orden_piezas;
begin
  v_orden := public._validar_edicion_orden(p_orden_id);   -- rol, orden, cerrada, asignación

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.' using errcode = 'P0001';
  end if;

  select * into v_pieza from public.piezas where id = p_pieza_id for update;
  if not found then
    raise exception 'Pieza no encontrada.' using errcode = 'P0001';
  end if;
  if not v_pieza.activa then
    raise exception 'Esta pieza está desactivada.' using errcode = 'P0001';
  end if;
  if v_pieza.existencias < p_cantidad then
    raise exception 'No hay suficientes existencias: quedan %.', v_pieza.existencias using errcode = 'P0001';
  end if;

  update public.piezas set existencias = existencias - p_cantidad
  where id = p_pieza_id
  returning * into v_pieza;

  select * into v_op from public.orden_piezas
  where orden_id = p_orden_id and pieza_id = p_pieza_id
  for update;

  if found then
    update public.orden_piezas set cantidad = cantidad + p_cantidad
    where id = v_op.id
    returning * into v_op;
  else
    insert into public.orden_piezas (orden_id, pieza_id, cantidad, costo_unitario, agregado_por)
    values (p_orden_id, p_pieza_id, p_cantidad, v_pieza.costo, auth.uid())
    returning * into v_op;
  end if;

  insert into public.movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, orden_id, hecho_por)
  values (p_pieza_id, 'salida', -p_cantidad, v_pieza.existencias, p_orden_id, auth.uid());

  return v_op;
end;
$$;

-- ---------------------------------------------------------------------
-- quitar_pieza_de_orden (F10/Q38, Q40): mismas reglas de rol/orden; devuelve
-- todo al stock ('devolucion') y borra la fila de orden_piezas.
-- ---------------------------------------------------------------------
create or replace function public.quitar_pieza_de_orden(p_orden_pieza_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden_id bigint;
  v_op       orden_piezas;
  v_pieza    piezas;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  select op.orden_id into v_orden_id from public.orden_piezas op where op.id = p_orden_pieza_id;
  if not found then
    raise exception 'Refacción no encontrada en la orden.' using errcode = 'P0001';
  end if;

  perform public._validar_edicion_orden(v_orden_id);   -- bloquea la orden primero

  select * into v_op from public.orden_piezas where id = p_orden_pieza_id for update;
  if not found then
    raise exception 'Refacción no encontrada en la orden.' using errcode = 'P0001';
  end if;

  select * into v_pieza from public.piezas where id = v_op.pieza_id for update;

  update public.piezas set existencias = existencias + v_op.cantidad
  where id = v_op.pieza_id
  returning * into v_pieza;

  insert into public.movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, orden_id, motivo, hecho_por)
  values (v_op.pieza_id, 'devolucion', v_op.cantidad, v_pieza.existencias, v_op.orden_id, 'Quitada de la orden', auth.uid());

  delete from public.orden_piezas where id = p_orden_pieza_id;
end;
$$;

-- ---------------------------------------------------------------------
-- piezas_usadas (F10/Q41): piezas de una orden SIN costos, para el taller o
-- para el cliente dueño del vehículo. Cualquier otro caso: 0 filas.
-- ---------------------------------------------------------------------
create or replace function public.piezas_usadas(p_orden_id bigint)
returns table (nombre text, codigo text, cantidad int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rol rol_usuario := public.mi_rol();
begin
  if v_rol is null then
    raise exception 'No tienes permiso para realizar esta acción.' using errcode = 'P0001';
  end if;

  return query
    select z.nombre, z.codigo, op.cantidad
    from public.orden_piezas op
    join public.piezas z    on z.id = op.pieza_id
    join public.ordenes o   on o.id = op.orden_id
    join public.vehiculos v on v.id = o.vehiculo_id
    where op.orden_id = p_orden_id
      and (v_rol in ('empleado','admin') or v.cliente_id = auth.uid())
    order by z.nombre;
end;
$$;

-- ---------------------------------------------------------------------
-- solicitar_factura (F11/Q44-Q50): el cliente dueño del vehículo pide la
-- factura simple de una orden entregada. Los conceptos se congelan al crearla.
-- Se bloquea la orden (for update) para que dos solicitudes simultáneas no
-- generen dos facturas (red extra: unique(orden_id)).
-- Empleado/admin: reciben 'Orden no encontrada.' (no son dueños de ningún vehículo).
-- ---------------------------------------------------------------------
create or replace function public.solicitar_factura(
  p_orden_id bigint,
  p_rfc text,
  p_razon_social text,
  p_regimen_fiscal text,
  p_codigo_postal text,
  p_uso_cfdi text,
  p_correo text
)
returns facturas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden    ordenes;
  v_factura  facturas;
  v_folio    text;
  v_rfc      text := upper(trim(coalesce(p_rfc, '')));
  v_razon    text := trim(coalesce(p_razon_social, ''));
  v_regimen  text := trim(coalesce(p_regimen_fiscal, ''));
  v_cp       text := trim(coalesce(p_codigo_postal, ''));
  v_uso      text := upper(trim(coalesce(p_uso_cfdi, '')));
  v_correo   text := trim(coalesce(p_correo, ''));
  v_subtotal numeric(12,2);
  v_iva      numeric(12,2);
begin
  if auth.uid() is null or public.mi_rol() is distinct from 'cliente' then
    raise exception 'Orden no encontrada.' using errcode = 'P0001';
  end if;

  -- Solo la orden de un vehículo propio; bloquea la fila de la orden.
  select o.* into v_orden
  from public.ordenes o
  join public.vehiculos v on v.id = o.vehiculo_id
  where o.id = p_orden_id and v.cliente_id = auth.uid()
  for update of o;
  if not found then
    raise exception 'Orden no encontrada.' using errcode = 'P0001';
  end if;

  if v_orden.estatus <> 'entregado' then
    raise exception 'La factura solo se puede pedir cuando el servicio está entregado.' using errcode = 'P0001';
  end if;

  select f.folio into v_folio from public.facturas f where f.orden_id = p_orden_id;
  if found then
    raise exception 'Esta orden ya tiene la factura %.', v_folio using errcode = 'P0001';
  end if;

  if v_rfc !~ '^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$' then
    raise exception 'Escribe un RFC válido.' using errcode = 'P0001';
  end if;
  if char_length(v_razon) not between 3 and 250 then
    raise exception 'Escribe la razón social (de 3 a 250 caracteres).' using errcode = 'P0001';
  end if;
  if v_regimen not in ('601','603','605','606','612','616','621','625','626') then
    raise exception 'Elige un régimen fiscal válido.' using errcode = 'P0001';
  end if;
  if v_cp !~ '^[0-9]{5}$' then
    raise exception 'El código postal debe tener 5 dígitos.' using errcode = 'P0001';
  end if;
  if v_uso not in ('G01','G02','G03','I01','I02','I03','I04','I08','D01','S01','CP01') then
    raise exception 'Elige un uso de CFDI válido.' using errcode = 'P0001';
  end if;
  if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Escribe un correo válido.' using errcode = 'P0001';
  end if;

  -- Subtotal = refacciones usadas (cantidad x costo_unitario) + mano de obra (si > 0).
  select coalesce(sum(round(op.cantidad * op.costo_unitario, 2)), 0) + coalesce(v_orden.mano_obra, 0)
  into v_subtotal
  from public.orden_piezas op
  where op.orden_id = p_orden_id;

  if v_subtotal <= 0 then
    raise exception 'Este servicio no tiene montos para facturar.' using errcode = 'P0001';
  end if;
  v_iva := round(v_subtotal * 0.16, 2);

  -- Folio provisional único; se reemplaza enseguida por 'A-' + id con 6 dígitos.
  insert into public.facturas
    (folio, orden_id, cliente_id, rfc, razon_social, regimen_fiscal, codigo_postal,
     uso_cfdi, correo, subtotal, iva, total)
  values
    ('tmp-' || p_orden_id, p_orden_id, auth.uid(), v_rfc, v_razon, v_regimen, v_cp,
     v_uso, v_correo, v_subtotal, v_iva, v_subtotal + v_iva)
  returning * into v_factura;

  update public.facturas
  set folio = 'A-' || lpad(id::text, 6, '0')
  where id = v_factura.id
  returning * into v_factura;

  insert into public.factura_conceptos (factura_id, descripcion, cantidad, precio_unitario, importe)
  select v_factura.id, z.nombre || ' (' || z.codigo || ')', op.cantidad, op.costo_unitario,
         round(op.cantidad * op.costo_unitario, 2)
  from public.orden_piezas op
  join public.piezas z on z.id = op.pieza_id
  where op.orden_id = p_orden_id
  order by z.nombre;

  if coalesce(v_orden.mano_obra, 0) > 0 then
    insert into public.factura_conceptos (factura_id, descripcion, cantidad, precio_unitario, importe)
    values (v_factura.id, 'Mano de obra', 1, v_orden.mano_obra, v_orden.mano_obra);
  end if;

  return v_factura;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución. Supabase otorga EXECUTE a anon/authenticated por
-- defecto: se quita todo y se otorga solo lo necesario.
-- ---------------------------------------------------------------------
revoke execute on function public.mi_rol()                                       from public, anon;
revoke execute on function public.crear_perfil()                                 from public, anon, authenticated;
revoke execute on function public._validar_bloque(timestamptz)                   from public, anon, authenticated;
revoke execute on function public._capacidad_disponible(timestamptz, bigint)     from public, anon, authenticated;
revoke execute on function public.bloques_ocupados(date)                         from public, anon;
revoke execute on function public.agendar_cita(bigint, timestamptz, text)        from public, anon;
revoke execute on function public.confirmar_cita(bigint)                         from public, anon;
revoke execute on function public.reprogramar_cita(bigint, timestamptz)          from public, anon;
revoke execute on function public.cancelar_cita(bigint)                          from public, anon;
revoke execute on function public.cancelar_citas_vencidas()                      from public, anon;
revoke execute on function public._validar_mecanico(uuid)                        from public, anon, authenticated;
revoke execute on function public.crear_orden(bigint, bigint, int, text, uuid)   from public, anon;
revoke execute on function public.asignar_orden(bigint, uuid)                    from public, anon;
revoke execute on function public.nombre_mecanico(bigint)                        from public, anon;
revoke execute on function public.avanzar_estatus_orden(bigint, estatus_orden)   from public, anon;
revoke execute on function public.cambiar_rol(uuid, rol_usuario)                 from public, anon;
revoke execute on function public.cambiar_activo(uuid, boolean)                  from public, anon;
revoke execute on function public._validar_edicion_orden(bigint)                 from public, anon, authenticated;
revoke execute on function public.crear_pieza(text, text, text, numeric, int, int) from public, anon;
revoke execute on function public.registrar_entrada(bigint, int, text)           from public, anon;
revoke execute on function public.ajustar_existencias(bigint, int, text)         from public, anon;
revoke execute on function public.usar_pieza_en_orden(bigint, bigint, int)       from public, anon;
revoke execute on function public.quitar_pieza_de_orden(bigint)                  from public, anon;
revoke execute on function public.piezas_usadas(bigint)                          from public, anon;
revoke execute on function public.solicitar_factura(bigint, text, text, text, text, text, text) from public, anon;

grant execute on function public.mi_rol()                                       to authenticated;
grant execute on function public.bloques_ocupados(date)                         to authenticated;
grant execute on function public.agendar_cita(bigint, timestamptz, text)        to authenticated;
grant execute on function public.confirmar_cita(bigint)                         to authenticated;
grant execute on function public.reprogramar_cita(bigint, timestamptz)          to authenticated;
grant execute on function public.cancelar_cita(bigint)                          to authenticated;
grant execute on function public.cancelar_citas_vencidas()                      to authenticated;
grant execute on function public.crear_orden(bigint, bigint, int, text, uuid)   to authenticated;
grant execute on function public.asignar_orden(bigint, uuid)                    to authenticated;
grant execute on function public.nombre_mecanico(bigint)                        to authenticated;
grant execute on function public.avanzar_estatus_orden(bigint, estatus_orden)   to authenticated;
grant execute on function public.cambiar_rol(uuid, rol_usuario)                 to authenticated;
grant execute on function public.cambiar_activo(uuid, boolean)                  to authenticated;
grant execute on function public.crear_pieza(text, text, text, numeric, int, int) to authenticated;
grant execute on function public.registrar_entrada(bigint, int, text)           to authenticated;
grant execute on function public.ajustar_existencias(bigint, int, text)         to authenticated;
grant execute on function public.usar_pieza_en_orden(bigint, bigint, int)       to authenticated;
grant execute on function public.quitar_pieza_de_orden(bigint)                  to authenticated;
grant execute on function public.piezas_usadas(bigint)                          to authenticated;
grant execute on function public.solicitar_factura(bigint, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- pg_cron: cancela cada minuto las citas pendientes vencidas.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cancelar-citas-vencidas') then
    perform cron.unschedule('cancelar-citas-vencidas');
  end if;
end $$;

select cron.schedule('cancelar-citas-vencidas', '* * * * *', 'select public.cancelar_citas_vencidas()');
