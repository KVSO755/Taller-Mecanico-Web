const TIPOS = {
  error: { caja: 'border-cancelada bg-cancelada-suave', icono: 'text-cancelada' },
  exito: { caja: 'border-confirmada bg-confirmada-suave', icono: 'text-confirmada' },
  info: { caja: 'border-cobalto bg-cobalto-suave', icono: 'text-cobalto' },
}

// Iconos propios, trazo uniforme de 1.75px.
const ICONOS = {
  error: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 5.5v5.5M10 14v.5" />
    </>
  ),
  exito: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.5l2.5 2.5 4.5-5.5" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5.5M10 5.5v.5" />
    </>
  ),
}

export default function Alerta({ tipo = 'error', children, className = '' }) {
  if (!children) return null
  const estilo = TIPOS[tipo] ?? TIPOS.info
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-sm text-tinta ${estilo.caja} ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`mt-px h-5 w-5 shrink-0 ${estilo.icono}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {ICONOS[tipo] ?? ICONOS.info}
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
