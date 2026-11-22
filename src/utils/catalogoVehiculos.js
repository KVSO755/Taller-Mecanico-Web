// Marcas y modelos comunes del catálogo de refacciones (mismos textos de compatibilidad que el seed).
// `termino` es lo que se busca en `piezas.compatibilidad` cuando difiere del nombre mostrado.
// Ojo con los prefijos: "CX-3" también aparece dentro de "CX-30", por eso su término lleva el año.
const m = (nombre, termino = nombre) => ({ nombre, termino })

export const MARCA_UNIVERSAL = 'Universal'

export const CATALOGO_VEHICULOS = [
  { marca: 'Nissan', modelos: [m('Versa'), m('Sentra'), m('March'), m('Kicks'), m('NP300')] },
  { marca: 'Toyota', modelos: [m('Corolla'), m('Yaris'), m('Hilux'), m('RAV4'), m('Avanza')] },
  {
    marca: 'Mazda',
    modelos: [m('Mazda 2'), m('Mazda 3'), m('CX-3', 'CX-3 2'), m('CX-5'), m('CX-30')],
  },
  {
    marca: 'Volkswagen',
    modelos: [m('Jetta'), m('Vento'), m('Virtus'), m('Polo'), m('T-Cross'), m('Tiguan')],
  },
  { marca: 'MG', modelos: [m('MG5'), m('ZS', 'MG ZS'), m('HS', 'MG HS'), m('RX5', 'MG RX5')] },
  { marca: 'Mitsubishi', modelos: [m('Mirage'), m('L200'), m('Outlander'), m('Xpander')] },
  { marca: 'Chevrolet', modelos: [m('Aveo'), m('Onix'), m('Beat'), m('Tracker'), m('S10')] },
  { marca: 'Honda', modelos: [m('Civic'), m('City'), m('HR-V'), m('CR-V')] },
  { marca: 'Kia', modelos: [m('Rio'), m('Forte'), m('Seltos'), m('Sportage')] },
  { marca: 'Hyundai', modelos: [m('Accent'), m('Grand i10'), m('Creta'), m('Tucson')] },
  { marca: 'Ford', modelos: [m('Ranger'), m('Figo'), m('Territory'), m('Escape')] },
  { marca: MARCA_UNIVERSAL, modelos: [] },
]

export const MARCAS = CATALOGO_VEHICULOS.map((c) => c.marca)

export function modelosDe(marca) {
  return CATALOGO_VEHICULOS.find((c) => c.marca === marca)?.modelos ?? []
}

// Texto que se busca en la compatibilidad para un modelo (null si no existe).
export function terminoDeModelo(marca, modelo) {
  return modelosDe(marca).find((x) => x.nombre === modelo)?.termino ?? null
}

const ALIAS_MARCA = { vw: 'Volkswagen', chevy: 'Chevrolet' }
const compactar = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// Vehículo de la BD (texto libre) -> { marca, modelo } del catálogo, o null.
// Si la marca coincide pero el modelo no, modelo es null.
export function detectarMarcaModelo(marcaVehiculo, modeloVehiculo) {
  const mc = compactar(marcaVehiculo)
  if (!mc) return null
  const entrada = CATALOGO_VEHICULOS.find(
    (c) => c.marca !== MARCA_UNIVERSAL && (compactar(c.marca) === mc || ALIAS_MARCA[mc] === c.marca),
  )
  if (!entrada) return null
  const mod = compactar(modeloVehiculo)
  if (!mod) return { marca: entrada.marca, modelo: null }
  const marcaC = compactar(entrada.marca)
  const candidatos = [...entrada.modelos].sort((a, b) => b.nombre.length - a.nombre.length)
  const encontrado = candidatos.find((x) => {
    const claves = new Set([compactar(x.nombre), compactar(x.nombre).replace(new RegExp(`^${marcaC}`), '')])
    return [...claves].some((k) => k && (k === mod || (k.length >= 4 && mod.includes(k))))
  })
  return { marca: entrada.marca, modelo: encontrado?.nombre ?? null }
}
