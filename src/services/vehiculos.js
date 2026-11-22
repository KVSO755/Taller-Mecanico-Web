import { supabase } from '../lib/supabase'

const COLUMNAS = 'id, placa, marca, modelo, anio, kilometraje'

export async function listarMisVehiculos() {
  const { data, error } = await supabase
    .from('vehiculos')
    .select(`${COLUMNAS}, ordenes(id, estatus, actualizado_en)`)
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

// cliente_id no se envía: lo pone el default auth.uid() en la BD.
export async function crearVehiculo({ placa, marca, modelo, anio, kilometraje }) {
  const { data, error } = await supabase
    .from('vehiculos')
    .insert({ placa, marca, modelo, anio, kilometraje })
    .select(COLUMNAS)
    .single()
  if (error) throw error
  return data
}

// Solo marca, modelo y año son editables por el cliente.
export async function actualizarVehiculo(id, { marca, modelo, anio }) {
  const { data, error } = await supabase
    .from('vehiculos')
    .update({ marca, modelo, anio })
    .eq('id', id)
    .select(COLUMNAS)
    .maybeSingle()
  if (error) throw error
  return data
}

// Devuelve null si no existe o no es del cliente (RLS).
export async function obtenerVehiculo(id) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// F08: vehículo (+ dueño) y todas sus órdenes con cita y bitácora, en una consulta.
// Devuelve null si no existe o no es visible (RLS).
export async function historialVehiculo(id) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select(
      `${COLUMNAS}, cliente:perfiles(nombre, telefono), ordenes(id, estatus, kilometraje, diagnostico, trabajo_realizado, creado_en, entregado_en, actualizado_en, cita:citas(motivo), factura:facturas(id, folio), cambios:cambios_estatus(estatus_anterior, estatus_nuevo, creado_en))`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}
