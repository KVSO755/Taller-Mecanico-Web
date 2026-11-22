import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { rutaInicioPorRol } from '../routes/rutaInicio'
import { clasesBoton } from '../components/clasesBoton'
import PantallaAcceso from '../components/PantallaAcceso'

export default function SinPermiso() {
  const { perfil } = useAuth()
  return (
    <PantallaAcceso titulo="No tienes permiso" subtitulo="Esta pantalla no está disponible para tu cuenta.">
      <Link to={perfil ? rutaInicioPorRol(perfil.rol) : '/login'} className={clasesBoton('primario')}>
        Ir a mi inicio
      </Link>
    </PantallaAcceso>
  )
}
