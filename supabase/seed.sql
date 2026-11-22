-- =====================================================================
-- TallerApp · seed.sql  (datos de demo, re-ejecutable)
--
-- PRECONDICIÓN: las 4 cuentas ya se crearon desde /registro de la app
-- (las contraseñas de demo no se publican):
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
-- F10: también borra y recrea las 12 piezas demo (por código) y el catálogo base por
-- marca (por prefijo NIS-, TOY-, MAZ-, VW-, MG-, MIT-, CHE-, HON-, KIA-, HYU-, FOR-, UNI-), sus movimientos y
-- las piezas usadas en las órdenes demo; las existencias finales se calculan
-- sumando los movimientos (siempre cuadran). Se asume que las órdenes demo solo
-- usan piezas demo.
-- F11: también borra las facturas (y sus conceptos) de las órdenes demo y recrea UNA
-- factura de demostración (la orden entregada más antigua de ABC123); la orden entregada
-- más reciente queda SIN factura para que el cliente la pida en la demo.
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

-- F10: registra un movimiento y actualiza las existencias de la pieza (por código).
create or replace function pg_temp.seed_mov(
  p_codigo text, p_tipo tipo_movimiento, p_cant int, p_orden bigint,
  p_motivo text, p_por uuid, p_ts timestamptz)
returns void
language plpgsql
as $$
declare
  v_id bigint;
  v_ex int;
begin
  update piezas set existencias = existencias + p_cant
  where codigo = p_codigo
  returning id, existencias into v_id, v_ex;
  if v_id is null then
    raise exception 'Seed: no existe la pieza %', p_codigo;
  end if;
  insert into movimientos_inventario (pieza_id, tipo, cantidad, existencias_resultantes, orden_id, motivo, hecho_por, creado_en)
  values (v_id, p_tipo, p_cant, v_ex, p_orden, p_motivo, p_por, p_ts);
end;
$$;

-- F10: usa una pieza en una orden (copia el costo) y registra su 'salida'.
create or replace function pg_temp.seed_usar(
  p_orden bigint, p_codigo text, p_cant int, p_por uuid, p_ts timestamptz)
returns void
language plpgsql
as $$
begin
  insert into orden_piezas (orden_id, pieza_id, cantidad, costo_unitario, agregado_por, creado_en)
  select p_orden, z.id, p_cant, z.costo, p_por, p_ts from piezas z where z.codigo = p_codigo;
  perform pg_temp.seed_mov(p_codigo, 'salida', -p_cant, p_orden, null, p_por, p_ts);
end;
$$;

do $$
declare
  v_codigos  text[] := array['FIL-ACE-01','ACE-5W30','BAL-DEL-02','BUJ-NGK-04','FIL-AIR-01','AMO-DEL-01',
                             'BAN-DIS-01','LIQ-FRE-01','BAT-12V-01','DIS-DEL-01','FLT-GAS-01','ACE-ATF-01'];
  -- Catálogo base por marca (prefijos internos de código) y universales.
  v_prefijos text := '^(NIS|TOY|MAZ|VW|MG|MIT|CHE|HON|KIA|HYU|FOR|UNI)-';
  r          record;
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
  v_o4       bigint;
  v_fac      bigint;
  v_sub      numeric(12,2);
  v_iva      numeric(12,2);
  t         timestamptz;
begin
  -- ---------- 1. Buscar cuentas ----------
  foreach v_correo in array array['admin@example.com','empleado@example.com','cliente1@example.com','cliente2@example.com'] loop
    if not exists (select 1 from perfiles where correo = v_correo) then
      raise exception 'Falta la cuenta % : regístrala primero desde /registro y vuelve a ejecutar el seed.', v_correo;
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
  -- F11: facturas primero (referencian órdenes y clientes); los conceptos caen en cascada.
  delete from factura_conceptos
   where factura_id in (select f.id from facturas f
                        where f.cliente_id in (v_c1, v_c2)
                           or f.orden_id in (select o.id from ordenes o join vehiculos v on v.id = o.vehiculo_id
                                             where v.cliente_id in (v_c1, v_c2)));
  delete from facturas
   where cliente_id in (v_c1, v_c2)
      or orden_id in (select o.id from ordenes o join vehiculos v on v.id = o.vehiculo_id
                      where v.cliente_id in (v_c1, v_c2));
  -- F10: inventario primero (movimientos y orden_piezas referencian órdenes y piezas).
  delete from movimientos_inventario
   where orden_id in (select o.id from ordenes o join vehiculos v on v.id = o.vehiculo_id
                      where v.cliente_id in (v_c1, v_c2))
      or pieza_id in (select id from piezas where codigo = any (v_codigos) or codigo ~ v_prefijos);
  delete from orden_piezas
   where orden_id in (select o.id from ordenes o join vehiculos v on v.id = o.vehiculo_id
                      where v.cliente_id in (v_c1, v_c2))
      or pieza_id in (select id from piezas where codigo = any (v_codigos) or codigo ~ v_prefijos);
  delete from piezas where codigo = any (v_codigos) or codigo ~ v_prefijos;

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
  insert into ordenes (vehiculo_id, cita_id, creada_por, asignado_a, kilometraje, diagnostico, trabajo_realizado,
                       mano_obra, estatus, creado_en, actualizado_en, entregado_en)
  values (v_abc, null, v_emp, v_emp, 45200,
          'Aceite degradado y filtro saturado.',
          'Cambio de aceite sintético y filtro de aceite. Revisión de niveles.',
          450.00, 'entregado', t, t + interval '1 day 3 hours', t + interval '1 day 3 hours')
  returning id into v_o1;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o1, null,             'recibido',       v_emp, t),
    (v_o1, 'recibido',       'en_diagnostico', v_emp, t + interval '1 hour'),
    (v_o1, 'en_diagnostico', 'en_reparacion',  v_emp, t + interval '3 hours'),
    (v_o1, 'en_reparacion',  'listo',          v_emp, t + interval '1 day'),
    (v_o1, 'listo',          'entregado',      v_emp, t + interval '1 day 3 hours');

  -- Orden 2: ABC123, entregada hace ~2 semanas (km 46800), nace de la cita atendida.
  t := pg_temp.tj(v_d14, 9) + interval '15 minutes';
  insert into ordenes (vehiculo_id, cita_id, creada_por, asignado_a, kilometraje, diagnostico, trabajo_realizado,
                       mano_obra, estatus, creado_en, actualizado_en, entregado_en)
  values (v_abc, v_cita_at, v_emp, v_emp, 46800,
          'Balatas delanteras desgastadas al límite; discos en buen estado.',
          'Cambio de balatas delanteras y ajuste de frenos. Prueba de manejo.',
          850.00, 'entregado', t, t + interval '1 day 2 hours', t + interval '1 day 2 hours')
  returning id into v_o2;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o2, null,             'recibido',       v_emp, t),
    (v_o2, 'recibido',       'en_diagnostico', v_emp, t + interval '45 minutes'),
    (v_o2, 'en_diagnostico', 'en_reparacion',  v_emp, t + interval '2 hours'),
    (v_o2, 'en_reparacion',  'listo',          v_emp, t + interval '1 day'),
    (v_o2, 'listo',          'entregado',      v_emp, t + interval '1 day 2 hours');

  -- Orden 3: XYZ9876, abierta en en_diagnostico (km 78000) con diagnóstico realista.
  -- (Las pruebas que la necesitan sin diagnóstico lo ponen a null ellas mismas.)
  insert into ordenes (vehiculo_id, cita_id, creada_por, asignado_a, kilometraje, diagnostico, trabajo_realizado,
                       estatus, creado_en, actualizado_en)
  values (v_xyz, null, v_emp, v_emp, 78000, 'Ruido metálico al frenar; balatas traseras al 15 % y disco trasero rayado. Revisar líquido de frenos.', null,
          'en_diagnostico', now() - interval '5 hours', now() - interval '4 hours')
  returning id into v_o3;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o3, null,       'recibido',       v_emp, now() - interval '5 hours'),
    (v_o3, 'recibido', 'en_diagnostico', v_emp, now() - interval '4 hours');

  -- Orden 4 (F09): JKL789 (cliente2), abierta en 'recibido' y SIN ASIGNAR: sirve para
  -- probar "Asignar" como admin y el aviso "sin asignar". (La cita activa de JKL789 es
  -- futura y no está ligada a la orden; no hay conflicto con "una orden abierta por vehículo".)
  insert into ordenes (vehiculo_id, cita_id, creada_por, asignado_a, kilometraje, diagnostico, trabajo_realizado,
                       estatus, creado_en, actualizado_en)
  values (v_jkl, null, v_admin, null, 52300, null, null,
          'recibido', now() - interval '2 hours', now() - interval '2 hours')
  returning id into v_o4;
  insert into cambios_estatus (orden_id, estatus_anterior, estatus_nuevo, cambiado_por, creado_en) values
    (v_o4, null, 'recibido', v_admin, now() - interval '2 hours');

  -- ---------- 6b. Inventario de refacciones (F10) ----------
  -- Piezas con existencias 0; las existencias salen de los movimientos (en orden
  -- cronológico: entradas iniciales, uso en órdenes, ajustes).
  insert into piezas (codigo, nombre, compatibilidad, costo, stock_minimo, activa) values
    ('FIL-ACE-01', 'Filtro de aceite',                  'Nissan Versa 2012–2019, Sentra, March',               145.00,  5, true),
    ('ACE-5W30',   'Aceite sintético 5W-30 (litro)',    'Universal, motores a gasolina',                        98.00, 20, true),
    ('BAL-DEL-02', 'Balatas delanteras (juego)',        'Nissan Versa 2012–2019, March, Tsuru',                520.00,  3, true),
    ('BUJ-NGK-04', 'Bujía NGK iridio',                  'Nissan Versa 2012–2019, Honda Civic 2016–2021, Mazda 3 2014–2019', 185.00, 8, true),
    ('FIL-AIR-01', 'Filtro de aire',                    'Nissan Versa 2012–2019, Toyota Hilux 2016–2020',      210.00,  4, true),
    ('AMO-DEL-01', 'Amortiguador delantero',            'Toyota Hilux 2016–2022',                             1450.00,  2, true),
    ('BAN-DIS-01', 'Banda de distribución (kit)',       'Honda Civic 2016–2021, Nissan Tsuru',                 890.00,  1, true),
    ('LIQ-FRE-01', 'Líquido de frenos DOT 4 (500 ml)',  'Universal',                                            85.00,  6, true),
    ('BAT-12V-01', 'Batería 12V 45Ah',                  'Nissan Versa, March, Chevrolet Aveo',                1890.00,  2, true),
    ('DIS-DEL-01', 'Disco de freno delantero',          'Chevrolet Aveo 2012–2018, Nissan Versa 2012–2019',    640.00,  2, true),
    ('FLT-GAS-01', 'Filtro de gasolina',                'Mazda 3 2014–2019',                                   230.00,  2, true),
    ('ACE-ATF-01', 'Aceite ATF Dexron VI (litro)',      'Transmisiones automáticas Nissan y Toyota',           165.00,  4, false);

  -- Entradas iniciales (hace ~90 días, por el admin).
  t := now() - interval '90 days';
  perform pg_temp.seed_mov('FIL-ACE-01', 'entrada', 20, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('ACE-5W30',   'entrada', 60, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('BAL-DEL-02', 'entrada',  8, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('BUJ-NGK-04', 'entrada', 12, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('FIL-AIR-01', 'entrada',  5, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('AMO-DEL-01', 'entrada',  6, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('BAN-DIS-01', 'entrada',  3, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('LIQ-FRE-01', 'entrada', 15, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('BAT-12V-01', 'entrada',  2, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('DIS-DEL-01', 'entrada',  4, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('FLT-GAS-01', 'entrada',  3, null, 'Existencia inicial', v_admin, t);
  perform pg_temp.seed_mov('ACE-ATF-01', 'entrada', 10, null, 'Existencia inicial', v_admin, t);

  -- Piezas usadas en las órdenes (con su salida): orden 1 y 2 entregadas (ABC123), orden 3 abierta (XYZ9876).
  select creado_en into t from ordenes where id = v_o1;
  perform pg_temp.seed_usar(v_o1, 'FIL-ACE-01', 1, v_emp, t + interval '3 hours');
  perform pg_temp.seed_usar(v_o1, 'ACE-5W30',   4, v_emp, t + interval '3 hours');
  select creado_en into t from ordenes where id = v_o2;
  perform pg_temp.seed_usar(v_o2, 'BAL-DEL-02', 1, v_emp, t + interval '2 hours');
  perform pg_temp.seed_usar(v_o2, 'LIQ-FRE-01', 1, v_emp, t + interval '2 hours');

  -- F11: factura de demostración de la orden 1 (entregada más antigua de ABC123, cliente1).
  -- Conceptos congelados = refacciones usadas de la orden + mano de obra (450.00).
  -- Datos fiscales FICTICIOS (RFC inventado con formato válido de persona física; no es real).
  -- La orden 2 (entregada más reciente) queda sin factura: el cliente la pide en la demo.
  select coalesce(sum(round(cantidad * costo_unitario, 2)), 0) + 450.00 into v_sub
  from orden_piezas where orden_id = v_o1;
  v_iva := round(v_sub * 0.16, 2);
  select entregado_en into t from ordenes where id = v_o1;
  insert into facturas (folio, orden_id, cliente_id, rfc, razon_social, regimen_fiscal, codigo_postal,
                        uso_cfdi, correo, subtotal, iva, total, emitida_en)
  values ('tmp-seed', v_o1, v_c1, 'ACLA850315AB1', 'Ana Cliente Demo (datos ficticios)', '612', '22010',
          'G03', 'cliente1@example.com', v_sub, v_iva, v_sub + v_iva, t + interval '2 days')
  returning id into v_fac;
  update facturas set folio = 'A-' || lpad(id::text, 6, '0') where id = v_fac;
  insert into factura_conceptos (factura_id, descripcion, cantidad, precio_unitario, importe)
  select v_fac, z.nombre || ' (' || z.codigo || ')', op.cantidad, op.costo_unitario,
         round(op.cantidad * op.costo_unitario, 2)
  from orden_piezas op join piezas z on z.id = op.pieza_id
  where op.orden_id = v_o1
  order by z.nombre;
  insert into factura_conceptos (factura_id, descripcion, cantidad, precio_unitario, importe)
  values (v_fac, 'Mano de obra', 1, 450.00, 450.00);

  -- Ajustes manuales (hace ~10 días, con motivo).
  t := now() - interval '10 days';
  perform pg_temp.seed_mov('ACE-5W30',   'ajuste', -2, null, 'Conteo físico: derrame en bodega', v_admin, t);
  perform pg_temp.seed_mov('AMO-DEL-01', 'ajuste', -4, null, 'Devolución a proveedor por defecto de fábrica', v_admin, t);
  perform pg_temp.seed_mov('FLT-GAS-01', 'ajuste', -3, null, 'Conteo físico: sin existencias', v_admin, t);

  -- Orden 3 (abierta, hace pocas horas).
  select creado_en into t from ordenes where id = v_o3;
  perform pg_temp.seed_usar(v_o3, 'FIL-AIR-01', 1, v_emp, t + interval '3 hours');
  perform pg_temp.seed_usar(v_o3, 'LIQ-FRE-01', 1, v_emp, t + interval '3 hours');

  -- Resultado: FIL-ACE-01 19/5 · ACE-5W30 54/20 · BAL-DEL-02 7/3 · BUJ-NGK-04 12/8 ·
  -- FIL-AIR-01 4/4 (bajo) · AMO-DEL-01 2/2 (bajo) · BAN-DIS-01 3/1 · LIQ-FRE-01 13/6 ·
  -- BAT-12V-01 2/2 (bajo) · DIS-DEL-01 4/2 · FLT-GAS-01 0/2 (agotada) · ACE-ATF-01 10/4 (inactiva).

  -- Catálogo base por marca + consumibles universales (F10).
  -- Precios y compatibilidades aproximados para demostración; no son un catálogo de proveedor.
  -- Códigos internos (no son números de parte de fabricante). Columnas: código, nombre,
  -- compatibilidad, costo MXN, stock mínimo, existencia inicial.
  -- Las existencias salen de la entrada inicial (hace ~90 días, por el admin).
  for r in
    select * from (values
      -- Nissan
      ('NIS-FIL-ACE', 'Filtro de aceite Nissan',                       'Nissan Versa 2012–2024, Sentra 2013–2024, March 2012–2021, Kicks 2017–2024, NP300 2009–2024', 165.00, 6, 18),
      ('NIS-FIL-AIR', 'Filtro de aire de motor Nissan',                'Nissan Versa 2012–2024, Sentra 2013–2024, March 2012–2021, Kicks 2017–2024, NP300 gasolina 2009–2024', 285.00, 5, 12),
      ('NIS-FIL-CAB', 'Filtro de aire de cabina (A/C) Nissan',         'Nissan Versa 2015–2024, Sentra 2013–2024, March 2012–2021, Kicks 2017–2024', 220.00, 4, 4),
      ('NIS-BAL-DEL', 'Balatas delanteras (juego) Nissan',             'Nissan Versa 2012–2024, Sentra 2013–2024, March 2012–2021, Kicks 2017–2024', 690.00, 4, 9),
      ('NIS-BUJ',     'Bujías (juego de 4) Nissan',                    'Nissan Versa 2012–2024, Sentra 2013–2024, March 2012–2021, Kicks 2017–2024, NP300 gasolina 2009–2024', 520.00, 4, 10),
      ('NIS-FIL-DIE', 'Filtro de combustible diésel Nissan',           'Nissan NP300 diésel 2016–2024', 520.00, 2, 3),
      -- Toyota
      ('TOY-FIL-ACE', 'Filtro de aceite Toyota',                       'Toyota Corolla 2009–2024, Yaris 2007–2023, Hilux 2005–2024, RAV4 2006–2024, Avanza 2012–2024', 190.00, 6, 16),
      ('TOY-FIL-AIR', 'Filtro de aire de motor Toyota',                'Toyota Corolla 2009–2024, Yaris 2007–2023, Hilux 2005–2024, RAV4 2006–2024, Avanza 2012–2024', 340.00, 5, 11),
      ('TOY-FIL-CAB', 'Filtro de aire de cabina (A/C) Toyota',         'Toyota Corolla 2014–2024, Yaris 2015–2023, Hilux 2016–2024, RAV4 2013–2024, Avanza 2012–2024', 250.00, 4, 3),
      ('TOY-BAL-DEL', 'Balatas delanteras (juego) Toyota',             'Toyota Corolla 2009–2024, Yaris 2007–2023, Hilux 2005–2024, RAV4 2006–2024, Avanza 2012–2024', 880.00, 4, 7),
      ('TOY-BUJ',     'Bujías (juego de 4) Toyota',                    'Toyota Corolla 2009–2024, Yaris 2007–2023, RAV4 2006–2024, Avanza 2012–2024, Hilux gasolina 2005–2024', 780.00, 4, 8),
      ('TOY-FIL-DIE', 'Filtro de combustible diésel Toyota',           'Toyota Hilux diésel 2016–2024', 690.00, 2, 4),
      -- Mazda
      ('MAZ-FIL-ACE', 'Filtro de aceite Mazda',                        'Mazda 2 2010–2024, Mazda 3 2010–2024, CX-3 2016–2022, CX-5 2013–2024, CX-30 2020–2024', 175.00, 4, 8),
      ('MAZ-FIL-AIR', 'Filtro de aire de motor Mazda',                 'Mazda 2 2010–2024, Mazda 3 2010–2024, CX-3 2016–2022, CX-5 2013–2024, CX-30 2020–2024', 310.00, 3, 6),
      ('MAZ-FIL-CAB', 'Filtro de aire de cabina (A/C) Mazda',          'Mazda 2 2015–2024, Mazda 3 2014–2024, CX-3 2016–2022, CX-5 2013–2024, CX-30 2020–2024', 260.00, 3, 5),
      ('MAZ-BAL-DEL', 'Balatas delanteras (juego) Mazda',              'Mazda 2 2010–2024, Mazda 3 2010–2024, CX-3 2016–2022, CX-5 2013–2024, CX-30 2020–2024', 920.00, 3, 3),
      ('MAZ-BUJ',     'Bujías (juego de 4) Mazda',                     'Mazda 2 2010–2024, Mazda 3 2010–2024, CX-3 2016–2022, CX-5 2013–2024, CX-30 2020–2024', 860.00, 3, 6),
      -- Volkswagen
      ('VW-FIL-ACE',  'Filtro de aceite Volkswagen',                   'Volkswagen Jetta 2011–2024, Vento 2014–2021, Virtus 2019–2024, Polo 2019–2024, T-Cross 2020–2024, Tiguan 2012–2024', 210.00, 6, 14),
      ('VW-FIL-AIR',  'Filtro de aire de motor Volkswagen',            'Volkswagen Jetta 2011–2024, Vento 2014–2021, Virtus 2019–2024, Polo 2019–2024, T-Cross 2020–2024, Tiguan 2012–2024', 330.00, 4, 9),
      ('VW-FIL-CAB',  'Filtro de aire de cabina (A/C) Volkswagen',     'Volkswagen Jetta 2011–2024, Vento 2014–2021, Virtus 2019–2024, Polo 2019–2024, T-Cross 2020–2024, Tiguan 2012–2024', 270.00, 4, 7),
      ('VW-BAL-DEL',  'Balatas delanteras (juego) Volkswagen',         'Volkswagen Jetta 2011–2024, Vento 2014–2021, Virtus 2019–2024, Polo 2019–2024, T-Cross 2020–2024, Tiguan 2012–2024', 980.00, 4, 8),
      ('VW-BUJ',      'Bujías (juego de 4) Volkswagen',                'Volkswagen Jetta 2011–2024, Vento 2014–2021, Virtus 2019–2024, Polo 2019–2024, T-Cross 2020–2024, Tiguan 2012–2024', 950.00, 4, 5),
      -- MG
      ('MG-FIL-ACE',  'Filtro de aceite MG',                           'MG MG5 2020–2024, MG ZS 2019–2024, MG HS 2020–2024, MG RX5 2018–2022', 230.00, 3, 4),
      ('MG-FIL-AIR',  'Filtro de aire de motor MG',                    'MG MG5 2020–2024, MG ZS 2019–2024, MG HS 2020–2024, MG RX5 2018–2022', 380.00, 2, 3),
      ('MG-FIL-CAB',  'Filtro de aire de cabina (A/C) MG',             'MG MG5 2020–2024, MG ZS 2019–2024, MG HS 2020–2024, MG RX5 2018–2022', 320.00, 2, 2),
      ('MG-BAL-DEL',  'Balatas delanteras (juego) MG',                 'MG MG5 2020–2024, MG ZS 2019–2024, MG HS 2020–2024, MG RX5 2018–2022', 1150.00, 2, 3),
      ('MG-BUJ',      'Bujías (juego de 4) MG',                        'MG MG5 2020–2024, MG ZS 2019–2024, MG HS 2020–2024, MG RX5 2018–2022', 1050.00, 2, 3),
      -- Mitsubishi
      ('MIT-FIL-ACE', 'Filtro de aceite Mitsubishi',                   'Mitsubishi Mirage 2014–2024, Mirage G4 2017–2024, L200 2006–2024, Outlander 2014–2024, Xpander 2019–2024', 185.00, 3, 5),
      ('MIT-FIL-AIR', 'Filtro de aire de motor Mitsubishi',            'Mitsubishi Mirage 2014–2024, Mirage G4 2017–2024, L200 2006–2024, Outlander 2014–2024, Xpander 2019–2024', 320.00, 2, 3),
      ('MIT-FIL-CAB', 'Filtro de aire de cabina (A/C) Mitsubishi',     'Mitsubishi Mirage 2014–2024, Mirage G4 2017–2024, L200 2015–2024, Outlander 2014–2024, Xpander 2019–2024', 280.00, 2, 2),
      ('MIT-BAL-DEL', 'Balatas delanteras (juego) Mitsubishi',         'Mitsubishi Mirage 2014–2024, Mirage G4 2017–2024, L200 2006–2024, Outlander 2014–2024, Xpander 2019–2024', 960.00, 2, 4),
      ('MIT-BUJ',     'Bujías (juego de 4) Mitsubishi',                'Mitsubishi Mirage 2014–2024, Mirage G4 2017–2024, Outlander 2014–2024, Xpander 2019–2024', 840.00, 2, 2),
      ('MIT-FIL-DIE', 'Filtro de combustible diésel Mitsubishi',       'Mitsubishi L200 diésel 2006–2024', 740.00, 2, 3),
      -- Chevrolet
      ('CHE-FIL-ACE', 'Filtro de aceite Chevrolet',                    'Chevrolet Aveo 2008–2024, Onix 2020–2024, Beat 2018–2024, Tracker 2020–2024, S10 Max 2020–2024', 140.00, 6, 15),
      ('CHE-FIL-AIR', 'Filtro de aire de motor Chevrolet',             'Chevrolet Aveo 2008–2024, Onix 2020–2024, Beat 2018–2024, Tracker 2020–2024, S10 Max 2020–2024', 220.00, 5, 10),
      ('CHE-FIL-CAB', 'Filtro de aire de cabina (A/C) Chevrolet',      'Chevrolet Aveo 2012–2024, Onix 2020–2024, Beat 2018–2024, Tracker 2020–2024, S10 Max 2020–2024', 190.00, 4, 6),
      ('CHE-BAL-DEL', 'Balatas delanteras (juego) Chevrolet',          'Chevrolet Aveo 2008–2024, Onix 2020–2024, Beat 2018–2024, Tracker 2020–2024, S10 Max 2020–2024', 560.00, 4, 9),
      ('CHE-BUJ',     'Bujías (juego de 4) Chevrolet',                 'Chevrolet Aveo 2008–2024, Onix 2020–2024, Beat 2018–2024, Tracker 2020–2024, S10 Max gasolina 2020–2024', 390.00, 4, 4),
      ('CHE-FIL-DIE', 'Filtro de combustible diésel Chevrolet',        'Chevrolet S10 Max diésel 2020–2024', 620.00, 2, 3),
      -- Honda
      ('HON-FIL-ACE', 'Filtro de aceite Honda',                        'Honda Civic 2012–2024, City 2014–2024, HR-V 2016–2024, CR-V 2012–2024', 195.00, 4, 9),
      ('HON-FIL-AIR', 'Filtro de aire de motor Honda',                 'Honda Civic 2012–2024, City 2014–2024, HR-V 2016–2024, CR-V 2012–2024', 360.00, 3, 6),
      ('HON-FIL-CAB', 'Filtro de aire de cabina (A/C) Honda',          'Honda Civic 2012–2024, City 2014–2024, HR-V 2016–2024, CR-V 2012–2024', 290.00, 3, 5),
      ('HON-BAL-DEL', 'Balatas delanteras (juego) Honda',              'Honda Civic 2012–2024, City 2014–2024, HR-V 2016–2024, CR-V 2012–2024', 1080.00, 3, 5),
      ('HON-BUJ',     'Bujías (juego de 4) Honda',                     'Honda Civic 2012–2024, City 2014–2024, HR-V 2016–2024, CR-V 2012–2024', 980.00, 3, 3),
      -- Kia
      ('KIA-FIL-ACE', 'Filtro de aceite Kia',                          'Kia Rio 2012–2024, Forte 2014–2024, Seltos 2021–2024, Sportage 2011–2024', 170.00, 4, 7),
      ('KIA-FIL-AIR', 'Filtro de aire de motor Kia',                   'Kia Rio 2012–2024, Forte 2014–2024, Seltos 2021–2024, Sportage 2011–2024', 300.00, 3, 5),
      ('KIA-FIL-CAB', 'Filtro de aire de cabina (A/C) Kia',            'Kia Rio 2012–2024, Forte 2014–2024, Seltos 2021–2024, Sportage 2011–2024', 245.00, 3, 4),
      ('KIA-BAL-DEL', 'Balatas delanteras (juego) Kia',                'Kia Rio 2012–2024, Forte 2014–2024, Seltos 2021–2024, Sportage 2011–2024', 840.00, 3, 6),
      ('KIA-BUJ',     'Bujías (juego de 4) Kia',                       'Kia Rio 2012–2024, Forte 2014–2024, Seltos 2021–2024, Sportage 2011–2024', 720.00, 3, 5),
      -- Hyundai
      ('HYU-FIL-ACE', 'Filtro de aceite Hyundai',                      'Hyundai Accent 2012–2024, Grand i10 2014–2024, Creta 2018–2024, Tucson 2012–2024', 160.00, 4, 8),
      ('HYU-FIL-AIR', 'Filtro de aire de motor Hyundai',               'Hyundai Accent 2012–2024, Grand i10 2014–2024, Creta 2018–2024, Tucson 2012–2024', 280.00, 3, 6),
      ('HYU-FIL-CAB', 'Filtro de aire de cabina (A/C) Hyundai',        'Hyundai Accent 2012–2024, Grand i10 2014–2024, Creta 2018–2024, Tucson 2012–2024', 235.00, 3, 5),
      ('HYU-BAL-DEL', 'Balatas delanteras (juego) Hyundai',            'Hyundai Accent 2012–2024, Grand i10 2014–2024, Creta 2018–2024, Tucson 2012–2024', 790.00, 3, 3),
      ('HYU-BUJ',     'Bujías (juego de 4) Hyundai',                   'Hyundai Accent 2012–2024, Grand i10 2014–2024, Creta 2018–2024, Tucson 2012–2024', 680.00, 3, 6),
      -- Ford
      ('FOR-FIL-ACE', 'Filtro de aceite Ford',                         'Ford Ranger 2012–2024, Figo 2015–2021, Territory 2020–2024, Escape 2013–2024', 180.00, 5, 10),
      ('FOR-FIL-AIR', 'Filtro de aire de motor Ford',                  'Ford Ranger 2012–2024, Figo 2015–2021, Territory 2020–2024, Escape 2013–2024', 310.00, 4, 4),
      ('FOR-FIL-CAB', 'Filtro de aire de cabina (A/C) Ford',           'Ford Ranger 2012–2024, Figo 2015–2021, Territory 2020–2024, Escape 2013–2024', 260.00, 3, 5),
      ('FOR-BAL-DEL', 'Balatas delanteras (juego) Ford',               'Ford Ranger 2012–2024, Figo 2015–2021, Territory 2020–2024, Escape 2013–2024', 900.00, 3, 6),
      ('FOR-BUJ',     'Bujías (juego de 4) Ford',                      'Ford Ranger gasolina 2012–2024, Figo 2015–2021, Territory 2020–2024, Escape 2013–2024', 820.00, 3, 7),
      ('FOR-FIL-DIE', 'Filtro de combustible diésel Ford',             'Ford Ranger diésel 2019–2024', 780.00, 2, 4),
      -- Universales
      ('UNI-ACE-5W20', 'Aceite 5W-20 (litro)',                         'Universal, motores a gasolina que piden 5W-20', 105.00, 20, 48),
      ('UNI-ACE-0W20', 'Aceite sintético 0W-20 (litro)',               'Universal, motores a gasolina que piden 0W-20', 165.00, 16, 14),
      ('UNI-ANT-5050', 'Anticongelante 50/50 (galón)',                 'Universal', 210.00, 6, 12),
      ('UNI-LIM-PAR',  'Limpiaparabrisas (par)',                       'Universal', 190.00, 6, 15)
    ) as c(codigo, nombre, compatibilidad, costo, stock_minimo, inicial)
  loop
    insert into piezas (codigo, nombre, compatibilidad, costo, stock_minimo, activa)
    values (r.codigo, r.nombre, r.compatibilidad, r.costo, r.stock_minimo, true);
    perform pg_temp.seed_mov(r.codigo, 'entrada', r.inicial, null, 'Existencia inicial', v_admin, now() - interval '90 days');
  end loop;

  -- Dos piezas del catálogo quedan agotadas tras un conteo físico (hace ~10 días).
  t := now() - interval '10 days';
  perform pg_temp.seed_mov('MIT-FIL-CAB', 'ajuste', -2, null, 'Conteo físico: sin existencias', v_admin, t);
  perform pg_temp.seed_mov('HYU-BAL-DEL', 'ajuste', -3, null, 'Conteo físico: sin existencias', v_admin, t);

  -- Catálogo: 64 piezas. Bajo stock (existencias <= mínimo): NIS-FIL-CAB 4/4, TOY-FIL-CAB 3/4,
  -- MAZ-BAL-DEL 3/3, MG-FIL-CAB 2/2, MIT-BUJ 2/2, CHE-BUJ 4/4, HON-BUJ 3/3, FOR-FIL-AIR 4/4,
  -- UNI-ACE-0W20 14/16. Agotadas: MIT-FIL-CAB 0/2, HYU-BAL-DEL 0/3.

  -- ---------- 7. Kilometraje del vehículo = máximo de sus órdenes ----------
  update vehiculos v
  set kilometraje = greatest(v.kilometraje, m.km)
  from (select vehiculo_id, max(kilometraje) as km from ordenes group by vehiculo_id) m
  where m.vehiculo_id = v.id and v.cliente_id in (v_c1, v_c2);

  raise notice 'Seed OK: 6 vehiculos, 9 citas, 4 ordenes (1 abierta sin asignar en JKL789; 1 factura demo en la orden entregada más antigua de ABC123), 76 piezas con movimientos (12 demo + 64 de catálogo base por marca); hoy Tijuana = %; agenda llena el % a las 10:00.', v_hoy, v_lun;
end $$;
