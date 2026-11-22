// Ciclo de estatus de una orden, en orden.
export const PASOS_ORDEN = ['recibido', 'en_diagnostico', 'en_reparacion', 'listo', 'entregado']

export const ETIQUETAS_ORDEN = {
  recibido: 'Recibido en el taller',
  en_diagnostico: 'En diagnóstico',
  en_reparacion: 'En reparación',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
}

// Tonos de BadgeEstatus.
export const TONOS_ORDEN = {
  recibido: 'gris',
  en_diagnostico: 'azul',
  en_reparacion: 'amarillo',
  listo: 'verde',
  entregado: 'gris',
}

export function etiquetaOrden(estatus) {
  return ETIQUETAS_ORDEN[estatus] ?? estatus
}

export function tonoOrden(estatus) {
  return TONOS_ORDEN[estatus] ?? 'gris'
}

// Siguiente estatus o null si ya está entregado.
export function siguienteEstatus(estatus) {
  const i = PASOS_ORDEN.indexOf(estatus)
  return i >= 0 && i < PASOS_ORDEN.length - 1 ? PASOS_ORDEN[i + 1] : null
}
