import { LIMITES, MAX_CANTIDAD, MAX_DINERO } from './formularios'

// Estado de una pieza: Inactiva > Agotado (0) > Bajo stock (<= mínimo) > Disponible.
export function estadoPieza(p) {
  if (!p.activa) return { texto: 'Inactiva', tono: 'gris' }
  if (p.existencias === 0) return { texto: 'Agotado', tono: 'rojo' }
  if (p.existencias <= p.stock_minimo) return { texto: 'Bajo stock', tono: 'amarillo' }
  return { texto: 'Disponible', tono: 'verde' }
}

export const TIPOS_MOVIMIENTO = {
  entrada: 'Entrada',
  salida: 'Salida',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
}

export function cantidadConSigno(n) {
  return n > 0 ? `+${n}` : String(n)
}


const ENTERO = /^\d+$/
const DECIMAL = /^\d+(\.\d{1,2})?$/

export function validarCodigo(valor) {
  const c = valor.trim().toUpperCase().replace(/\s+/g, '')
  if (!c) return { error: 'Escribe el código de la pieza.' }
  if (!/^[A-Z0-9-]{2,20}$/.test(c)) return { error: `El código debe tener de 2 a ${LIMITES.codigoPieza} letras, números o guiones.` }
  return { valor: c }
}

export function validarNombre(valor) {
  const n = valor.trim()
  if (!n) return { error: 'Escribe el nombre de la pieza.' }
  if (n.length < 2 || n.length > LIMITES.nombrePieza) {
    return { error: `El nombre debe tener entre 2 y ${LIMITES.nombrePieza} caracteres.` }
  }
  return { valor: n }
}

// Dinero en MXN: número con máximo 2 decimales, de 0 a 99,999,999.99 (acepta "$" y comas de millares).
export function validarCosto(valor, { nombre = 'El costo' } = {}) {
  const t = String(valor).trim().replace(/^\$/, '').replace(/,/g, '')
  if (t === '') return { error: `Escribe ${nombre.toLowerCase()}.` }
  if (t.startsWith('-')) return { error: `${nombre} no puede ser negativo.` }
  if (!DECIMAL.test(t)) return { error: `${nombre} debe ser un número, con máximo 2 decimales (ej. 150.50).` }
  const n = Number(t)
  if (n > MAX_DINERO) return { error: `${nombre} no puede pasar de 99,999,999.99.` }
  return { valor: n }
}

export function validarEntero(valor, { min = 0, max = MAX_CANTIDAD, nombre = 'El valor' } = {}) {
  const t = String(valor).trim()
  if (t === '') return { error: `Escribe ${nombre.toLowerCase()}.` }
  if (t.startsWith('-')) return { error: `${nombre} no puede ser negativo.` }
  if (!ENTERO.test(t)) return { error: `${nombre} debe ser un número entero, sin letras ni decimales.` }
  const n = Number(t)
  if (n < min) return { error: min > 0 ? `${nombre} debe ser mayor a 0.` : `${nombre} no puede ser negativo.` }
  if (n > max) return { error: `${nombre} no puede ser mayor a ${max.toLocaleString('es-MX')}.` }
  return { valor: n }
}
