// Tono -> color del estado: cuadrado 8px + texto sobre tinte claro (contraste AA).
const TONOS = {
  gris: { caja: 'bg-neutro-suave text-tenue', punto: 'bg-neutro' },
  amarillo: { caja: 'bg-pendiente-suave text-pendiente', punto: 'bg-pendiente' },
  verde: { caja: 'bg-confirmada-suave text-confirmada', punto: 'bg-confirmada' },
  rojo: { caja: 'bg-cancelada-suave text-cancelada', punto: 'bg-cancelada' },
  azul: { caja: 'bg-cobalto-suave text-cobalto', punto: 'bg-cobalto' },
}

export default function BadgeEstatus({ texto, tono = 'gris' }) {
  const t = TONOS[tono] ?? TONOS.gris
  return (
    <span className={`etiqueta inline-flex items-center gap-2 rounded-sm px-2 py-1 ${t.caja}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 ${t.punto}`} />
      {texto}
    </span>
  )
}
