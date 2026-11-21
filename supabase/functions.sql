-- =====================================================================
-- TallerApp · functions.sql  (paso 2 de 3)
-- Contiene: mi_rol(), trigger crear_perfil, helpers internos (_validar_bloque,
-- _capacidad_disponible), las funciones rpc de negocio (SECURITY DEFINER),
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
    nullif(trim(new.raw_user_meta_data->>'telefono'), ''),
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
-- crear_orden (F06): empleado/admin. Todo en una transacción: orden,
-- cita -> atendida, km del vehículo, primera fila de bitácora.
-- ---------------------------------------------------------------------
create or replace function public.crear_orden(
  p_vehiculo_id bigint,
  p_cita_id bigint,
  p_kilometraje int,
  p_diagnostico text
)
returns ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_veh     vehiculos;
  v_cita    citas;
  v_abierta bigint;
  v_orden   ordenes;
begin
  if public.mi_rol() is null or public.mi_rol() not in ('empleado','admin') then
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

  insert into public.ordenes (vehiculo_id, cita_id, creada_por, kilometraje, diagnostico, estatus)
  values (p_vehiculo_id, p_cita_id, auth.uid(), p_kilometraje, nullif(trim(coalesce(p_diagnostico, '')), ''), 'recibido')
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

  if v_siguiente = 'en_reparacion' and nullif(trim(coalesce(v_orden.diagnostico, '')), '') is null then
    raise exception 'Escribe el diagnóstico antes de pasar a reparación.' using errcode = 'P0001';
  end if;
  if v_siguiente = 'listo' and nullif(trim(coalesce(v_orden.trabajo_realizado, '')), '') is null then
    raise exception 'Describe el trabajo realizado antes de marcar como listo.' using errcode = 'P0001';
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
revoke execute on function public.crear_orden(bigint, bigint, int, text)         from public, anon;
revoke execute on function public.avanzar_estatus_orden(bigint, estatus_orden)   from public, anon;
revoke execute on function public.cambiar_rol(uuid, rol_usuario)                 from public, anon;
revoke execute on function public.cambiar_activo(uuid, boolean)                  from public, anon;

grant execute on function public.mi_rol()                                       to authenticated;
grant execute on function public.bloques_ocupados(date)                         to authenticated;
grant execute on function public.agendar_cita(bigint, timestamptz, text)        to authenticated;
grant execute on function public.confirmar_cita(bigint)                         to authenticated;
grant execute on function public.reprogramar_cita(bigint, timestamptz)          to authenticated;
grant execute on function public.cancelar_cita(bigint)                          to authenticated;
grant execute on function public.cancelar_citas_vencidas()                      to authenticated;
grant execute on function public.crear_orden(bigint, bigint, int, text)         to authenticated;
grant execute on function public.avanzar_estatus_orden(bigint, estatus_orden)   to authenticated;
grant execute on function public.cambiar_rol(uuid, rol_usuario)                 to authenticated;
grant execute on function public.cambiar_activo(uuid, boolean)                  to authenticated;

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
