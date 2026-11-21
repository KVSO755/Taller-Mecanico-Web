-- =====================================================================
-- TallerApp · tests.sql  (pruebas de seguridad y reglas de negocio)
--
-- Requisitos: schema.sql, functions.sql, policies.sql y seed.sql ya corrieron.
-- Se ejecuta completo, como postgres, en el SQL Editor de Supabase.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: NO deja datos.
-- Re-ejecutable. Si una prueba falla, el script se detiene con
--   ERROR: FALLÓ: <detalle>
-- Si todo pasa verás los avisos "OK: ..." y "TODAS LAS PRUEBAS PASARON"
-- (pestaña Messages / Notices).
--
-- Cómo actúa como un usuario: set local role authenticated + claims JWT
-- (request.jwt.claims) con el 'sub' del perfil; auth.uid() los lee.
-- Dependencia del día: si hoy es domingo (America/Tijuana) la prueba de
-- "agendar para hoy" y la de "crear orden desde la cita de hoy" ajustan su
-- resultado esperado (ver comentarios).
-- =====================================================================

begin;

-- ---------- Helpers de prueba (viven solo en esta sesión) ----------
create or replace function pg_temp.como(p_correo text) returns void
language plpgsql as $f$
declare v_id uuid;
begin
  reset role;
  select id into v_id from public.perfiles where correo = p_correo;
  if v_id is null then
    raise exception 'FALLÓ: no existe el perfil % (¿corriste seed.sql?)', p_correo;
  end if;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  set local role authenticated;
end $f$;

create or replace function pg_temp.como_anon() returns void
language plpgsql as $f$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end $f$;

-- Ejecuta p_sql; debe fallar y el mensaje debe contener p_frag (sin distinguir mayúsculas).
create or replace function pg_temp.esperar_error(p_sql text, p_frag text) returns void
language plpgsql as $f$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_frag) in lower(sqlerrm)) = 0 then
      raise exception 'FALLÓ: [%] lanzó otro error. Esperado que contenga "%"; real: %', p_sql, p_frag, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FALLÓ: [%] no lanzó error (se esperaba "%")', p_sql, p_frag;
end $f$;

create or replace function pg_temp.afirmar(p_cond boolean, p_msg text) returns void
language plpgsql as $f$
begin
  if p_cond is not true then
    raise exception 'FALLÓ: %', p_msg;
  end if;
end $f$;

create or replace function pg_temp.ok(p_nombre text) returns void
language plpgsql as $f$
begin
  raise notice 'OK: %', p_nombre;
end $f$;

create or replace function pg_temp.dia_habil(d date, dir int) returns date
language sql immutable as $f$
  select case when extract(isodow from d) = 7 then d + dir else d end;
$f$;

create or replace function pg_temp.tj(d date, h int) returns timestamptz
language sql immutable as $f$
  select (d + make_time(h, 0, 0)) at time zone 'America/Tijuana';
$f$;

-- ---------- Precondición: el seed corrió ----------
reset role;
do $t$
begin
  perform pg_temp.afirmar(
    (select count(*) from public.vehiculos where placa in ('ABC123','XYZ9876','BCD456')) = 3,
    'Faltan los vehículos demo: ejecuta seed.sql antes de tests.sql.');
  perform pg_temp.ok('0. seed presente');
end $t$;

-- =====================================================================
-- 1 y 2. Cliente: columnas protegidas de perfiles y vehiculos (+ placa)
-- =====================================================================
reset role;
do $t$
declare
  v_c2 uuid;
  v_n  int;
begin
  select id into v_c2 from public.perfiles where correo = 'cliente2@example.com';

  perform pg_temp.como('cliente1@example.com');

  -- 1. No puede subirse el rol ni tocar activo/correo
  perform pg_temp.esperar_error($q$update perfiles set rol = 'admin' where id = auth.uid()$q$, 'permission denied');
  perform pg_temp.esperar_error($q$update perfiles set activo = true where id = auth.uid()$q$, 'permission denied');
  perform pg_temp.esperar_error($q$update perfiles set correo = 'x@x.com' where id = auth.uid()$q$, 'permission denied');
  -- Sí puede editar su teléfono, pero no el de otra persona (0 filas)
  update perfiles set telefono = telefono where id = auth.uid();
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el cliente debe poder actualizar su propio perfil (nombre/telefono)');
  execute format('update perfiles set telefono = ''0000000000'' where id = %L', v_c2);
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'el cliente no debe poder editar el perfil de otra persona');
  perform pg_temp.ok('1. cliente no puede cambiar rol/activo/correo en perfiles');

  -- 2. Vehículos: kilometraje y cliente_id no son editables
  perform pg_temp.esperar_error($q$update vehiculos set kilometraje = 0$q$, 'permission denied');
  perform pg_temp.esperar_error(format('update vehiculos set cliente_id = %L', v_c2), 'permission denied');
  perform pg_temp.esperar_error($q$update vehiculos set placa = 'ZZZ999'$q$, 'permission denied');
  -- Sí puede editar marca/modelo/año de lo suyo
  update vehiculos set marca = marca where placa = 'ABC123';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el cliente debe poder editar marca/modelo/anio de su vehículo');
  -- Formato de placa en la BD
  perform pg_temp.esperar_error(
    $q$insert into vehiculos (placa, marca, modelo, anio, kilometraje) values ('ab-123', 'X', 'Y', 2020, 0)$q$,
    'vehiculos_placa_formato');
  perform pg_temp.esperar_error(
    $q$insert into vehiculos (placa, marca, modelo, anio, kilometraje) values ('ABC', 'X', 'Y', 2020, 0)$q$,
    'vehiculos_placa_formato');
  -- No puede registrar un vehículo a nombre de otro
  perform pg_temp.esperar_error(
    format('insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje) values (%L, ''QWE123'', ''X'', ''Y'', 2020, 0)', v_c2),
    'permission denied');
  perform pg_temp.ok('2. cliente no puede editar kilometraje/cliente_id/placa; placa valida formato');
end $t$;

-- =====================================================================
-- 3. Aislamiento entre clientes
-- =====================================================================
reset role;
do $t$
declare
  v_c1 uuid; v_c2 uuid;
  v_ord_c1 int; v_cit_c1 int; v_veh_c1 int; v_cam_c1 int;
  v_n int;
begin
  select id into v_c1 from public.perfiles where correo = 'cliente1@example.com';
  select id into v_c2 from public.perfiles where correo = 'cliente2@example.com';
  select count(*) into v_veh_c1 from public.vehiculos where cliente_id = v_c1;
  select count(*) into v_cit_c1 from public.citas where cliente_id = v_c1;
  select count(*) into v_ord_c1 from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c1;
  select count(*) into v_cam_c1 from public.cambios_estatus c join public.ordenes o on o.id = c.orden_id
    join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c1;
  perform pg_temp.afirmar(v_ord_c1 >= 3 and v_cam_c1 >= 9, 'el seed debería dejar >=3 órdenes y >=9 cambios para cliente1');

  -- cliente1
  perform pg_temp.como('cliente1@example.com');
  select count(*) into v_n from vehiculos where cliente_id <> auth.uid();
  perform pg_temp.afirmar(v_n = 0, 'cliente1 ve vehículos ajenos');
  select count(*) into v_n from vehiculos;
  perform pg_temp.afirmar(v_n = v_veh_c1, 'cliente1 debe ver exactamente sus vehículos');
  select count(*) into v_n from citas where cliente_id <> auth.uid();
  perform pg_temp.afirmar(v_n = 0, 'cliente1 ve citas ajenas');
  select count(*) into v_n from citas;
  perform pg_temp.afirmar(v_n = v_cit_c1, 'cliente1 debe ver exactamente sus citas');
  select count(*) into v_n from ordenes;
  perform pg_temp.afirmar(v_n = v_ord_c1, 'cliente1 debe ver exactamente sus órdenes');
  select count(*) into v_n from cambios_estatus;
  perform pg_temp.afirmar(v_n = v_cam_c1, 'cliente1 debe ver exactamente la bitácora de sus órdenes');
  select count(*) into v_n from perfiles;
  perform pg_temp.afirmar(v_n = 1, 'cliente1 solo debe ver su propio perfil');

  -- cliente2 (no tiene órdenes en el seed: no debe ver las de cliente1)
  perform pg_temp.como('cliente2@example.com');
  select count(*) into v_n from vehiculos where cliente_id = v_c1;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve vehículos de cliente1');
  select count(*) into v_n from citas where cliente_id = v_c1;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve citas de cliente1');
  select count(*) into v_n from ordenes;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve órdenes (no tiene ninguna; las de cliente1 no deben verse)');
  select count(*) into v_n from cambios_estatus;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve bitácora ajena');
  perform pg_temp.ok('3. cliente no ve datos de otro cliente');

  -- Empleado sí ve todo
  perform pg_temp.como('empleado@example.com');
  select count(*) into v_n from vehiculos where cliente_id in (v_c1, v_c2);
  perform pg_temp.afirmar(v_n >= 3, 'empleado debe ver los vehículos de los clientes');
  select count(*) into v_n from perfiles;
  perform pg_temp.afirmar(v_n >= 4, 'empleado debe ver todos los perfiles');
  perform pg_temp.ok('3b. empleado ve todo');
end $t$;

-- =====================================================================
-- 4. Cliente: citas / ordenes solo por rpc
-- =====================================================================
reset role;
do $t$
declare
  v_abc bigint;
  v_cita bigint;
  v_n int;
begin
  select id into v_abc from public.vehiculos where placa = 'ABC123';
  select id into v_cita from public.citas where vehiculo_id = v_abc and estatus = 'pendiente' limit 1;

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(
    format('insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo) values (auth.uid(), %s, now() + interval ''3 days'', ''Insert directo'')', v_abc),
    'permission denied');
  perform pg_temp.esperar_error(format('update citas set estatus = ''confirmada'' where id = %s', v_cita), 'permission denied');
  perform pg_temp.esperar_error(format('update citas set fecha_hora = now() where id = %s', v_cita), 'permission denied');
  perform pg_temp.esperar_error('delete from citas', 'permission denied');
  -- diagnostico tiene GRANT de columna (lo usa el empleado), así que aquí no hay
  -- "permission denied": la RLS de ordenes (solo empleado/admin) deja 0 filas.
  update ordenes set diagnostico = 'x';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'cliente no debe poder editar diagnostico (RLS): afectó ' || v_n || ' filas');
  perform pg_temp.esperar_error($q$update ordenes set estatus = 'entregado'$q$, 'permission denied');
  perform pg_temp.esperar_error($q$delete from ordenes$q$, 'permission denied');
  perform pg_temp.esperar_error(
    $q$insert into cambios_estatus (orden_id, estatus_nuevo, cambiado_por) values (1, 'recibido', auth.uid())$q$,
    'permission denied');
  perform pg_temp.ok('4. cliente no puede insertar/modificar citas, ordenes ni bitácora directo');
end $t$;

-- =====================================================================
-- 5. Empleado: ordenes solo diagnostico/trabajo_realizado y solo abiertas
-- =====================================================================
reset role;
do $t$
declare
  v_abierta bigint;
  v_cerrada bigint;
  v_n int;
begin
  select o.id into v_abierta from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'XYZ9876' and o.estatus = 'en_diagnostico';
  select o.id into v_cerrada from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'ABC123' and o.estatus = 'entregado' order by o.creado_en desc limit 1;
  perform pg_temp.afirmar(v_abierta is not null and v_cerrada is not null, 'el seed debe dejar una orden abierta y una entregada');

  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('update ordenes set estatus = ''entregado'' where id = %s', v_abierta), 'permission denied');
  perform pg_temp.esperar_error(format('update ordenes set kilometraje = 1 where id = %s', v_abierta), 'permission denied');
  perform pg_temp.esperar_error(format('update ordenes set vehiculo_id = 1 where id = %s', v_abierta), 'permission denied');
  perform pg_temp.esperar_error('delete from ordenes', 'permission denied');

  update ordenes set diagnostico = 'x' where id = v_abierta;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'empleado debe poder editar diagnostico de una orden abierta');

  update ordenes set diagnostico = 'x' where id = v_cerrada;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'orden entregada no debe poder editarse (RLS): afectó ' || v_n || ' filas');

  -- El empleado no edita vehículos ni perfiles ajenos (RLS => 0 filas)
  update vehiculos set marca = 'Hack' where placa = 'ABC123';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'empleado no debe editar vehículos de clientes');
  update perfiles set nombre = 'Hack' where correo = 'cliente1@example.com';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'empleado no debe editar perfiles de otros');
  perform pg_temp.ok('5. empleado: columnas de ordenes y RLS de ordenes entregadas');
end $t$;

-- =====================================================================
-- 6. Capacidad de 3 citas por bloque
--    (como postgres se llenan 3 citas activas en un bloque futuro válido)
-- =====================================================================
reset role;
do $t$
declare
  v_hoy date := (now() at time zone 'America/Tijuana')::date;
  v_dia date := pg_temp.dia_habil(v_hoy + 7, 1);
  v_blq timestamptz := pg_temp.tj(pg_temp.dia_habil(v_hoy + 7, 1), 11);
  v_c2  uuid;
  v_xyz bigint;
  v_vid bigint;
  v_n   int;
  i     int;
begin
  select id into v_c2 from public.perfiles where correo = 'cliente2@example.com';
  select id into v_xyz from public.vehiculos where placa = 'XYZ9876';

  for i in 1..3 loop
    insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
    values (v_c2, 'TST000' || i, 'Test', 'Capacidad', 2020, 1000)
    returning id into v_vid;
    insert into public.citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
    values (v_c2, v_vid, v_blq, 'Relleno de capacidad', 'pendiente');
  end loop;

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_xyz, v_blq, 'Prueba de capacidad'),
    'Ese horario se acaba de ocupar');

  select ocupadas into v_n from public.bloques_ocupados(v_dia) where hora = v_blq;
  perform pg_temp.afirmar(v_n = 3, 'bloques_ocupados debe reportar 3 en el bloque lleno (reportó ' || coalesce(v_n::text, 'null') || ')');
  perform pg_temp.ok('6. bloque con 3 citas activas rechaza la 4.ª');
end $t$;

-- =====================================================================
-- 7. agendar_cita: reglas de horario, propiedad y cita activa única
-- =====================================================================
reset role;
do $t$
declare
  v_hoy  date := (now() at time zone 'America/Tijuana')::date;
  v_dom  date;
  v_abc  bigint;
  v_xyz  bigint;
  v_bcd  bigint;
  v_cita citas;
begin
  v_dom := v_hoy + case when extract(isodow from v_hoy) = 7 then 7 else 7 - extract(isodow from v_hoy)::int end;
  select id into v_abc from public.vehiculos where placa = 'ABC123';
  select id into v_xyz from public.vehiculos where placa = 'XYZ9876';
  select id into v_bcd from public.vehiculos where placa = 'BCD456';

  perform pg_temp.como('cliente1@example.com');

  -- Domingo (próximo domingo dentro de los 30 días)
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_xyz, pg_temp.tj(v_dom, 10), 'Prueba domingo'),
    'El taller no abre ese día.');

  -- Hoy: si hoy es domingo, la validación de domingo se dispara primero.
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_xyz, pg_temp.tj(v_hoy, 10), 'Prueba hoy'),
    case when extract(isodow from v_hoy) = 7 then 'El taller no abre ese día.' else 'a partir de mañana' end);

  -- Vehículo ajeno
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_bcd, pg_temp.tj(pg_temp.dia_habil(v_hoy + 9, 1), 9), 'Vehículo ajeno'),
    'Vehículo no encontrado.');

  -- Motivo demasiado corto
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_xyz, pg_temp.tj(pg_temp.dia_habil(v_hoy + 9, 1), 9), 'abc'),
    'entre 5 y 200');

  -- Segunda cita activa del mismo vehículo (ABC123 ya tiene la pendiente del seed)
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_abc, pg_temp.tj(pg_temp.dia_habil(v_hoy + 9, 1), 9), 'Segunda cita'),
    'ya tiene una cita');

  -- Camino feliz (XYZ9876 no tiene cita activa)
  v_cita := public.agendar_cita(v_xyz, pg_temp.tj(pg_temp.dia_habil(v_hoy + 10, 1), 9), 'Prueba agendar OK');
  perform pg_temp.afirmar(v_cita.estatus = 'pendiente' and v_cita.cliente_id = auth.uid(), 'agendar_cita feliz debe dejar cita pendiente del cliente');

  -- Empleado no puede agendar (solo cliente)
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_xyz, pg_temp.tj(pg_temp.dia_habil(v_hoy + 11, 1), 9), 'Empleado agenda'),
    'No tienes permiso');
  perform pg_temp.ok('7. agendar_cita: domingo, hoy, vehículo ajeno, motivo, cita activa única, rol');
end $t$;

-- =====================================================================
-- 8. cancelar_cita
-- =====================================================================
reset role;
do $t$
declare
  v_c1   uuid;
  v_xyz  bigint;
  v_prox bigint;
  v_nueva bigint;
  v_por  text;
begin
  select id into v_c1 from public.perfiles where correo = 'cliente1@example.com';
  select id into v_xyz from public.vehiculos where placa = 'XYZ9876';
  select id into v_nueva from public.citas where vehiculo_id = v_xyz and motivo = 'Prueba agendar OK';

  -- Cita confirmada que empieza en 30 minutos (insertada como postgres)
  insert into public.citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c1, v_xyz, now() + interval '30 minutes', 'Cita inminente', 'confirmada')
  returning id into v_prox;

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format('select public.cancelar_cita(%s)', v_prox), 'Llama al taller');

  perform pg_temp.como('cliente2@example.com');
  perform pg_temp.esperar_error(format('select public.cancelar_cita(%s)', v_prox), 'Cita no encontrada');

  -- Empleado sí puede, y queda cancelada_por = 'taller'
  perform pg_temp.como('empleado@example.com');
  perform public.cancelar_cita(v_prox);
  select cancelada_por into v_por from public.citas where id = v_prox;
  perform pg_temp.afirmar(v_por = 'taller', 'cancelación por empleado debe marcar cancelada_por = taller');
  perform pg_temp.esperar_error(format('select public.cancelar_cita(%s)', v_prox), 'ya fue modificada');

  -- Cliente cancela con más de 1 h de anticipación -> 'cliente'
  perform pg_temp.como('cliente1@example.com');
  perform public.cancelar_cita(v_nueva);
  select cancelada_por into v_por from public.citas where id = v_nueva;
  perform pg_temp.afirmar(v_por = 'cliente', 'cancelación por cliente debe marcar cancelada_por = cliente');
  perform pg_temp.ok('8. cancelar_cita: <1 h rechazado, ajena rechazada, taller/cliente marcan cancelada_por');
end $t$;

-- =====================================================================
-- 9. cancelar_citas_vencidas
-- =====================================================================
reset role;
do $t$
declare
  v_c2  uuid;
  v_bcd bigint;
  v_vieja bigint;
  v_reciente bigint;
  v_est estatus_cita;
  v_por text;
  v_n   int;
begin
  select id into v_c2 from public.perfiles where correo = 'cliente2@example.com';
  select id into v_bcd from public.vehiculos where placa = 'BCD456';

  insert into public.citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c2, v_bcd, now() - interval '20 minutes', 'Pendiente vencida', 'pendiente')
  returning id into v_vieja;
  insert into public.citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c2, v_bcd, now() - interval '5 minutes', 'Pendiente aún en ventana', 'pendiente')
  returning id into v_reciente;

  -- Como cualquier usuario activo (el cron la llama sin sesión; aquí con sesión)
  perform pg_temp.como('cliente2@example.com');
  v_n := public.cancelar_citas_vencidas();
  perform pg_temp.afirmar(v_n >= 1, 'cancelar_citas_vencidas debía cancelar al menos 1');

  reset role;
  select estatus, cancelada_por into v_est, v_por from public.citas where id = v_vieja;
  perform pg_temp.afirmar(v_est = 'cancelada' and v_por = 'sistema', 'la pendiente con 20 min de retraso debe quedar cancelada por sistema');
  select estatus into v_est from public.citas where id = v_reciente;
  perform pg_temp.afirmar(v_est = 'pendiente', 'la pendiente con 5 min de retraso aún no debe cancelarse');

  -- Idempotente y también sin sesión (como lo llama pg_cron)
  perform public.cancelar_citas_vencidas();
  select estatus into v_est from public.citas where id = v_vieja;
  perform pg_temp.afirmar(v_est = 'cancelada', 'segunda ejecución no debe alterar la cita ya cancelada');
  perform pg_temp.ok('9. cancelar_citas_vencidas: cancela con 15+ min, marca sistema, idempotente');
end $t$;

-- =====================================================================
-- 10. crear_orden
-- =====================================================================
reset role;
do $t$
declare
  v_hoy      date := (now() at time zone 'America/Tijuana')::date;
  v_abc      bigint;
  v_xyz      bigint;
  v_bcd      bigint;
  v_emp      uuid;
  v_cita_bcd bigint;
  v_cita_abc bigint;
  v_orden    ordenes;
  v_est      estatus_cita;
  v_km       int;
  v_n        int;
begin
  select id into v_abc from public.vehiculos where placa = 'ABC123';
  select id into v_xyz from public.vehiculos where placa = 'XYZ9876';
  select id into v_bcd from public.vehiculos where placa = 'BCD456';
  select id into v_emp from public.perfiles where correo = 'empleado@example.com';
  select id into v_cita_bcd from public.citas where vehiculo_id = v_bcd and estatus = 'confirmada' limit 1;
  select id into v_cita_abc from public.citas where vehiculo_id = v_abc and estatus = 'pendiente' limit 1;

  -- Cliente no puede
  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, null, 99999, %L)', v_abc, 'x'), 'No tienes permiso');

  perform pg_temp.como('empleado@example.com');
  -- Kilometraje menor al último registrado (ABC123 quedó en 46800)
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, null, 100, %L)', v_abc, 'x'), 'no puede ser menor');
  -- Orden abierta duplicada (XYZ9876 tiene una en en_diagnostico)
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, null, 90000, %L)', v_xyz, 'x'), 'ya tiene la orden #');
  -- Cita de otro vehículo
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, %s, 99999, %L)', v_abc, v_cita_bcd, 'x'), 'no corresponde a este vehículo');
  -- Cita pendiente (no confirmada)
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, %s, 99999, %L)', v_abc, v_cita_abc, 'x'), 'confirmada de hoy');

  if extract(isodow from v_hoy) <> 7 then
    -- Camino feliz desde la cita confirmada de hoy
    v_orden := public.crear_orden(v_bcd, v_cita_bcd, 31000, 'Diagnóstico de prueba');
    perform pg_temp.afirmar(v_orden.estatus = 'recibido' and v_orden.creada_por = v_emp and v_orden.cita_id = v_cita_bcd,
                            'crear_orden feliz: estatus recibido, creada_por empleado, cita ligada');
    reset role;
    select estatus into v_est from public.citas where id = v_cita_bcd;
    perform pg_temp.afirmar(v_est = 'atendida', 'la cita debe quedar atendida');
    select kilometraje into v_km from public.vehiculos where id = v_bcd;
    perform pg_temp.afirmar(v_km = 31000, 'el kilometraje del vehículo debe actualizarse a 31000');
    select count(*) into v_n from public.cambios_estatus
      where orden_id = v_orden.id and estatus_anterior is null and estatus_nuevo = 'recibido';
    perform pg_temp.afirmar(v_n = 1, 'debe existir la primera fila de bitácora (null -> recibido)');

    perform pg_temp.como('empleado@example.com');
    perform pg_temp.esperar_error(format('select public.crear_orden(%s, %s, 32000, %L)', v_bcd, v_cita_bcd, 'x'), 'ya tiene una orden');
    perform pg_temp.esperar_error(format('select public.crear_orden(%s, null, 32000, %L)', v_bcd, 'x'), 'ya tiene la orden #');
  else
    -- Hoy es domingo: el seed deja la cita confirmada para mañana; no es "de hoy".
    perform pg_temp.esperar_error(format('select public.crear_orden(%s, %s, 31000, %L)', v_bcd, v_cita_bcd, 'x'), 'confirmada de hoy');
    raise notice 'AVISO: hoy es domingo; se omitió el camino feliz de crear_orden desde la cita de hoy.';
  end if;
  perform pg_temp.ok('10. crear_orden: rol, km menor, orden abierta duplicada, cita ajena/no confirmada, flujo feliz');
end $t$;

-- =====================================================================
-- 11. avanzar_estatus_orden
-- =====================================================================
reset role;
do $t$
declare
  v_o3  bigint;
  v_est estatus_orden;
  v_ent timestamptz;
  v_n   int;
begin
  select o.id into v_o3 from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'XYZ9876' and o.estatus = 'en_diagnostico';
  -- Estado limpio (G5 le puso diagnostico = 'x')
  update public.ordenes set diagnostico = null, trabajo_realizado = null where id = v_o3;

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''en_diagnostico'')', v_o3), 'No tienes permiso');

  perform pg_temp.como('empleado@example.com');
  -- A reparación sin diagnóstico
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''en_diagnostico'')', v_o3), 'diagnóstico');
  -- Estatus esperado desactualizado
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''recibido'')', v_o3), 'ya fue actualizada');

  -- Flujo completo
  update ordenes set diagnostico = 'Bomba de agua con fuga' where id = v_o3;
  perform public.avanzar_estatus_orden(v_o3, 'en_diagnostico');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''en_reparacion'')', v_o3), 'trabajo realizado');
  update ordenes set trabajo_realizado = 'Cambio de bomba de agua' where id = v_o3;
  perform public.avanzar_estatus_orden(v_o3, 'en_reparacion');
  perform public.avanzar_estatus_orden(v_o3, 'listo');

  select estatus, entregado_en into v_est, v_ent from ordenes where id = v_o3;
  perform pg_temp.afirmar(v_est = 'entregado' and v_ent is not null, 'la orden debe quedar entregada con entregado_en');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''entregado'')', v_o3), 'Orden cerrada');

  -- Orden entregada ya no se edita
  update ordenes set diagnostico = 'otro' where id = v_o3;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'orden recién entregada no debe poder editarse');

  -- Bitácora: 2 filas del seed + 3 avances
  select count(*) into v_n from cambios_estatus where orden_id = v_o3;
  perform pg_temp.afirmar(v_n = 5, 'la bitácora debe tener 5 filas (tiene ' || v_n || ')');

  -- El dueño ve su bitácora completa
  perform pg_temp.como('cliente1@example.com');
  select count(*) into v_n from cambios_estatus where orden_id = v_o3;
  perform pg_temp.afirmar(v_n = 5, 'el cliente dueño debe ver las 5 filas de bitácora');
  perform pg_temp.ok('11. avanzar_estatus_orden: diagnóstico/trabajo requeridos, esperado viejo, flujo, cerrada, bitácora');
end $t$;

-- =====================================================================
-- 12. cambiar_rol / cambiar_activo
-- =====================================================================
reset role;
do $t$
declare
  v_admin uuid; v_c2 uuid;
  v_rol rol_usuario;
begin
  select id into v_admin from public.perfiles where correo = 'admin@example.com';
  select id into v_c2    from public.perfiles where correo = 'cliente2@example.com';

  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.cambiar_rol(%L, ''admin'')', v_c2), 'Solo el administrador');
  perform pg_temp.esperar_error(format('select public.cambiar_activo(%L, false)', v_c2), 'Solo el administrador');

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format('select public.cambiar_rol(%L, ''admin'')', v_c2), 'Solo el administrador');

  perform pg_temp.como('admin@example.com');
  perform pg_temp.esperar_error(format('select public.cambiar_rol(%L, ''cliente'')', v_admin), 'No puedes modificar tu propia cuenta');
  perform pg_temp.esperar_error(format('select public.cambiar_activo(%L, false)', v_admin), 'No puedes modificar tu propia cuenta');

  -- Camino feliz: promover y revertir
  perform public.cambiar_rol(v_c2, 'empleado');
  select rol into v_rol from perfiles where id = v_c2;
  perform pg_temp.afirmar(v_rol = 'empleado', 'admin debe poder promover a empleado');
  perform pg_temp.esperar_error(format('select public.cambiar_rol(%L, ''empleado'')', v_c2), 'ya es empleado');
  perform public.cambiar_rol(v_c2, 'cliente');
  select rol into v_rol from perfiles where id = v_c2;
  perform pg_temp.afirmar(v_rol = 'cliente', 'admin debe poder revertir a cliente');
  perform pg_temp.ok('12. cambiar_rol/cambiar_activo: solo admin y nunca sobre sí mismo');
end $t$;

-- =====================================================================
-- 13. Usuario desactivado queda bloqueado de inmediato
-- =====================================================================
reset role;
do $t$
declare
  v_bcd bigint;
  v_n int;
  v_rol rol_usuario;
begin
  select id into v_bcd from public.vehiculos where placa = 'BCD456';
  update public.perfiles set activo = false where correo = 'cliente2@example.com';

  perform pg_temp.como('cliente2@example.com');
  select public.mi_rol() into v_rol;
  perform pg_temp.afirmar(v_rol is null, 'mi_rol() debe ser null para un usuario desactivado');
  select count(*) into v_n from vehiculos;
  perform pg_temp.afirmar(v_n = 0, 'desactivado no debe ver vehículos');
  select count(*) into v_n from citas;
  perform pg_temp.afirmar(v_n = 0, 'desactivado no debe ver citas');
  select count(*) into v_n from perfiles;
  perform pg_temp.afirmar(v_n = 0, 'desactivado no debe ver ni su propio perfil');
  perform pg_temp.esperar_error(
    format('select public.agendar_cita(%s, %L::timestamptz, %L)', v_bcd,
           pg_temp.tj(pg_temp.dia_habil((now() at time zone 'America/Tijuana')::date + 12, 1), 9), 'Intento desactivado'),
    'No tienes permiso');
  perform pg_temp.esperar_error('select public.cancelar_citas_vencidas()', 'No tienes permiso');
  perform pg_temp.esperar_error('select * from public.bloques_ocupados(current_date)', 'No tienes permiso');
  perform pg_temp.ok('13. usuario desactivado bloqueado en datos y rpc');
end $t$;

-- =====================================================================
-- 14. anon: sin acceso a tablas ni rpc
-- =====================================================================
reset role;
do $t$
begin
  perform pg_temp.como_anon();
  perform pg_temp.esperar_error('select count(*) from perfiles', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from vehiculos', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from citas', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from ordenes', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from cambios_estatus', 'permission denied');
  perform pg_temp.esperar_error($q$select public.agendar_cita(1, now() + interval '2 days', 'Intento anónimo')$q$, 'permission denied');
  perform pg_temp.esperar_error('select public.cancelar_citas_vencidas()', 'permission denied');
  perform pg_temp.esperar_error('select public.mi_rol()', 'permission denied');
  perform pg_temp.ok('14. anon sin acceso a tablas ni funciones');
end $t$;

reset role;
do $t$ begin raise notice 'TODAS LAS PRUEBAS PASARON'; end $t$;

rollback;
