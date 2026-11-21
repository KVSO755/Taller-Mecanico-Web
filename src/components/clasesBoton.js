const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 font-display text-sm font-bold uppercase tracking-[0.12em] transition-colors md:min-h-10 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-100'

// `compacto`: 44px en móvil, 36px en escritorio (celdas y filas densas).
const COMPACTO = 'md:min-h-9! px-3!'

const VARIANTES = {
  primario:
    'border border-cobalto bg-cobalto text-white hover:bg-cobalto-oscuro active:bg-cobalto-oscuro disabled:hover:bg-cobalto',
  secundario:
    'border border-tinta bg-superficie text-tinta hover:bg-neutro-suave active:bg-linea disabled:hover:bg-superficie',
  peligro:
    'border border-cancelada bg-cancelada text-white hover:bg-cancelada-oscuro active:bg-cancelada-oscuro disabled:hover:bg-cancelada',
  fantasma:
    'border border-transparent bg-transparent text-cobalto hover:bg-cobalto-suave active:bg-cobalto-claro disabled:hover:bg-transparent',
  // Para usar sobre superficies cobalto (riel, barra superior).
  claro:
    'border border-white/60 bg-transparent text-white hover:bg-white/12 active:bg-white/20 disabled:hover:bg-transparent',
}

// Clases de botón para enlaces (<Link>) que deben verse como botón.
export function clasesBoton(variante = 'primario', className = '', compacto = false) {
  return `${BASE} ${VARIANTES[variante] ?? VARIANTES.primario} ${compacto ? COMPACTO : ''} ${className}`
}
