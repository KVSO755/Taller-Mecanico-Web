import { Link } from 'react-router'
import { clasesBoton } from '../components/clasesBoton'
import PantallaAcceso from '../components/PantallaAcceso'

export default function NoEncontrado() {
  return (
    <PantallaAcceso titulo="Página no encontrada" subtitulo="La dirección que abriste no existe.">
      <Link to="/" className={clasesBoton('primario')}>
        Ir al inicio
      </Link>
    </PantallaAcceso>
  )
}
