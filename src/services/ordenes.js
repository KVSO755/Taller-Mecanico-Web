import { supabase } from '../lib/supabase'
import { normalizarPlaca } from '../utils/placa'

const COLUMNAS_ORDEN =
  'id, vehiculo_id, cita_id, kilometraje, diagnostico, trabajo_realizado, mano_obra, estatus, asignado_a, creado_en, actualizado_en, entregado_en'

// ordenes tiene dos FKs a perfiles: todo embed necesita hint.
const EMBED_ASIGNADO = 'asignado:perfiles!ordenes_asignado_a_fkey(id, nombre)'

// --- F06 ---

// Devuelve la orden creada. Errores de negocio llegan como P0001 (traducirError).
export async function crearOrden({ vehiculoId, citaId, kilometraje, diagnostico, asignadoA }) {
  const params = {
    p_vehiculo_id: vehiculoId,
    p_cita_id: citaId ?? null,
    p_kilometraje: kilometraje,
    p_diagnostico: diagnostico?.trim() ? diagnostico.trim() : null,
  }
  if (asignadoA) params.p_asignado_a = asignadoA
  const { data, error } = await supabase.rpc('crear_orden', params)
  if (error) throw error
  return data
}

// Devuelve null si no existe ninguna placa igual.
export async function buscarVehiculoPorPlaca(placa) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, placa, marca, modelo, anio, kilometraje, cliente:perfiles(nombre, telefono)')
    .eq('placa', normalizarPlaca(placa))
    .maybeSingle()
  if (error) throw error
  return data
}

// Cita con su vehículo y cliente; null si no existe.
export async function obtenerCitaParaOrden(citaId) {
  const { data, error } = await supabase
    .from('citas')
    .select(
      'id, fecha_hora, motivo, estatus, vehiculo:vehiculos(id, placa, marca, modelo, anio, kilometraje), cliente:perfiles(nombre, telefono)',
    )
    .eq('id', citaId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Id de la orden abierta del vehículo, o null.
export async function ordenAbiertaDeVehiculo(vehiculoId) {
  const { data, error } = await supabase
    .from('ordenes')
    .select('id')
    .eq('vehiculo_id', vehiculoId)
    .neq('estatus', 'entregado')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

// Próxima cita activa (pendiente/confirmada) en el futuro, o null.
export async function citaActivaDeVehiculo(vehiculoId) {
  const { data, error } = await supabase
    .from('citas')
    .select('id, fecha_hora, estatus')
    .eq('vehiculo_id', vehiculoId)
    .in('estatus', ['pendiente', 'confirmada'])
    .gt('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// --- F07 ---

// filtro: 'abiertas' (default, más antigua primero) | 'mis' (abiertas asignadas a usuarioId)
// | 'sin_asignar' (abiertas sin mecánico) | estatus concreto (incluye 'entregado', más reciente primero).
export async function listarOrdenes(filtro = 'abiertas', { usuarioId } = {}) {
  let q = supabase
    .from('ordenes')
    .select(
      `id, estatus, kilometraje, diagnostico, asignado_a, creado_en, entregado_en, ${EMBED_ASIGNADO}, vehiculo:vehiculos(id, placa, marca, modelo, anio, cliente:perfiles(nombre)), cita:citas(motivo)`,
    )
  const abiertas = filtro === 'abiertas' || filtro === 'mis' || filtro === 'sin_asignar'
  if (abiertas) q = q.neq('estatus', 'entregado')
  else q = q.eq('estatus', filtro)
  if (filtro === 'mis') q = q.eq('asignado_a', usuarioId ?? '')
  if (filtro === 'sin_asignar') q = q.is('asignado_a', null)
  q = q.order('creado_en', { ascending: abiertas ? true : filtro !== 'entregado' })
  const { data, error } = await q
  if (error) throw error
  return data
}

// Orden con vehículo, cliente, motivo de la cita y bitácora; null si no existe.
export async function obtenerOrden(id) {
  const { data, error } = await supabase
    .from('ordenes')
    .select(
      `${COLUMNAS_ORDEN}, ${EMBED_ASIGNADO}, vehiculo:vehiculos(id, placa, marca, modelo, anio, kilometraje, cliente:perfiles(nombre, telefono)), cita:citas(motivo), cambios:cambios_estatus(id, estatus_anterior, estatus_nuevo, creado_en, por:perfiles(nombre))`,
    )
    .eq('id', id)
    .order('creado_en', { referencedTable: 'cambios_estatus', ascending: true })
    .order('id', { referencedTable: 'cambios_estatus', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data
}

// Update directo de las columnas permitidas. Si no afecta filas, la orden ya está cerrada.
// mano_obra: número >= 0 o null (omitirla no la modifica).
export async function guardarNotas(id, { diagnostico, trabajo_realizado, mano_obra }) {
  const cambios = { diagnostico: diagnostico?.trim() || null, trabajo_realizado: trabajo_realizado?.trim() || null }
  if (mano_obra !== undefined) cambios.mano_obra = mano_obra
  const { data, error } = await supabase
    .from('ordenes')
    .update(cambios)
    .eq('id', id)
    .select('id, diagnostico, trabajo_realizado, mano_obra')
  if (error) throw error
  if (!data || data.length === 0) {
    const e = new Error('Orden cerrada.')
    e.code = 'P0001'
    throw e
  }
  return data[0]
}

export async function avanzarEstatus(id, estatusEsperado) {
  const { data, error } = await supabase.rpc('avanzar_estatus_orden', {
    p_orden_id: id,
    p_estatus_esperado: estatusEsperado,
  })
  if (error) throw error
  return data
}

// Id de la orden ligada a una cita, o null.
export async function ordenDeCita(citaId) {
  const { data, error } = await supabase.from('ordenes').select('id').eq('cita_id', citaId).maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

// admin: asigna o reasigna (empleadoId null quita la asignación).
export async function asignarOrden(ordenId, empleadoId) {
  const { data, error } = await supabase.rpc('asignar_orden', {
    p_orden_id: ordenId,
    p_empleado_id: empleadoId || null,
  })
  if (error) throw error
  return data
}

// Nombre del mecánico asignado (visible para el taller y el dueño del vehículo); null si no hay.
export async function nombreMecanico(ordenId) {
  const { data, error } = await supabase.rpc('nombre_mecanico', { p_orden_id: ordenId })
  if (error) throw error
  return data ?? null
}

export async function contarSinAsignar() {
  const { count, error } = await supabase
    .from('ordenes')
    .select('id', { count: 'exact', head: true })
    .neq('estatus', 'entregado')
    .is('asignado_a', null)
  if (error) throw error
  return count ?? 0
}

// Mapa { empleadoId: n } de órdenes abiertas por mecánico.
export async function contarAbiertasPorMecanico() {
  const { data, error } = await supabase
    .from('ordenes')
    .select('asignado_a')
    .neq('estatus', 'entregado')
    .not('asignado_a', 'is', null)
  if (error) throw error
  const mapa = {}
  for (const o of data) mapa[o.asignado_a] = (mapa[o.asignado_a] ?? 0) + 1
  return mapa
}
