-- =====================================================================
-- TallerApp · policies.sql  (paso 3 de 3)
-- Contiene: REVOKE/GRANT por tabla y por columna, y políticas RLS.
-- Orden en el SQL Editor: schema.sql -> functions.sql -> policies.sql
-- Re-ejecutable (revoke/grant idempotentes, drop policy if exists).
--
-- Supabase da ALL a anon y authenticated por defecto: se quita todo y se
-- otorga lo mínimo. RLS filtra filas; los GRANT por columna limitan columnas.
-- Citas, cambios_estatus y los cambios de estado/rol se escriben solo vía
-- funciones rpc (functions.sql). No hay políticas de delete en ninguna tabla.
-- =====================================================================

-- ---------- Privilegios ----------
revoke all on perfiles, vehiculos, citas, ordenes, cambios_estatus from anon, authenticated;
grant select on perfiles, vehiculos, citas, ordenes, cambios_estatus to authenticated;

grant update (nombre, telefono)                          on perfiles  to authenticated;
grant insert (placa, marca, modelo, anio, kilometraje)   on vehiculos to authenticated;  -- cliente_id: default auth.uid()
grant update (marca, modelo, anio)                       on vehiculos to authenticated;
grant update (diagnostico, trabajo_realizado)            on ordenes   to authenticated;

-- El insert de vehiculos usa una columna identity; se otorga uso de su secuencia
-- por seguridad (en identity no siempre se exige, pero no hace daño).
do $$
declare
  v_seq text := pg_get_serial_sequence('public.vehiculos', 'id');
begin
  if v_seq is not null then
    execute format('grant usage on sequence %s to authenticated', v_seq);
  end if;
end $$;

-- ---------- perfiles ----------
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles
  for select to authenticated
  using ((id = auth.uid() and (select public.mi_rol()) is not null)
         or (select public.mi_rol()) in ('empleado','admin'));

drop policy if exists perfiles_update on perfiles;
create policy perfiles_update on perfiles
  for update to authenticated
  using (id = auth.uid() and (select public.mi_rol()) is not null)
  with check (id = auth.uid() and (select public.mi_rol()) is not null);

-- ---------- vehiculos ----------
drop policy if exists vehiculos_select on vehiculos;
create policy vehiculos_select on vehiculos
  for select to authenticated
  using ((cliente_id = auth.uid() and (select public.mi_rol()) = 'cliente')
         or (select public.mi_rol()) in ('empleado','admin'));

drop policy if exists vehiculos_insert on vehiculos;
create policy vehiculos_insert on vehiculos
  for insert to authenticated
  with check (cliente_id = auth.uid() and (select public.mi_rol()) = 'cliente');

drop policy if exists vehiculos_update on vehiculos;
create policy vehiculos_update on vehiculos
  for update to authenticated
  using (cliente_id = auth.uid() and (select public.mi_rol()) = 'cliente')
  with check (cliente_id = auth.uid() and (select public.mi_rol()) = 'cliente');

-- ---------- citas (solo lectura; escritura vía rpc) ----------
drop policy if exists citas_select on citas;
create policy citas_select on citas
  for select to authenticated
  using ((cliente_id = auth.uid() and (select public.mi_rol()) is not null)
         or (select public.mi_rol()) in ('empleado','admin'));

-- ---------- ordenes ----------
drop policy if exists ordenes_select on ordenes;
create policy ordenes_select on ordenes
  for select to authenticated
  using (((select public.mi_rol()) is not null
          and exists (select 1 from vehiculos v
                      where v.id = ordenes.vehiculo_id and v.cliente_id = auth.uid()))
         or (select public.mi_rol()) in ('empleado','admin'));

drop policy if exists ordenes_update on ordenes;
create policy ordenes_update on ordenes
  for update to authenticated
  using ((select public.mi_rol()) in ('empleado','admin') and estatus <> 'entregado')
  with check ((select public.mi_rol()) in ('empleado','admin') and estatus <> 'entregado');

-- ---------- cambios_estatus (solo lectura) ----------
drop policy if exists cambios_estatus_select on cambios_estatus;
create policy cambios_estatus_select on cambios_estatus
  for select to authenticated
  using (((select public.mi_rol()) is not null
          and exists (select 1
                      from ordenes o join vehiculos v on v.id = o.vehiculo_id
                      where o.id = cambios_estatus.orden_id and v.cliente_id = auth.uid()))
         or (select public.mi_rol()) in ('empleado','admin'));
