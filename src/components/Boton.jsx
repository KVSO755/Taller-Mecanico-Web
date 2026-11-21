import Spinner from './Spinner'
import { clasesBoton } from './clasesBoton'

export default function Boton({
  variante = 'primario',
  cargando = false,
  disabled = false,
  type = 'button',
  className = '',
  compacto = false,
  children,
  ...resto
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clasesBoton(variante, className, compacto)}
      {...resto}
    >
      {cargando && <Spinner />}
      {children}
    </button>
  )
}
