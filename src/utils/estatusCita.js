import { hoyEnTaller } from './horarios'

// Día local (America/Tijuana) de un instante, 'YYYY-MM-DD'.
export function diaLocal(iso) {
  return hoyEnTaller(new Date(iso))
}

// Etiqueta y tono de una cita vista por el taller (3a persona).
export function etiquetaTaller(c) {
  if (c.estatus === 'pendiente') return { texto: 'Pendiente', tono: 'amarillo' }
  if (c.estatus === 'confirmada') {
    if (diaLocal(c.fecha_hora) < hoyEnTaller()) return { texto: 'No se presentó', tono: 'gris' }
    return { texto: 'Confirmada', tono: 'verde' }
  }
  if (c.estatus === 'cancelada') {
    const texto =
      c.cancelada_por === 'cliente'
        ? 'Cancelada por el cliente'
        : c.cancelada_por === 'taller'
          ? 'Cancelada por el taller'
          : 'Cancelada: no se confirmó a tiempo'
    return { texto, tono: 'rojo' }
  }
  if (c.estatus === 'atendida') return { texto: 'Atendida', tono: 'azul' }
  return { texto: c.estatus, tono: 'gris' }
}

// Etiqueta y tono de una cita vista por el cliente (2a persona).
export function etiquetaCliente(c) {
  if (c.estatus === 'pendiente') return { texto: 'Pendiente de confirmar', tono: 'amarillo' }
  if (c.estatus === 'confirmada') {
    // Confirmada de un día anterior a hoy (Tijuana): el cliente no llegó. Solo visual.
    if (diaLocal(c.fecha_hora) < hoyEnTaller()) return { texto: 'No se presentó', tono: 'gris' }
    return { texto: 'Confirmada', tono: 'verde' }
  }
  if (c.estatus === 'cancelada') {
    const texto =
      c.cancelada_por === 'cliente'
        ? 'Cancelada por ti'
        : c.cancelada_por === 'taller'
          ? 'Cancelada por el taller'
          : 'Cancelada: no se confirmó a tiempo'
    return { texto, tono: 'rojo' }
  }
  if (c.estatus === 'atendida') return { texto: 'Atendida', tono: 'azul' }
  return { texto: c.estatus, tono: 'gris' }
}
