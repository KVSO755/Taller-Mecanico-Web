import { LIMITES } from './formularios'

// Normaliza una placa: mayúsculas, sin espacios ni guiones.
export function normalizarPlaca(texto) {
  return String(texto ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
}

// Valor para un input de placa: normalizado y recortado al máximo (permite pegar "abc-123").
export function placaEscrita(texto) {
  return normalizarPlaca(texto).slice(0, LIMITES.placa)
}

// Placa ya normalizada: 5 a 8 caracteres alfanuméricos.
export function placaValida(placa) {
  return /^[A-Z0-9]{5,8}$/.test(placa)
}
