const fmtMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function formatearMoneda(n) {
  return fmtMoneda.format(Number(n) || 0)
}
