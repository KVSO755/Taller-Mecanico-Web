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

const fmtFechaLarga = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_TALLER,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// "Sábado, 21 de noviembre" (hoy en la zona del taller, tipo oración).
export function fechaLargaHoy(ahora = new Date()) {
  const p = Object.fromEntries(fmtFechaLarga.formatToParts(ahora).map((x) => [x.type, x.value]))
  const dia = `${p.weekday}, ${p.day} de ${p.month}`
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}
