import { ZONA_TALLER } from './fechas'

// Zona horaria fija del taller: todo cálculo de fecha/hora usa esta zona,
// nunca la del navegador.
export const ZONA = ZONA_TALLER

const MS_DIA = 24 * 60 * 60 * 1000

// Suma `dias` a una fecha 'YYYY-MM-DD' (calendario puro, vía UTC) y devuelve 'YYYY-MM-DD'.
function sumarDias(fechaStr, dias) {
  const [a, m, d] = fechaStr.split('-').map(Number)
  const t = Date.UTC(a, m - 1, d) + dias * MS_DIA
  return new Date(t).toISOString().slice(0, 10)
}

// Fecha de hoy en Tijuana como 'YYYY-MM-DD'.
export function hoyEnTaller(ahora = new Date()) {
  // El locale 'en-CA' formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

// Rango elegible: desde mañana hasta hoy + 30 días.
export function rangoFechasPermitidas(ahora = new Date()) {
  const hoy = hoyEnTaller(ahora)
  return { min: sumarDias(hoy, 1), max: sumarDias(hoy, 30) }
}

// Día de la semana (0 = domingo) de una fecha 'YYYY-MM-DD'; el calendario no depende de la zona.
function diaSemana(fechaStr) {
  const [a, m, d] = fechaStr.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

export function esDomingo(fechaStr) {
  return diaSemana(fechaStr) === 0
}

// Offset de Tijuana (en minutos, ej. -480 o -420) vigente en un instante dado.
function offsetMinutos(fecha) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    timeZoneName: 'longOffset',
  }).formatToParts(fecha)
  const nombre = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nombre)
  if (!m) return 0 // 'GMT' a secas = offset 0
  const minutos = Number(m[2]) * 60 + Number(m[3])
  return m[1] === '-' ? -minutos : minutos
}

// ISO con offset correcto (horario de verano incluido) para una fecha local de
// Tijuana 'YYYY-MM-DD' y una hora entera.
// Ej.: ('2026-11-23', 8) -> '2026-11-23T08:00:00-08:00'
export function isoDeBloque(fechaStr, hora) {
  const [a, m, d] = fechaStr.split('-').map(Number)
  // Primera aproximación: la hora local tomada como UTC, corregida con el offset;
  // se repite una vez por si el offset cambia entre ambos instantes.
  const comoUtc = Date.UTC(a, m - 1, d, hora, 0, 0)
  let off = offsetMinutos(new Date(comoUtc))
  off = offsetMinutos(new Date(comoUtc - off * 60000))
  const signo = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  const dos = (n) => String(n).padStart(2, '0')
  return `${a}-${dos(m)}-${dos(d)}T${dos(hora)}:00:00${signo}${dos(Math.floor(abs / 60))}:${dos(abs % 60)}`
}

// "08:00"
export function etiquetaHora(hora) {
  return `${String(hora).padStart(2, '0')}:00`
}

// Bloques de 1 hora del día: L-V 8..17, sábado 8..13, domingo cerrado.
export function bloquesDelDia(fechaStr) {
  if (!fechaStr || esDomingo(fechaStr)) return []
  const ultima = diaSemana(fechaStr) === 6 ? 13 : 17
  const bloques = []
  for (let hora = 8; hora <= ultima; hora++) {
    bloques.push({ hora, iso: isoDeBloque(fechaStr, hora) })
  }
  return bloques
}

// Fecha 'YYYY-MM-DD' que existe de verdad en el calendario (descarta 2026-99-99 o 2026-02-30)
// y cae en un rango razonable de años.
export function fechaValida(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? ''))
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (a < 2000 || a > 2100) return false
  const f = new Date(Date.UTC(a, mes - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d
}

// Mes 'YYYY-MM' válido (año entre 2000 y 2100).
export function mesValido(texto) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(texto ?? ''))
  return Boolean(m) && Number(m[1]) >= 2000 && Number(m[1]) <= 2100
}
