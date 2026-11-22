import { supabase } from '../lib/supabase'

// Errores de negocio llegan como P0001 (traducirError los muestra tal cual).
export async function solicitarFactura(ordenId, datos) {
  const { data, error } = await supabase.rpc('solicitar_factura', {
    p_orden_id: ordenId,
    p_rfc: datos.rfc,
    p_razon_social: datos.razon_social,
    p_regimen_fiscal: datos.regimen_fiscal,
    p_codigo_postal: datos.codigo_postal,
    p_uso_cfdi: datos.uso_cfdi,
    p_correo: datos.correo,
  })
  if (error) throw error
  return data
}

// Factura con conceptos y orden → vehículo; null si no existe o no es visible.
export async function obtenerFactura(id) {
  const { data, error } = await supabase
    .from('facturas')
    .select(
      '*, conceptos:factura_conceptos(*), orden:ordenes(id, vehiculo:vehiculos(placa, marca, modelo, anio))',
    )
    .eq('id', id)
    .order('id', { referencedTable: 'factura_conceptos', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data
}

// Lista del cliente, la más reciente primero.
export async function misFacturas() {
  const { data, error } = await supabase
    .from('facturas')
    .select('id, folio, emitida_en, total, orden_id, orden:ordenes(vehiculo:vehiculos(placa))')
    .order('emitida_en', { ascending: false })
  if (error) throw error
  return data
}

// { id, folio } de la factura de la orden, o null.
export async function facturaDeOrden(ordenId) {
  const { data, error } = await supabase
    .from('facturas')
    .select('id, folio')
    .eq('orden_id', ordenId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Datos fiscales de la última factura del cliente, o null.
export async function ultimosDatosFiscales() {
  const { data, error } = await supabase
    .from('facturas')
    .select('rfc, razon_social, regimen_fiscal, codigo_postal, uso_cfdi, correo')
    .order('emitida_en', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
