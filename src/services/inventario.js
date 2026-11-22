import { supabase } from '../lib/supabase'
import { MARCA_UNIVERSAL, terminoDeModelo } from '../utils/catalogoVehiculos'

const COLUMNAS_PIEZA =
  'id, codigo, nombre, compatibilidad, costo, existencias, stock_minimo, activa, creado_en, actualizado_en'

// Quita lo que rompe la sintaxis de .or() y escapa los comodines de ilike.
function limpiarBusqueda(texto) {
  return texto
    .replace(/[,()"\\]/g, ' ')
    .replace(/[%_]/g, (c) => `\\${c}`)
    .trim()
}

const esBajo = (p) => p.activa && p.existencias <= p.stock_minimo

// filtro: 'todas' | 'bajo' (activas con existencias <= mínimo, incluye agotadas) | 'inactivas'.
// marca/modelo: textos del catálogo de vehículos; filtran por `compatibilidad` (Universal incluye códigos UNI-).
export async function listarPiezas({ busqueda = '', filtro = 'todas', marca = '', modelo = '' } = {}) {
  let q = supabase.from('piezas').select(COLUMNAS_PIEZA)
  if (filtro === 'inactivas') q = q.eq('activa', false)
  else if (filtro === 'bajo') q = q.eq('activa', true)
  const termino = limpiarBusqueda(busqueda)
  if (termino) {
    const p = `"%${termino}%"`
    q = q.or(`codigo.ilike.${p},nombre.ilike.${p},compatibilidad.ilike.${p}`)
  }
  if (marca === MARCA_UNIVERSAL) {
    q = q.or('compatibilidad.ilike."%universal%",codigo.ilike."UNI-%"')
  } else if (marca) {
    const m = limpiarBusqueda(marca)
    if (m) q = q.ilike('compatibilidad', `%${m}%`)
    const t = modelo && terminoDeModelo(marca, modelo)
    if (t) q = q.ilike('compatibilidad', `%${limpiarBusqueda(t)}%`)
  }
  const { data, error } = await q.order('nombre', { ascending: true })
  if (error) throw error
  // PostgREST no compara dos columnas: "bajo" se resuelve aquí.
  return filtro === 'bajo' ? data.filter(esBajo) : data
}

// Pieza con sus movimientos (más reciente primero); null si no existe.
export async function obtenerPieza(id) {
  const { data, error } = await supabase
    .from('piezas')
    .select(
      `${COLUMNAS_PIEZA}, movimientos:movimientos_inventario(id, tipo, cantidad, existencias_resultantes, orden_id, motivo, creado_en, hecho:perfiles(nombre))`,
    )
    .eq('id', id)
    .order('creado_en', { referencedTable: 'movimientos_inventario', ascending: false })
    .order('id', { referencedTable: 'movimientos_inventario', ascending: false })
    .maybeSingle()
  if (error) throw error
  return data
}

export async function crearPieza({ codigo, nombre, compatibilidad, costo, existencias, stock_minimo }) {
  const { data, error } = await supabase.rpc('crear_pieza', {
    p_codigo: codigo,
    p_nombre: nombre,
    p_compatibilidad: compatibilidad?.trim() ? compatibilidad.trim() : null,
    p_costo: costo,
    p_existencias: existencias,
    p_stock_minimo: stock_minimo,
  })
  if (error) throw error
  return data
}

// Update directo solo de las columnas permitidas; sin filas afectadas = no existe o sin permiso.
export async function actualizarPieza(id, { nombre, compatibilidad, costo, stock_minimo, activa }) {
  const { data, error } = await supabase
    .from('piezas')
    .update({
      nombre,
      compatibilidad: compatibilidad?.trim() ? compatibilidad.trim() : null,
      costo,
      stock_minimo,
      activa,
    })
    .eq('id', id)
    .select(COLUMNAS_PIEZA)
  if (error) throw error
  if (!data || data.length === 0) throw new Error('sin cambios')
  return data[0]
}

export async function registrarEntrada(id, cantidad, motivo) {
  const { data, error } = await supabase.rpc('registrar_entrada', {
    p_pieza_id: id,
    p_cantidad: cantidad,
    p_motivo: motivo?.trim() ? motivo.trim() : null,
  })
  if (error) throw error
  return data
}

export async function ajustarExistencias(id, nuevas, motivo) {
  const { data, error } = await supabase.rpc('ajustar_existencias', {
    p_pieza_id: id,
    p_nuevas: nuevas,
    p_motivo: motivo,
  })
  if (error) throw error
  return data
}

// Piezas activas con existencias <= mínimo (incluye agotadas).
export async function contarBajoStock() {
  const { data, error } = await supabase
    .from('piezas')
    .select('existencias, stock_minimo, activa')
    .eq('activa', true)
  if (error) throw error
  return data.filter(esBajo).length
}

// Taller: piezas de una orden con costo unitario.
export async function piezasDeOrden(ordenId) {
  const { data, error } = await supabase
    .from('orden_piezas')
    .select('id, pieza_id, cantidad, costo_unitario, creado_en, pieza:piezas(codigo, nombre)')
    .eq('orden_id', ordenId)
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function usarPiezaEnOrden(ordenId, piezaId, cantidad) {
  const { data, error } = await supabase.rpc('usar_pieza_en_orden', {
    p_orden_id: ordenId,
    p_pieza_id: piezaId,
    p_cantidad: cantidad,
  })
  if (error) throw error
  return data
}

export async function quitarPiezaDeOrden(id) {
  const { error } = await supabase.rpc('quitar_pieza_de_orden', { p_orden_pieza_id: id })
  if (error) throw error
}

// Cliente (y taller): nombre, código y cantidad, sin costos.
export async function piezasUsadas(ordenId) {
  const { data, error } = await supabase.rpc('piezas_usadas', { p_orden_id: ordenId })
  if (error) throw error
  return data ?? []
}
