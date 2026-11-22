import { MAX_DINERO } from './formularios'

// Resumen del trabajo de una orden (Q47): diagnóstico si existe; si no, el motivo de la cita.
export function resumenTrabajo(orden) {
  const d = orden?.diagnostico?.trim()
  if (d) return d
  const m = orden?.cita?.motivo?.trim()
  return m || ''
}

// Mano de obra capturada como texto → { valor: number|null, error?: string }.
export function parsearManoObra(texto) {
  const t = String(texto ?? '').trim().replace(/,/g, '')
  if (t === '') return { valor: null }
  if (t.startsWith('-')) return { valor: null, error: 'La mano de obra no puede ser negativa.' }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    return { valor: null, error: 'Escribe un monto válido, solo números y con máximo 2 decimales (ej. 350.50).' }
  }
  const n = Number(t)
  if (n > MAX_DINERO) return { valor: null, error: 'La mano de obra no puede pasar de 99,999,999.99.' }
  return { valor: n }
}
