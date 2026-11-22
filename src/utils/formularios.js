import { useState } from 'react'

// Límites de longitud alineados con las restricciones de la base de datos.
export const LIMITES = {
  nombrePerfil: 120,
  telefono: 10,
  marca: 60,
  modelo: 60,
  placa: 8,
  placaEscrita: 12, // con espacios o guiones antes de normalizar
  motivoCita: 200,
  textoOrden: 2000,
  nombrePieza: 120,
  codigoPieza: 20,
  compatibilidad: 500,
  motivoMovimiento: 300,
  razonSocial: 250,
  correo: 254,
  rfc: 13,
  codigoPostal: 5,
  contrasena: 72,
  busqueda: 100,
  numero: 10,
}

export const MAX_KM = 9999999
export const MAX_CANTIDAD = 999999
export const MAX_DINERO = 99999999.99

// Id de ruta o de parámetro: entero positivo razonable (si no, equivale a "no encontrado").
export function idValido(id) {
  return /^[1-9]\d{0,14}$/.test(String(id ?? ''))
}

// Lleva el foco al primer campo con error del formulario, después del siguiente render.
export function enfocarPrimerError(form) {
  if (!form) return
  setTimeout(() => form.querySelector('[aria-invalid="true"], [data-error="true"]')?.focus(), 0)
}

// Candado síncrono contra doble clic: el estado `enviando` tarda un render en reflejarse.
export function useCandado() {
  const [candado] = useState(() => {
    let tomado = false
    return {
      tomar() {
        if (tomado) return false
        tomado = true
        return true
      },
      soltar() {
        tomado = false
      },
    }
  })
  return candado
}

// Descarta respuestas viejas: solo la última petición iniciada puede actualizar la pantalla.
export function useSecuencia() {
  const [secuencia] = useState(() => {
    let ultima = 0
    return {
      siguiente: () => ++ultima,
      vigente: (n) => ultima === n,
    }
  })
  return secuencia
}
