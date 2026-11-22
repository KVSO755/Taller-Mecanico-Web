import { supabase } from '../lib/supabase'
import { bloquesDelDia, isoDeBloque } from '../utils/horarios'

const CAPACIDAD = 3

// Bloques del día con lugar (< 3 citas activas).
export async function bloquesDisponibles(fechaStr) {
  const bloques = bloquesDelDia(fechaStr)
  if (bloques.length === 0) return []
  const { data, error } = await supabase.rpc('bloques_ocupados', { fecha: fechaStr })
  if (error) throw error
  // Comparar por instante (la BD devuelve el timestamptz en otro formato).
  const ocupadas = new Map((data ?? []).map((f) => [new Date(f.hora).getTime(), f.ocupadas]))
  return bloques.filter((b) => (ocupadas.get(new Date(b.iso).getTime()) ?? 0) < CAPACIDAD)
}

export async function agendarCita({ vehiculoId, fechaHoraIso, motivo }) {
  const { data, error } = await supabase.rpc('agendar_cita', {
    p_vehiculo_id: vehiculoId,
    p_fecha_hora: fechaHoraIso,
    p_motivo: motivo,
  })
  if (error) throw error
  return data
}

export async function misCitas() {
  // Respaldo del cron: se ignora cualquier error.
  try {
    await supabase.rpc('cancelar_citas_vencidas')
  } catch {
    /* ignorado */
  }
  const { data, error } = await supabase
    .from('citas')
    .select('id, fecha_hora, motivo, estatus, cancelada_por, vehiculo:vehiculos(placa, marca, modelo)')
    .order('fecha_hora', { ascending: false })
  if (error) throw error
  return data
}

export async function cancelarCita(id) {
  const { error } = await supabase.rpc('cancelar_cita', { p_cita_id: id })
  if (error) throw error
}

function diaSiguiente(fechaStr) {
  const [a, m, d] = fechaStr.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10)
}

// Citas de un día local (America/Tijuana) 'YYYY-MM-DD'; estatus opcional (null = todas).
export async function citasPorFecha(fechaStr, estatus = null) {
  // Respaldo del cron: se ignora cualquier error.
  try {
    await supabase.rpc('cancelar_citas_vencidas')
  } catch {
    /* ignorado */
  }
  const inicio = isoDeBloque(fechaStr, 0)
  const fin = isoDeBloque(diaSiguiente(fechaStr), 0)
  let q = supabase
    .from('citas')
    .select(
      'id, fecha_hora, motivo, estatus, cancelada_por, cliente:perfiles(nombre, telefono), vehiculo:vehiculos(id, placa, marca, modelo)',
    )
    .gte('fecha_hora', inicio)
    .lt('fecha_hora', fin)
    .order('fecha_hora', { ascending: true })
  if (estatus) q = q.eq('estatus', estatus)
  const { data, error } = await q
  if (error) throw error
  return data
}

// Citas de un rango local (America/Tijuana): desde `inicioFechaStr` (inclusive) hasta
// `finFechaStr` (exclusivo), ambas 'YYYY-MM-DD'.
export async function citasPorRango(inicioFechaStr, finFechaStr) {
  // Respaldo del cron: se ignora cualquier error.
  try {
    await supabase.rpc('cancelar_citas_vencidas')
  } catch {
    /* ignorado */
  }
  const { data, error } = await supabase
    .from('citas')
    .select('id, fecha_hora, estatus, cancelada_por, motivo, vehiculo:vehiculos(placa)')
    .gte('fecha_hora', isoDeBloque(inicioFechaStr, 0))
    .lt('fecha_hora', isoDeBloque(finFechaStr, 0))
    .order('fecha_hora', { ascending: true })
  if (error) throw error
  return data
}

export async function confirmarCita(id) {
  const { error } = await supabase.rpc('confirmar_cita', { p_cita_id: id })
  if (error) throw error
}

export async function reprogramarCita(id, nuevaIso) {
  const { error } = await supabase.rpc('reprogramar_cita', {
    p_cita_id: id,
    p_nueva_fecha_hora: nuevaIso,
  })
  if (error) throw error
}
