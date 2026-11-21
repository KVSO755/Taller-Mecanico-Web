-- =====================================================================
-- TallerApp · seed.sql  (datos de demo, re-ejecutable)
--
-- PRECONDICIÓN: las 4 cuentas ya se crearon desde /registro de la app
-- (contraseña demo de todas: Demo1234):
--   admin@example.com     (Admin Taller)
--   empleado@example.com  (Mario Mecánico)
--   cliente1@example.com  (Ana Cliente)
--   cliente2@example.com  (Luis Cliente)
--
-- Se ejecuta como postgres en el SQL Editor (salta RLS e inserta directo;
-- no usa las rpc porque auth.uid() es null aquí).
-- Orden: schema.sql -> functions.sql -> policies.sql -> seed.sql
--
-- Re-ejecutable: borra SOLO los datos de cliente1 y cliente2 (cambios_estatus,
-- ordenes, citas, vehiculos) y los vuelve a crear. Todas las fechas son
-- relativas a HOY en America/Tijuana, así que nunca caducan.
-- Si alguna placa demo (ABC123, XYZ9876, BCD456, JKL789, MNO3456, PQR2468) ya pertenece a otro cliente,
-- el insert falla por unicidad: bórrala antes.
-- =====================================================================

-- Próximo (dir = 1) o anterior (dir = -1) día no domingo a partir de d.
create or replace function pg_temp.dia_habil(d date, dir int)
returns date
language sql
immutable
as $$
  select case when extract(isodow from d) = 7 then d + dir else d end;
$$;

-- Fecha local de Tijuana + hora (en punto) -> timestamptz.
create or replace function pg_temp.tj(d date, h int)
returns timestamptz
language sql
immutable
as $$
  select (d + make_time(h, 0, 0)) at time zone 'America/Tijuana';
$$;

do $$
declare
  v_admin    uuid;
  v_emp      uuid;
  v_c1       uuid;
  v_c2       uuid;
  v_correo   text;
  v_hoy      date := (now() at time zone 'America/Tijuana')::date;

  v_abc      bigint;   -- ABC123 (cliente1)
  v_xyz      bigint;   -- XYZ9876 (cliente1)
  v_bcd      bigint;   -- BCD456 (cliente2)
  v_jkl      bigint;   -- JKL789 (cliente2)
  v_mno      bigint;   -- MNO3456 (cliente2)
  v_pqr      bigint;   -- PQR2468 (cliente2)
  v_lun      date;     -- siguiente día hábil después de hoy (demo: lunes)

  v_d60      date;
  v_d14      date;
  v_cita_at  bigint;
  v_o1       bigint;
  v_o2       bigint;
  v_o3       bigint;
  t          timestamptz;
begin
  -- ---------- 1. Buscar cuentas ----------
  foreach v_correo in array array['admin@example.com','empleado@example.com','cliente1@example.com','cliente2@example.com'] loop
    if not exists (select 1 from perfiles where correo = v_correo) then
      raise exception 'Falta la cuenta % : regístrala primero desde /registro (contraseña Demo1234) y vuelve a ejecutar el seed.', v_correo;
    end if;
  end loop;

  select id into v_admin from perfiles where correo = 'admin@example.com';
  select id into v_emp   from perfiles where correo = 'empleado@example.com';
  select id into v_c1    from perfiles where correo = 'cliente1@example.com';
  select id into v_c2    from perfiles where correo = 'cliente2@example.com';

  -- ---------- 2. Roles y teléfonos ----------
  update perfiles set rol = 'admin',   activo = true where id = v_admin;
  update perfiles set rol = 'empleado', activo = true where id = v_emp;
  update perfiles set rol = 'cliente',  activo = true where id in (v_c1, v_c2);

  update perfiles set telefono = '6641110001' where id = v_admin and telefono is null;
  update perfiles set telefono = '6641110002' where id = v_emp   and telefono is null;
  update perfiles set telefono = '6641110003' where id = v_c1    and telefono is null;
  update perfiles set telefono = '6641110004' where id = v_c2    and telefono is null;

  -- ---------- 3. Limpiar datos demo previos (orden de FKs) ----------
  delete from cambios_estatus
   where orden_id in (select o.id from ordenes o join vehiculos v on v.id = o.vehiculo_id
                      where v.cliente_id in (v_c1, v_c2));
  delete from ordenes
   where vehiculo_id in (select id from vehiculos where cliente_id in (v_c1, v_c2));
  delete from citas     where cliente_id in (v_c1, v_c2);
  delete from vehiculos where cliente_id in (v_c1, v_c2);

  v_lun := pg_temp.dia_habil(v_hoy + 1, 1);

  -- ---------- 4. Vehículos ----------
  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'ABC123', 'Nissan', 'Versa', 2018, 44000) returning id into v_abc;
  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c1, 'XYZ9876', 'Toyota', 'Hilux', 2016, 76500) returning id into v_xyz;
  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'BCD456', 'Honda', 'Civic', 2020, 30000) returning id into v_bcd;

  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'JKL789', 'Mazda', '3', 2019, 52000) returning id into v_jkl;
  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'MNO3456', 'Chevrolet', 'Aveo', 2017, 88000) returning id into v_mno;
  insert into vehiculos (cliente_id, placa, marca, modelo, anio, kilometraje)
  values (v_c2, 'PQR2468', 'Ford', 'Ranger', 2021, 21000) returning id into v_pqr;

  -- ---------- 5. Citas ----------
  -- 5a. Pendiente futura (cliente1, ABC123): próximo día hábil desde hoy+3, 10:00.
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c1, v_abc, pg_temp.tj(pg_temp.dia_habil(v_hoy + 3, 1), 10),
          'Revisión de frenos y cambio de aceite', 'pendiente');

  -- 5b. Confirmada para HOY (cliente2, BCD456) a las 12:00: sirve para probar
  --     "Crear orden desde cita". Si hoy es domingo (taller cerrado) se usa
  --     MAÑANA (lunes); en ese caso crear_orden la rechazará hasta ese día
  --     ("solo cita confirmada de hoy"): vuelve a ejecutar el seed el lunes.
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c2, v_bcd, pg_temp.tj(pg_temp.dia_habil(v_hoy, 1), 12),
          'Ruido en la suspensión delantera', 'confirmada');

  -- 5c. Cancelada por el cliente (futura).
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus, cancelada_por)
  values (v_c1, v_abc, pg_temp.tj(pg_temp.dia_habil(v_hoy + 5, 1), 11),
          'Afinación mayor', 'cancelada', 'cliente');

  -- 5d. Cancelada por el sistema (pasado, nunca se confirmó).
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus, cancelada_por)
  values (v_c2, v_bcd, pg_temp.tj(pg_temp.dia_habil(v_hoy - 10, -1), 9),
          'Revisión general', 'cancelada', 'sistema');

  -- 5e. Atendida (pasado, hace ~2 semanas), ligada a la orden 2 (abajo).
  v_d14 := pg_temp.dia_habil(v_hoy - 14, -1);
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c1, v_abc, pg_temp.tj(v_d14, 9), 'Cambio de balatas delanteras', 'atendida')
  returning id into v_cita_at;

  -- 5f. Agenda del siguiente día hábil (demo del domingo: lunes). Un vehículo,
  --     una sola cita activa; capacidad 3 por hora.
  --     10:00 LLENO (3 activas: 2 confirmadas + 1 pendiente).
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus) values
    (v_c2, v_jkl, pg_temp.tj(v_lun, 10), 'Cambio de aceite y filtros', 'confirmada'),
    (v_c2, v_mno, pg_temp.tj(v_lun, 10), 'Revisión de frenos', 'confirmada'),
    (v_c2, v_pqr, pg_temp.tj(v_lun, 10), 'Afinación menor', 'pendiente');
  --     14:00 confirmada (cliente1, XYZ9876). La de 12:00 es la 5b si hoy es domingo.
  insert into citas (cliente_id, vehiculo_id, fecha_hora, motivo, estatus)
  values (v_c1, v_xyz, pg_temp.tj(v_lun, 14), 'Revisión de suspensión', 'confirmada');

  -- ---------- 6. Órdenes + bitácora ----------
  -- Orden 1: ABC123, entregada hace ~2 meses (km 45200).
  v_d60 := pg_temp.dia_habil(v_hoy - 60, -1);
  t := pg_temp.tj(v_d60, 9);
  insert into ordenes (vehiculo_id, cita_id, creada_por, kilometraje, diagnostico, trabajo_realizado,
                       estatus, creado_en, actualizado_en, entregado_en)
  values (v_abc, null, v_emp, 45200,
          'Aceite degradado y filtro saturado.',
          'Cambio de aceite sintético y filtro de aceite. Revisión de niveles.',
          'entregado', t, t + interval '1 day 3 hours', t + interval '1 day 3 hours')
  returning id into v_o1;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o1, null,             'recibido',       v_emp, t),
    (v_o1, 'recibido',       'en_diagnostico', v_emp, t + interval '1 hour'),
    (v_o1, 'en_diagnostico', 'en_reparacion',  v_emp, t + interval '3 hours'),
    (v_o1, 'en_reparacion',  'listo',          v_emp, t + interval '1 day'),
    (v_o1, 'listo',          'entregado',      v_emp, t + interval '1 day 3 hours');

  -- Orden 2: ABC123, entregada hace ~2 semanas (km 46800), nace de la cita atendida.
  t := pg_temp.tj(v_d14, 9) + interval '15 minutes';
  insert into ordenes (vehiculo_id, cita_id, creada_por, kilometraje, diagnostico, trabajo_realizado,
                       estatus, creado_en, actualizado_en, entregado_en)
  values (v_abc, v_cita_at, v_emp, 46800,
          'Balatas delanteras desgastadas al límite; discos en buen estado.',
          'Cambio de balatas delanteras y ajuste de frenos. Prueba de manejo.',
          'entregado', t, t + interval '1 day 2 hours', t + interval '1 day 2 hours')
  returning id into v_o2;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o2, null,             'recibido',       v_emp, t),
    (v_o2, 'recibido',       'en_diagnostico', v_emp, t + interval '45 minutes'),
    (v_o2, 'en_diagnostico', 'en_reparacion',  v_emp, t + interval '2 hours'),
    (v_o2, 'en_reparacion',  'listo',          v_emp, t + interval '1 day'),
    (v_o2, 'listo',          'entregado',      v_emp, t + interval '1 day 2 hours');

  -- Orden 3: XYZ9876, abierta en en_diagnostico (km 78000), sin diagnóstico
  -- todavía: sirve para probar "avanzar a reparación sin diagnóstico".
  insert into ordenes (vehiculo_id, cita_id, creada_por, kilometraje, diagnostico, trabajo_realizado,
                       estatus, creado_en, actualizado_en)
  values (v_xyz, null, v_emp, 78000, null, null,
          'en_diagnostico', now() - interval '5 hours', now() - interval '4 hours')
  returning id into v_o3;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o3, null,       'recibido',       v_emp, now() - interval '5 hours'),
    (v_o3, 'recibido', 'en_diagnostico', v_emp, now() - interval '4 hours');

  -- ---------- 7. Kilometraje del vehículo = máximo de sus órdenes ----------
  update vehiculos v
  set kilometraje = greatest(v.kilometraje, m.km)
  from (select vehiculo_id, max(kilometraje) as km from ordenes group by vehiculo_id) m
  where m.vehiculo_id = v.id and v.cliente_id in (v_c1, v_c2);

  raise notice 'Seed OK: 6 vehiculos, 9 citas, 3 ordenes (hoy Tijuana = %; agenda llena el % a las 10:00).', v_hoy, v_lun;
end $$;
