export const ZONA_TALLER = 'America/Tijuana'

const fmtFechaHora = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_TALLER,
  dateStyle: 'medium',
  timeStyle: 'short',
})

const fmtFecha = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_TALLER,
  dateStyle: 'medium',
})

export function formatearFechaHora(isoString) {
  return fmtFechaHora.format(new Date(isoString))
}

export function formatearFecha(isoString) {
  return fmtFecha.format(new Date(isoString))
}
