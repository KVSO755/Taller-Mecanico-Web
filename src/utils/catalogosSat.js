export const REGIMENES_FISCALES = [
  ['601', 'General de Ley Personas Morales'],
  ['603', 'Personas Morales con Fines no Lucrativos'],
  ['605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'],
  ['606', 'Arrendamiento'],
  ['612', 'Personas Físicas con Actividades Empresariales y Profesionales'],
  ['616', 'Sin obligaciones fiscales'],
  ['621', 'Incorporación Fiscal'],
  ['625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'],
  ['626', 'Régimen Simplificado de Confianza'],
]

export const USOS_CFDI = [
  ['G01', 'Adquisición de mercancías'],
  ['G02', 'Devoluciones, descuentos o bonificaciones'],
  ['G03', 'Gastos en general'],
  ['I01', 'Construcciones'],
  ['I02', 'Mobiliario y equipo de oficina por inversiones'],
  ['I03', 'Equipo de transporte'],
  ['I04', 'Equipo de cómputo y accesorios'],
  ['I08', 'Otra maquinaria y equipo'],
  ['D01', 'Honorarios médicos, dentales y gastos hospitalarios'],
  ['S01', 'Sin efectos fiscales'],
  ['CP01', 'Pagos'],
]

const buscar = (lista, clave) => lista.find(([c]) => c === clave)?.[1]
export const nombreRegimen = (c) => (buscar(REGIMENES_FISCALES, c) ? `${c} · ${buscar(REGIMENES_FISCALES, c)}` : c)
export const nombreUsoCfdi = (c) => (buscar(USOS_CFDI, c) ? `${c} · ${buscar(USOS_CFDI, c)}` : c)

export const normalizarRfc = (t) => String(t ?? '').trim().toUpperCase()

export function rfcValido(t) {
  return /^([A-ZÑ&]{3,4})[0-9]{6}[A-Z0-9]{3}$/.test(normalizarRfc(t))
}

export function codigoPostalValido(t) {
  return /^[0-9]{5}$/.test(String(t ?? '').trim())
}

export function correoValido(t) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(t ?? '').trim())
}
