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
  v_ord_c1 int; v_cit_c1 int; v_veh_c1 int; v_cam_c1 int; v_ord_c2 int; v_cam_c2 int;
  v_n int;
begin
  select id into v_c1 from public.perfiles where correo = 'cliente1@example.com';
  select id into v_c2 from public.perfiles where correo = 'cliente2@example.com';
  select count(*) into v_veh_c1 from public.vehiculos where cliente_id = v_c1;
  select count(*) into v_cit_c1 from public.citas where cliente_id = v_c1;
  select count(*) into v_ord_c1 from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c1;
  select count(*) into v_cam_c1 from public.cambios_estatus c join public.ordenes o on o.id = c.orden_id
    join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c1;
  select count(*) into v_ord_c2 from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c2;
  select count(*) into v_cam_c2 from public.cambios_estatus c join public.ordenes o on o.id = c.orden_id
    join public.vehiculos v on v.id = o.vehiculo_id where v.cliente_id = v_c2;
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

  -- cliente2 (solo tiene la orden abierta de JKL789 en el seed: no debe ver las de cliente1)
  perform pg_temp.como('cliente2@example.com');
  select count(*) into v_n from vehiculos where cliente_id = v_c1;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve vehículos de cliente1');
  select count(*) into v_n from citas where cliente_id = v_c1;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve citas de cliente1');
  select count(*) into v_n from ordenes;
  perform pg_temp.afirmar(v_n = v_ord_c2, 'cliente2 debe ver exactamente sus órdenes (' || v_ord_c2 || '), no las de cliente1; ve ' || v_n);
  select count(*) into v_n from ordenes where vehiculo_id in (select id from vehiculos where cliente_id = v_c1);
  perform pg_temp.afirmar(v_n = 0, 'cliente2 ve órdenes de cliente1');
  select count(*) into v_n from cambios_estatus;
  perform pg_temp.afirmar(v_n = v_cam_c2, 'cliente2 debe ver exactamente la bitácora de sus órdenes');
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

  -- F11: mano_obra es editable (>= 0) en orden abierta propia; no en entregada.
  update ordenes set mano_obra = 100 where id = v_abierta;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'empleado asignado debe poder capturar mano_obra de una orden abierta');
  update ordenes set mano_obra = null where id = v_abierta;
  perform pg_temp.esperar_error(format('update ordenes set mano_obra = -1 where id = %s', v_abierta), 'violates check constraint');
  update ordenes set mano_obra = 1 where id = v_cerrada;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'mano_obra de una orden entregada no debe poder editarse');

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
  -- El seed le da a XYZ9876 una cita activa (siguiente día hábil); se libera aquí
  -- (dentro de la transacción) para que los grupos 6 y 7 prueben capacidad y agendado.
  update public.citas set estatus = 'cancelada', cancelada_por = 'sistema'
  where vehiculo_id = v_xyz and estatus in ('pendiente','confirmada');

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
    perform pg_temp.afirmar(v_orden.asignado_a = v_emp, 'crear_orden por empleado debe quedar asignada a él');
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
  -- F11/Q48: sin mano de obra capturada no se puede entregar; con ella sí.
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''listo'')', v_o3), 'Captura la mano de obra antes de marcar como entregado.');
  update ordenes set mano_obra = 600.00 where id = v_o3;
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

-- =====================================================================
-- 15. Asignación de órdenes (F09): solo el mecánico asignado y el admin
--     avanzan estatus y guardan notas; asignar_orden; crear_orden asigna;
--     nombre_mecanico. Usa la orden abierta sin asignar de JKL789 (seed).
--     (No hay un segundo empleado: "otro mecánico" = orden asignada al admin.)
-- =====================================================================
reset role;
do $t$
declare
  v_o4      bigint;
  v_admin   uuid;
  v_emp     uuid;
  v_c1      uuid;
  v_c2      uuid;
  v_cerr    bigint;
  v_t1      bigint;
  v_t2      bigint;
  v_t3      bigint;
  v_orden   ordenes;
  v_est     estatus_orden;
  v_nom     text;
  v_nom_emp text;
  v_n       int;
begin
  -- cliente2 quedó desactivado en el grupo 13 (misma transacción): se reactiva.
  update public.perfiles set activo = true where correo = 'cliente2@example.com';

  select id into v_admin from public.perfiles where correo = 'admin@example.com';
  select id into v_emp   from public.perfiles where correo = 'empleado@example.com';
  select id into v_c1    from public.perfiles where correo = 'cliente1@example.com';
  select id into v_c2    from public.perfiles where correo = 'cliente2@example.com';
  select nombre into v_nom_emp from public.perfiles where id = v_emp;
  select o.id into v_o4 from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'JKL789' and o.estatus = 'recibido' and o.asignado_a is null;
  select o.id into v_cerr from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'ABC123' and o.estatus = 'entregado' order by o.creado_en desc limit 1;
  perform pg_temp.afirmar(v_o4 is not null, 'el seed debe dejar una orden abierta sin asignar en JKL789');

  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTMEC1', 'Test', 'Asignacion', 2020, 1000) returning id into v_t1;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTMEC2', 'Test', 'Asignacion', 2020, 1000) returning id into v_t2;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTMEC3', 'Test', 'Asignacion', 2020, 1000) returning id into v_t3;

  -- 15a. Empleado y orden SIN asignar: no avanza ni guarda notas
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''recibido'')', v_o4),
                                'no tiene mecánico asignado');
  update public.ordenes set diagnostico = 'x' where id = v_o4;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'empleado no debe guardar notas de una orden sin asignar: afectó ' || v_n || ' filas');

  -- 15b. Orden asignada a OTRO (el admin): empleado no avanza ni guarda notas
  reset role;
  update public.ordenes set asignado_a = v_admin where id = v_o4;
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''recibido'')', v_o4),
                                'asignada a otro mecánico');
  update public.ordenes set diagnostico = 'x' where id = v_o4;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'empleado no debe guardar notas de una orden asignada a otro: afectó ' || v_n || ' filas');
  update public.ordenes set trabajo_realizado = 'x' where id = v_o4;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'empleado no debe guardar trabajo_realizado de una orden asignada a otro');

  -- El admin sí puede (siempre) aunque la orden sea de otro
  perform pg_temp.como('admin@example.com');
  update public.ordenes set diagnostico = 'Diagnóstico admin' where id = v_o4;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el admin debe poder guardar notas de cualquier orden abierta');
  reset role;
  update public.ordenes set diagnostico = null where id = v_o4;

  -- 15c. asignar_orden: solo admin; asignado_a no se edita directo
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, %L)', v_o4, v_emp), 'Solo el administrador');
  perform pg_temp.esperar_error(format('update public.ordenes set asignado_a = %L where id = %s', v_emp, v_o4), 'permission denied');
  perform pg_temp.como('cliente2@example.com');
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, %L)', v_o4, v_emp), 'Solo el administrador');

  -- 15d. Admin: validaciones y asignación feliz
  perform pg_temp.como('admin@example.com');
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, %L)', v_o4, v_c1), 'no es empleado activo');
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, %L)', v_o4, gen_random_uuid()), 'no es empleado activo');
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, %L)', v_cerr, v_emp), 'Orden cerrada');
  perform pg_temp.esperar_error(format('select public.asignar_orden(0, %L)', v_emp), 'Orden no encontrada');
  v_orden := public.asignar_orden(v_o4, v_emp);
  perform pg_temp.afirmar(v_orden.asignado_a = v_emp, 'asignar_orden debe dejar asignado_a = empleado');

  -- 15e. Ya asignada al empleado: guarda notas y avanza
  perform pg_temp.como('empleado@example.com');
  update public.ordenes set diagnostico = 'Revisión inicial' where id = v_o4;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'empleado asignado debe poder guardar notas: afectó ' || v_n || ' filas');
  perform public.avanzar_estatus_orden(v_o4, 'recibido');
  select estatus into v_est from public.ordenes where id = v_o4;
  perform pg_temp.afirmar(v_est = 'en_diagnostico', 'empleado asignado debe poder avanzar la orden');

  -- 15f. nombre_mecanico: taller y dueño ven el nombre; cliente ajeno, null
  select public.nombre_mecanico(v_o4) into v_nom;
  perform pg_temp.afirmar(v_nom = v_nom_emp, 'el taller debe ver el nombre del mecánico (vio ' || coalesce(v_nom, 'null') || ')');
  perform pg_temp.como('cliente2@example.com');
  select public.nombre_mecanico(v_o4) into v_nom;
  perform pg_temp.afirmar(v_nom = v_nom_emp, 'el cliente dueño debe ver el nombre del mecánico (vio ' || coalesce(v_nom, 'null') || ')');
  perform pg_temp.como('cliente1@example.com');
  select public.nombre_mecanico(v_o4) into v_nom;
  perform pg_temp.afirmar(v_nom is null, 'un cliente ajeno no debe ver el nombre del mecánico');

  -- 15g. Reasignar y quitar la asignación (admin); sin asignar => nombre null
  perform pg_temp.como('admin@example.com');
  v_orden := public.asignar_orden(v_o4, v_admin);
  perform pg_temp.afirmar(v_orden.asignado_a = v_admin, 'el admin debe poder reasignar');
  v_orden := public.asignar_orden(v_o4, null);
  perform pg_temp.afirmar(v_orden.asignado_a is null, 'asignar_orden con null debe quitar la asignación');
  perform pg_temp.como('cliente2@example.com');
  select public.nombre_mecanico(v_o4) into v_nom;
  perform pg_temp.afirmar(v_nom is null, 'orden sin asignar: nombre_mecanico debe ser null');

  -- 15h. crear_orden por empleado: queda asignada a él (ignora el parámetro)
  perform pg_temp.como('empleado@example.com');
  v_orden := public.crear_orden(v_t1, null, 1500, 'Orden por empleado', v_admin);
  perform pg_temp.afirmar(v_orden.asignado_a = v_emp,
                          'crear_orden por empleado debe asignarse a él mismo (asignó ' || coalesce(v_orden.asignado_a::text, 'null') || ')');

  -- 15i. crear_orden por admin: elige mecánico (opcional) y se valida
  perform pg_temp.como('admin@example.com');
  perform pg_temp.esperar_error(format('select public.crear_orden(%s, null, 1500, %L, %L)', v_t2, 'x', v_c1), 'no es empleado activo');
  v_orden := public.crear_orden(v_t2, null, 1500, 'Orden por admin', v_emp);
  perform pg_temp.afirmar(v_orden.asignado_a = v_emp, 'crear_orden por admin con mecánico debe asignarlo');
  v_orden := public.crear_orden(v_t3, null, 1500, 'Orden por admin sin mecánico');
  perform pg_temp.afirmar(v_orden.asignado_a is null, 'crear_orden por admin sin mecánico debe quedar sin asignar');

  -- 15j. anon no ejecuta las rpc nuevas
  perform pg_temp.como_anon();
  perform pg_temp.esperar_error(format('select public.asignar_orden(%s, null)', v_o4), 'permission denied');
  perform pg_temp.esperar_error(format('select public.nombre_mecanico(%s)', v_o4), 'permission denied');
  perform pg_temp.esperar_error($q$select public.crear_orden(1, null, 1, 'x', null)$q$, 'permission denied');

  perform pg_temp.ok('15. asignación de órdenes: no asignado/ajeno bloqueado, asignar_orden solo admin, crear_orden asigna, nombre_mecanico');
end $t$;

-- =====================================================================
-- 16. Inventario de refacciones (F10): RLS, columnas protegidas, crear_pieza,
--     entradas/ajustes, usar/quitar piezas en órdenes, piezas_usadas (sin
--     costos) y que existencias == suma de movimientos.
--     Crea sus propias órdenes de prueba (una del empleado, una del admin y
--     una sin asignar) con vehículos TSTINV1..3; usa la orden entregada de
--     ABC123 (con piezas del seed) para "Orden cerrada".
-- =====================================================================
reset role;
do $t$
declare
  v_emp     uuid;
  v_admin   uuid;
  v_c2      uuid;
  v_t1      bigint;
  v_t2      bigint;
  v_t3      bigint;
  v_o_emp   bigint;
  v_o_adm   bigint;
  v_o_sin   bigint;
  v_cerr    bigint;
  v_op_cerr bigint;
  v_op_adm  bigint;
  v_op_emp  bigint;
  v_pseed   bigint;
  v_p       piezas;
  v_p2      piezas;
  v_opz     orden_piezas;
  v_mov     movimientos_inventario;
  v_n       int;
  v_ex      int;
  v_nom     text;
  v_cod     text;
  v_cant    int;
  v_res     text;
begin
  -- Cuentas activas (grupo 13 desactivó a cliente2; el 15 ya la reactivó, se repite por seguridad).
  update public.perfiles set activo = true
   where correo in ('admin@example.com','empleado@example.com','cliente1@example.com','cliente2@example.com');

  select id into v_admin from public.perfiles where correo = 'admin@example.com';
  select id into v_emp   from public.perfiles where correo = 'empleado@example.com';
  select id into v_c2    from public.perfiles where correo = 'cliente2@example.com';

  select id into v_pseed from public.piezas where codigo = 'FIL-ACE-01';
  perform pg_temp.afirmar(v_pseed is not null, 'el seed debe dejar la pieza FIL-ACE-01');
  perform pg_temp.afirmar((select count(*) from public.movimientos_inventario) > 0, 'el seed debe dejar movimientos de inventario');

  select o.id into v_cerr from public.ordenes o join public.vehiculos v on v.id = o.vehiculo_id
    where v.placa = 'ABC123' and o.estatus = 'entregado' order by o.creado_en desc limit 1;
  select id into v_op_cerr from public.orden_piezas where orden_id = v_cerr limit 1;
  perform pg_temp.afirmar(v_op_cerr is not null, 'el seed debe dejar piezas usadas en la última orden entregada de ABC123');

  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTINV1', 'Test', 'Inventario', 2020, 1000) returning id into v_t1;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTINV2', 'Test', 'Inventario', 2020, 1000) returning id into v_t2;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'TSTINV3', 'Test', 'Inventario', 2020, 1000) returning id into v_t3;

  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, diagnostico, estatus)
  values (v_t1, v_emp, v_emp, 1000, 'Prueba inventario', 'en_reparacion') returning id into v_o_emp;
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, diagnostico, estatus)
  values (v_t2, v_admin, v_admin, 1000, 'Prueba inventario', 'en_reparacion') returning id into v_o_adm;
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, diagnostico, estatus)
  values (v_t3, v_admin, null, 1000, 'Prueba inventario', 'recibido') returning id into v_o_sin;

  -- 16a. Cliente: no ve nada de inventario y no puede llamar las rpc
  perform pg_temp.como('cliente1@example.com');
  select count(*) into v_n from piezas;
  perform pg_temp.afirmar(v_n = 0, 'cliente1 no debe ver piezas (vio ' || v_n || ')');
  select count(*) into v_n from movimientos_inventario;
  perform pg_temp.afirmar(v_n = 0, 'cliente1 no debe ver movimientos (vio ' || v_n || ')');
  select count(*) into v_n from orden_piezas;
  perform pg_temp.afirmar(v_n = 0, 'cliente1 no debe ver orden_piezas (vio ' || v_n || ')');
  perform pg_temp.esperar_error($q$select public.crear_pieza('CLI-01', 'Pieza cliente', null, 10, 1, 0)$q$, 'No tienes permiso');
  perform pg_temp.esperar_error(format('select public.registrar_entrada(%s, 1, null)', v_pseed), 'No tienes permiso');
  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, 5, %L)', v_pseed, 'x'), 'No tienes permiso');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_o_emp, v_pseed), 'No tienes permiso');
  perform pg_temp.esperar_error(format('select public.quitar_pieza_de_orden(%s)', v_op_cerr), 'No tienes permiso');
  update piezas set nombre = 'Hack';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'cliente no debe poder editar piezas (RLS): afectó ' || v_n || ' filas');
  perform pg_temp.esperar_error(format('update piezas set existencias = 999 where id = %s', v_pseed), 'permission denied');
  perform pg_temp.como('cliente2@example.com');   -- dueño de los vehículos de prueba: tampoco ve orden_piezas
  select count(*) into v_n from orden_piezas;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 no debe leer orden_piezas directo (vio ' || v_n || ')');

  -- 16b. Empleado: columnas protegidas, crear_pieza, entradas y ajustes
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('update piezas set existencias = 999 where id = %s', v_pseed), 'permission denied');
  perform pg_temp.esperar_error(format('update piezas set codigo = ''HACK-01'' where id = %s', v_pseed), 'permission denied');
  perform pg_temp.esperar_error($q$insert into piezas (codigo, nombre, costo) values ('DIR-01', 'Directo', 1)$q$, 'permission denied');
  perform pg_temp.esperar_error('delete from piezas', 'permission denied');
  perform pg_temp.esperar_error($q$insert into movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, hecho_por) values (1, 'entrada', 1, 1, auth.uid())$q$, 'permission denied');
  perform pg_temp.esperar_error($q$insert into orden_piezas (orden_id, pieza_id, cantidad, costo_unitario, agregado_por) values (1, 1, 1, 1, auth.uid())$q$, 'permission denied');

  v_p := public.crear_pieza('tst-inv 01', '  Pieza de prueba  ', 'Compat X 2015–2020', 100.50, 10, 3);
  perform pg_temp.afirmar(v_p.codigo = 'TST-INV01', 'crear_pieza debe normalizar el código (quedó ' || v_p.codigo || ')');
  perform pg_temp.afirmar(v_p.nombre = 'Pieza de prueba' and v_p.costo = 100.50 and v_p.existencias = 10
                          and v_p.stock_minimo = 3 and v_p.activa, 'crear_pieza debe guardar los datos recortados y activa');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_mov.tipo = 'entrada' and v_mov.cantidad = 10 and v_mov.existencias_resultantes = 10
                          and v_mov.motivo = 'Existencia inicial' and v_mov.hecho_por = v_emp and v_mov.orden_id is null,
                          'crear_pieza con existencias debe registrar la entrada "Existencia inicial"');

  perform pg_temp.esperar_error(format('select public.crear_pieza(%L, %L, null, 1, 0, 0)', 'tst-inv01', 'Repetida'), 'Ya existe una pieza con ese código.');
  perform pg_temp.esperar_error($q$select public.crear_pieza('a', 'Código corto', null, 1, 0, 0)$q$, 'El código debe');
  perform pg_temp.esperar_error($q$select public.crear_pieza('TST-NOM', 'x', null, 1, 0, 0)$q$, 'El nombre debe');
  perform pg_temp.esperar_error($q$select public.crear_pieza('TST-COS', 'Costo malo', null, -1, 0, 0)$q$, 'costo válido');
  perform pg_temp.esperar_error($q$select public.crear_pieza('TST-EXI', 'Existencias malas', null, 1, -1, 0)$q$, 'existencias');

  v_p2 := public.crear_pieza('TST-INV02', 'Pieza sin stock', null, 50, 0, 0);
  perform pg_temp.afirmar(v_p2.compatibilidad is null, 'compatibilidad vacía debe quedar null');
  select count(*) into v_n from movimientos_inventario where pieza_id = v_p2.id;
  perform pg_temp.afirmar(v_n = 0, 'crear_pieza sin existencias no debe registrar movimiento');

  v_p := public.registrar_entrada(v_p.id, 5, 'Compra a proveedor');
  perform pg_temp.afirmar(v_p.existencias = 15, 'registrar_entrada debe sumar (quedó ' || v_p.existencias || ')');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_mov.tipo = 'entrada' and v_mov.cantidad = 5 and v_mov.existencias_resultantes = 15
                          and v_mov.motivo = 'Compra a proveedor', 'la entrada debe registrar cantidad, resultante y motivo');
  perform pg_temp.esperar_error(format('select public.registrar_entrada(%s, 0, null)', v_p.id), 'La cantidad debe ser mayor a 0.');
  perform pg_temp.esperar_error(format('select public.registrar_entrada(%s, -3, null)', v_p.id), 'La cantidad debe ser mayor a 0.');
  perform pg_temp.esperar_error('select public.registrar_entrada(0, 1, null)', 'Pieza no encontrada.');

  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, 20, %L)', v_p.id, ''), 'Escribe el motivo del ajuste.');
  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, 20, %L)', v_p.id, '   '), 'Escribe el motivo del ajuste.');
  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, 20, null)', v_p.id), 'Escribe el motivo del ajuste.');
  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, 15, %L)', v_p.id, 'Igual'), 'Las existencias no cambiaron.');
  perform pg_temp.esperar_error(format('select public.ajustar_existencias(%s, -1, %L)', v_p.id, 'Negativo'), 'negativas');
  v_p := public.ajustar_existencias(v_p.id, 20, 'Conteo físico');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_p.existencias = 20 and v_mov.tipo = 'ajuste' and v_mov.cantidad = 5
                          and v_mov.existencias_resultantes = 20 and v_mov.motivo = 'Conteo físico',
                          'ajuste a 20 debe registrar delta +5');
  v_p := public.ajustar_existencias(v_p.id, 12, 'Merma');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_p.existencias = 12 and v_mov.cantidad = -8 and v_mov.existencias_resultantes = 12,
                          'ajuste a 12 debe registrar delta -8');

  -- Edición directa permitida: nombre, compatibilidad, costo, stock_minimo, activa
  update piezas set costo = 120.00, stock_minimo = 4 where id = v_p.id;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'empleado debe poder editar costo/stock_minimo de una pieza');

  -- 16c. usar_pieza_en_orden
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_o_adm, v_p.id), 'Esta orden está asignada a otro mecánico.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_o_sin, v_p.id),
                                'Esta orden no tiene mecánico asignado. Pide al administrador que la asigne.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_cerr, v_p.id), 'Orden cerrada.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(0, %s, 1)', v_p.id), 'Orden no encontrada.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 0)', v_o_emp, v_p.id), 'La cantidad debe ser mayor a 0.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, 0, 1)', v_o_emp), 'Pieza no encontrada.');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 13)', v_o_emp, v_p.id), 'No hay suficientes existencias: quedan 12.');

  v_p2 := public.registrar_entrada(v_p2.id, 4, null);
  update piezas set activa = false where id = v_p2.id;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'empleado debe poder desactivar una pieza');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_o_emp, v_p2.id), 'Esta pieza está desactivada.');
  select existencias into v_ex from piezas where id = v_p2.id;
  perform pg_temp.afirmar(v_ex = 4, 'una pieza inactiva no debe descontarse');
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 12, 'los intentos fallidos no deben modificar existencias (hay ' || v_ex || ')');

  v_opz := public.usar_pieza_en_orden(v_o_emp, v_p.id, 3);
  perform pg_temp.afirmar(v_opz.cantidad = 3 and v_opz.costo_unitario = 120.00 and v_opz.agregado_por = v_emp and v_opz.orden_id = v_o_emp,
                          'usar_pieza_en_orden feliz: cantidad 3, costo_unitario copiado, agregado_por empleado');
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 9, 'usar 3 de 12 debe dejar 9 (quedó ' || v_ex || ')');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_mov.tipo = 'salida' and v_mov.cantidad = -3 and v_mov.existencias_resultantes = 9
                          and v_mov.orden_id = v_o_emp and v_mov.hecho_por = v_emp, 'debe registrarse la salida (-3) ligada a la orden');

  -- Misma pieza otra vez: suma cantidad y conserva el costo original aunque el costo de la pieza cambie
  update piezas set costo = 150.00 where id = v_p.id;
  v_opz := public.usar_pieza_en_orden(v_o_emp, v_p.id, 2);
  v_op_emp := v_opz.id;
  perform pg_temp.afirmar(v_opz.cantidad = 5 and v_opz.costo_unitario = 120.00, 'usar de nuevo debe sumar a 5 y conservar costo_unitario 120.00');
  select count(*) into v_n from orden_piezas where orden_id = v_o_emp and pieza_id = v_p.id;
  perform pg_temp.afirmar(v_n = 1, 'la pieza debe aparecer una sola vez en la orden');
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 7, 'tras usar 3 + 2 deben quedar 7 (quedó ' || v_ex || ')');
  select count(*) into v_n from movimientos_inventario where pieza_id = v_p.id and tipo = 'salida' and orden_id = v_o_emp;
  perform pg_temp.afirmar(v_n = 2, 'deben existir 2 movimientos de salida de la orden');

  -- El admin puede usar piezas en cualquier orden abierta, pero no en una cerrada
  perform pg_temp.como('admin@example.com');
  v_opz := public.usar_pieza_en_orden(v_o_adm, v_p.id, 1);
  v_op_adm := v_opz.id;
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 6, 'el admin debe poder usar piezas (quedó ' || v_ex || ')');
  perform pg_temp.esperar_error(format('select public.usar_pieza_en_orden(%s, %s, 1)', v_cerr, v_p.id), 'Orden cerrada.');

  -- 16d. piezas_usadas: sin costos; cliente dueño ve, cliente ajeno no
  perform pg_temp.como('cliente2@example.com');
  select count(*), max(nombre), max(codigo), max(cantidad) into v_n, v_nom, v_cod, v_cant from public.piezas_usadas(v_o_emp);
  perform pg_temp.afirmar(v_n = 1 and v_nom = 'Pieza de prueba' and v_cod = 'TST-INV01' and v_cant = 5,
                          'el cliente dueño debe ver la pieza usada (nombre, código, cantidad 5)');
  perform pg_temp.como('cliente1@example.com');
  select count(*) into v_n from public.piezas_usadas(v_o_emp);
  perform pg_temp.afirmar(v_n = 0, 'un cliente ajeno debe recibir 0 filas de piezas_usadas (recibió ' || v_n || ')');
  select count(*) into v_n from public.piezas_usadas(v_cerr);
  perform pg_temp.afirmar(v_n >= 1, 'cliente1 debe ver las piezas de su orden entregada (ABC123)');
  perform pg_temp.como('cliente2@example.com');
  select count(*) into v_n from public.piezas_usadas(v_cerr);
  perform pg_temp.afirmar(v_n = 0, 'cliente2 no debe ver las piezas de una orden de cliente1');
  perform pg_temp.como('empleado@example.com');
  select count(*) into v_n from public.piezas_usadas(v_o_emp);
  perform pg_temp.afirmar(v_n = 1, 'el taller debe ver las piezas de la orden');
  reset role;
  select pg_get_function_result('public.piezas_usadas(bigint)'::regprocedure) into v_res;
  perform pg_temp.afirmar(v_res not ilike '%costo%', 'piezas_usadas no debe exponer costos (devuelve: ' || v_res || ')');

  -- 16e. quitar_pieza_de_orden
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.quitar_pieza_de_orden(%s)', v_op_adm), 'Esta orden está asignada a otro mecánico.');
  perform pg_temp.esperar_error(format('select public.quitar_pieza_de_orden(%s)', v_op_cerr), 'Orden cerrada.');
  perform pg_temp.esperar_error('select public.quitar_pieza_de_orden(0)', 'no encontrada');
  perform public.quitar_pieza_de_orden(v_op_emp);
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 11, 'quitar 5 de la orden debe devolver al stock (6 -> 11; quedó ' || v_ex || ')');
  select * into v_mov from movimientos_inventario where pieza_id = v_p.id order by id desc limit 1;
  perform pg_temp.afirmar(v_mov.tipo = 'devolucion' and v_mov.cantidad = 5 and v_mov.existencias_resultantes = 11
                          and v_mov.orden_id = v_o_emp, 'debe registrarse la devolución (+5) ligada a la orden');
  select count(*) into v_n from orden_piezas where id = v_op_emp;
  perform pg_temp.afirmar(v_n = 0, 'la fila de orden_piezas debe borrarse');
  perform pg_temp.esperar_error(format('select public.quitar_pieza_de_orden(%s)', v_op_emp), 'no encontrada');
  select count(*) into v_n from public.piezas_usadas(v_o_emp);
  perform pg_temp.afirmar(v_n = 0, 'la orden ya no debe listar la pieza quitada');
  perform pg_temp.como('admin@example.com');
  perform public.quitar_pieza_de_orden(v_op_adm);
  select existencias into v_ex from piezas where id = v_p.id;
  perform pg_temp.afirmar(v_ex = 12, 'el admin debe poder quitar piezas (quedó ' || v_ex || ')');
  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format('select public.quitar_pieza_de_orden(%s)', v_op_cerr), 'No tienes permiso');

  -- 16f. existencias == suma de movimientos (todas las piezas) y == último resultante
  reset role;
  select count(*) into v_n from public.piezas z
   where z.existencias <> coalesce((select sum(m.cantidad) from public.movimientos_inventario m where m.pieza_id = z.id), 0);
  perform pg_temp.afirmar(v_n = 0, 'existencias debe ser igual a la suma de movimientos en todas las piezas (' || v_n || ' no cuadran)');
  select count(*) into v_n from public.piezas z
   where z.existencias <> coalesce((select m.existencias_resultantes from public.movimientos_inventario m
                                    where m.pieza_id = z.id order by m.id desc limit 1), 0);
  perform pg_temp.afirmar(v_n = 0, 'existencias debe ser igual al último existencias_resultantes (' || v_n || ' no cuadran)');

  -- 16g. anon y helper interno sin acceso
  perform pg_temp.como_anon();
  perform pg_temp.esperar_error('select count(*) from piezas', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from movimientos_inventario', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from orden_piezas', 'permission denied');
  perform pg_temp.esperar_error($q$select public.crear_pieza('ANON-1', 'Anon', null, 1, 1, 0)$q$, 'permission denied');
  perform pg_temp.esperar_error('select public.registrar_entrada(1, 1, null)', 'permission denied');
  perform pg_temp.esperar_error($q$select public.ajustar_existencias(1, 1, 'x')$q$, 'permission denied');
  perform pg_temp.esperar_error('select public.usar_pieza_en_orden(1, 1, 1)', 'permission denied');
  perform pg_temp.esperar_error('select public.quitar_pieza_de_orden(1)', 'permission denied');
  perform pg_temp.esperar_error('select * from public.piezas_usadas(1)', 'permission denied');
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error('select public._validar_edicion_orden(1)', 'permission denied');

  perform pg_temp.ok('16. inventario: RLS y columnas protegidas, crear_pieza, entradas/ajustes, usar/quitar en órdenes, piezas_usadas sin costos, existencias = suma de movimientos, anon sin acceso');
end $t$;

-- =====================================================================
-- 17. Facturación (F11): Q48 mano de obra para entregar, solicitar_factura
--     (propiedad, estatus, validaciones, cálculo, folio, una por orden),
--     RLS de facturas/conceptos, sin escritura directa y conceptos congelados.
--     Crea sus propios vehículos TSTFAC1..4 y órdenes (como postgres) para no
--     depender de si la factura demo o la orden 2 ya se facturaron.
--     Empleado/admin que llaman solicitar_factura reciben 'Orden no encontrada.'
--     (la función solo acepta al cliente dueño del vehículo).
-- =====================================================================
reset role;

create or replace function pg_temp.sql_fact(p_orden bigint, p_rfc text, p_razon text, p_reg text,
                                            p_cp text, p_uso text, p_correo text) returns text
language sql as $f$
  select format('select public.solicitar_factura(%s, %L, %L, %L, %L, %L, %L)',
                p_orden, p_rfc, p_razon, p_reg, p_cp, p_uso, p_correo);
$f$;

do $t$
declare
  v_c1     uuid;
  v_c2     uuid;
  v_emp    uuid;
  v_veh1   bigint;
  v_veh2   bigint;
  v_veh3   bigint;
  v_veh4   bigint;
  v_oa     bigint;   -- entregada, con piezas y mano de obra
  v_ob     bigint;   -- no entregada
  v_oc     bigint;   -- entregada sin montos
  v_od     bigint;   -- en 'listo' sin mano de obra (Q48)
  v_p1     bigint;
  v_p2     bigint;
  v_f      facturas;
  v_f_ant  facturas;
  v_n      int;
  v_sum    numeric;
  v_todas  int;
  v_total_visto int;
begin
  select id into v_c1  from public.perfiles where correo = 'cliente1@example.com';
  select id into v_c2  from public.perfiles where correo = 'cliente2@example.com';
  select id into v_emp from public.perfiles where correo = 'empleado@example.com';
  update public.perfiles set activo = true where id in (v_c1, v_c2, v_emp);

  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'TSTFAC1', 'Test', 'Factura', 2020, 1000) returning id into v_veh1;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'TSTFAC2', 'Test', 'Factura', 2020, 1000) returning id into v_veh2;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'TSTFAC3', 'Test', 'Factura', 2020, 1000) returning id into v_veh3;
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'TSTFAC4', 'Test', 'Factura', 2020, 1000) returning id into v_veh4;

  select id into v_p1 from public.piezas where codigo = 'FIL-ACE-01';
  select id into v_p2 from public.piezas where codigo = 'ACE-5W30';
  perform pg_temp.afirmar(v_p1 is not null and v_p2 is not null, 'el seed debe tener las piezas FIL-ACE-01 y ACE-5W30');

  -- A: entregada, mano de obra 300.00, piezas 2 x 123.45 + 3 x 10.10 => subtotal 577.20
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, estatus, mano_obra, entregado_en)
  values (v_veh1, v_emp, v_emp, 1000, 'entregado', 300.00, now()) returning id into v_oa;
  insert into public.orden_piezas (orden_id, pieza_id, cantidad, costo_unitario, agregado_por) values
    (v_oa, v_p1, 2, 123.45, v_emp),
    (v_oa, v_p2, 3, 10.10,  v_emp);
  -- B: abierta
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, estatus)
  values (v_veh2, v_emp, v_emp, 1000, 'en_diagnostico') returning id into v_ob;
  -- C: entregada sin piezas y con mano de obra 0 (nada que facturar)
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, estatus, mano_obra, entregado_en)
  values (v_veh3, v_emp, v_emp, 1000, 'entregado', 0, now()) returning id into v_oc;
  -- D: lista para entregar, sin mano de obra (Q48)
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, estatus, diagnostico, trabajo_realizado)
  values (v_veh4, v_emp, v_emp, 1000, 'listo', 'Dx', 'Trabajo') returning id into v_od;

  -- 17a. Q48: entregar exige mano de obra capturada (0 es válido)
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('select public.avanzar_estatus_orden(%s, ''listo'')', v_od),
                                'Captura la mano de obra antes de marcar como entregado.');
  update public.ordenes set mano_obra = 0 where id = v_od;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el empleado asignado debe poder capturar mano_obra = 0');
  perform public.avanzar_estatus_orden(v_od, 'listo');
  perform pg_temp.afirmar((select estatus from public.ordenes where id = v_od) = 'entregado',
                          'con mano_obra = 0 la orden debe poder entregarse');

  -- 17b. Cliente ajeno, rol taller y anon
  perform pg_temp.como('cliente2@example.com');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Orden no encontrada.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(0, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Orden no encontrada.');
  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Orden no encontrada.');
  perform pg_temp.como('admin@example.com');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Orden no encontrada.');
  perform pg_temp.como_anon();
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'permission denied');

  -- 17c. Cliente dueño: estatus y validaciones
  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_ob, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'),
                                'La factura solo se puede pedir cuando el servicio está entregado.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ABC', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Escribe un RFC válido.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA85031', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'), 'Escribe un RFC válido.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'ab', '612', '22010', 'G03', 'a@b.com'), 'razón social');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '999', '22010', 'G03', 'a@b.com'), 'Elige un régimen fiscal válido.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '2201', 'G03', 'a@b.com'), 'El código postal debe tener 5 dígitos.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '2201A', 'G03', 'a@b.com'), 'El código postal debe tener 5 dígitos.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'XXX', 'a@b.com'), 'Elige un uso de CFDI válido.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'no-es-correo'), 'Escribe un correo válido.');
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oc, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'),
                                'Este servicio no tiene montos para facturar.');
  perform pg_temp.afirmar((select count(*) from public.facturas where orden_id in (v_oa, v_ob, v_oc)) = 0,
                          'las solicitudes inválidas no deben dejar facturas');

  -- 17d. Camino feliz (RFC en minúsculas y con espacios: se normaliza)
  select * into v_f from public.solicitar_factura(v_oa, '  aCLa850315ab1 ', 'Ana Cliente Demo', '612', '22010', 'G03', 'ana@example.com');
  perform pg_temp.afirmar(v_f.subtotal = 577.20, 'subtotal debe ser 577.20 (vino ' || v_f.subtotal || ')');
  perform pg_temp.afirmar(v_f.iva = round(v_f.subtotal * 0.16, 2) and v_f.iva = 92.35, 'iva debe ser 92.35 (vino ' || v_f.iva || ')');
  perform pg_temp.afirmar(v_f.total = v_f.subtotal + v_f.iva and v_f.total = 669.55, 'total debe ser 669.55 (vino ' || v_f.total || ')');
  perform pg_temp.afirmar(v_f.folio ~ '^A-[0-9]{6}$' and v_f.folio = 'A-' || lpad(v_f.id::text, 6, '0'), 'folio con formato A-000000 (vino ' || v_f.folio || ')');
  perform pg_temp.afirmar(v_f.rfc = 'ACLA850315AB1' and v_f.cliente_id = v_c1 and v_f.orden_id = v_oa, 'RFC normalizado, cliente y orden correctos');
  select count(*), coalesce(sum(importe), 0) into v_n, v_sum from public.factura_conceptos where factura_id = v_f.id;
  perform pg_temp.afirmar(v_n = 3, 'deben existir 3 conceptos (2 piezas + mano de obra); hay ' || v_n);
  perform pg_temp.afirmar(v_sum = v_f.subtotal, 'subtotal debe ser la suma de los conceptos');
  perform pg_temp.afirmar(exists (select 1 from public.factura_conceptos
                                  where factura_id = v_f.id and descripcion = 'Mano de obra' and cantidad = 1
                                    and precio_unitario = 300.00 and importe = 300.00),
                          'debe existir el concepto Mano de obra 1 x 300.00');
  perform pg_temp.afirmar(exists (select 1 from public.factura_conceptos
                                  where factura_id = v_f.id and descripcion = 'Filtro de aceite (FIL-ACE-01)' and cantidad = 2
                                    and precio_unitario = 123.45 and importe = 246.90),
                          'debe existir el concepto de la refacción con descripción "nombre (código)"');

  -- 17e. Una factura por orden
  perform pg_temp.esperar_error(pg_temp.sql_fact(v_oa, 'ACLA850315AB1', 'Ana Demo', '612', '22010', 'G03', 'a@b.com'),
                                'ya tiene la factura ' || v_f.folio);

  -- 17f. RLS: dueño ve lo suyo; ajeno 0 filas; taller ve todo
  select count(*) into v_n from public.facturas where id = v_f.id;
  perform pg_temp.afirmar(v_n = 1, 'el cliente dueño debe ver su factura');
  select count(*) into v_n from public.factura_conceptos where factura_id = v_f.id;
  perform pg_temp.afirmar(v_n = 3, 'el cliente dueño debe ver los conceptos de su factura');
  select count(*) into v_n from public.facturas where cliente_id <> v_c1;
  perform pg_temp.afirmar(v_n = 0, 'el cliente no debe ver facturas de otros');
  perform pg_temp.como('cliente2@example.com');
  select count(*) into v_n from public.facturas;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 no debe ver ninguna factura (ve ' || v_n || ')');
  select count(*) into v_n from public.factura_conceptos;
  perform pg_temp.afirmar(v_n = 0, 'cliente2 no debe ver conceptos de facturas ajenas (ve ' || v_n || ')');
  reset role;
  select count(*) into v_todas from public.facturas;
  perform pg_temp.como('empleado@example.com');
  select count(*) into v_total_visto from public.facturas;
  perform pg_temp.afirmar(v_total_visto = v_todas, 'el empleado debe ver todas las facturas');
  select count(*) into v_n from public.factura_conceptos where factura_id = v_f.id;
  perform pg_temp.afirmar(v_n = 3, 'el empleado debe ver los conceptos');
  perform pg_temp.como('admin@example.com');
  select count(*) into v_total_visto from public.facturas;
  perform pg_temp.afirmar(v_total_visto = v_todas, 'el admin debe ver todas las facturas');

  -- 17g. Sin escritura directa para nadie
  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error(format($q$insert into facturas (folio, orden_id, cliente_id, rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo, subtotal, iva, total)
                                         values ('A-999999', %s, %L, 'ACLA850315AB1', 'Ana', '612', '22010', 'G03', 'a@b.com', 1, 0.16, 1.16)$q$, v_ob, v_c1), 'permission denied');
  perform pg_temp.esperar_error(format('update facturas set total = 0 where id = %s', v_f.id), 'permission denied');
  perform pg_temp.esperar_error(format('delete from facturas where id = %s', v_f.id), 'permission denied');
  perform pg_temp.esperar_error(format($q$insert into factura_conceptos (factura_id, descripcion, cantidad, precio_unitario, importe) values (%s, 'x', 1, 1, 1)$q$, v_f.id), 'permission denied');
  perform pg_temp.esperar_error(format('update factura_conceptos set importe = 0 where factura_id = %s', v_f.id), 'permission denied');
  perform pg_temp.esperar_error(format('delete from factura_conceptos where factura_id = %s', v_f.id), 'permission denied');
  perform pg_temp.como('admin@example.com');
  perform pg_temp.esperar_error(format('update facturas set total = 0 where id = %s', v_f.id), 'permission denied');
  perform pg_temp.esperar_error(format('delete from factura_conceptos where factura_id = %s', v_f.id), 'permission denied');
  perform pg_temp.como_anon();
  perform pg_temp.esperar_error('select count(*) from facturas', 'permission denied');
  perform pg_temp.esperar_error('select count(*) from factura_conceptos', 'permission denied');

  -- 17h. Conceptos congelados: cambios posteriores en orden_piezas / mano_obra no los alteran
  reset role;
  update public.orden_piezas set cantidad = 9, costo_unitario = 999.99 where orden_id = v_oa;
  update public.ordenes set mano_obra = 1.00 where id = v_oa;
  perform pg_temp.como('cliente1@example.com');
  select coalesce(sum(importe), 0) into v_sum from public.factura_conceptos where factura_id = v_f.id;
  perform pg_temp.afirmar(v_sum = 577.20, 'los conceptos deben seguir sumando 577.20 (suman ' || v_sum || ')');
  select * into v_f_ant from public.facturas where id = v_f.id;
  perform pg_temp.afirmar(v_f_ant.subtotal = 577.20 and v_f_ant.iva = 92.35 and v_f_ant.total = 669.55,
                          'los totales de la factura no deben cambiar');
  perform pg_temp.afirmar(exists (select 1 from public.factura_conceptos
                                  where factura_id = v_f.id and descripcion = 'Mano de obra' and importe = 300.00),
                          'el concepto Mano de obra no debe cambiar');

  perform pg_temp.ok('17. facturación: Q48, solicitar_factura (propiedad, estatus, validaciones, cálculo, folio, una por orden), RLS, sin escritura directa, conceptos congelados');
end $t$;

-- =====================================================================
-- 18. Endurecimiento (Q52): restricciones de formato/longitud y funciones
-- =====================================================================
reset role;
do $t$
declare
  v_abierta bigint;
  v_f record;
begin
  -- Orden propia de este grupo (los grupos anteriores ya avanzaron las órdenes del seed).
  insert into public.vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values ((select id from public.perfiles where correo = 'cliente2@example.com'), 'TSTSEG1', 'Test', 'Seguridad', 2020, 1000)
  returning id into v_abierta;
  insert into public.ordenes (vehiculo_id, creada_por, asignado_a, kilometraje, estatus)
  values (v_abierta,
          (select id from public.perfiles where correo = 'admin@example.com'),
          (select id from public.perfiles where correo = 'empleado@example.com'),
          1000, 'recibido')
  returning id into v_abierta;
  perform pg_temp.afirmar(v_abierta is not null, 'no se pudo crear la orden de prueba del grupo 18');

  perform pg_temp.como('cliente1@example.com');
  perform pg_temp.esperar_error($q$update perfiles set telefono = 'javascript:alert(1)' where id = auth.uid()$q$, 'perfiles_telefono_formato');
  update perfiles set telefono = '6641234567' where id = auth.uid();
  perform pg_temp.esperar_error($q$update perfiles set nombre = 'A' where id = auth.uid()$q$, 'perfiles_nombre_largo');

  perform pg_temp.como('empleado@example.com');
  perform pg_temp.esperar_error(format('update ordenes set diagnostico = repeat(''a'', 2001) where id = %s', v_abierta), 'ordenes_diagnostico_largo');

  reset role;
  -- Toda función SECURITY DEFINER de public debe fijar search_path.
  for v_f in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    raise exception 'FALLÓ: la función SECURITY DEFINER % no fija search_path', v_f.proname;
  end loop;

  -- Ninguna función de public debe ser ejecutable por anon.
  for v_f in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')
  loop
    raise exception 'FALLÓ: anon tiene EXECUTE sobre la función %', v_f.proname;
  end loop;

  perform pg_temp.ok('18. endurecimiento: restricciones de teléfono/nombre/diagnóstico, search_path en SECURITY DEFINER, sin EXECUTE para anon');
end $t$;

reset role;
do $t$ begin raise notice 'TODAS LAS PRUEBAS PASARON'; end $t$;

rollback;
