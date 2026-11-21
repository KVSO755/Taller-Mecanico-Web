import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../context/AuthContext'
import SinPermiso from '../pages/SinPermiso'
import Alerta from '../components/Alerta'
import Boton from '../components/Boton'
import Spinner from '../components/Spinner'

export default function RutaProtegida({ roles }) {
  const { sesion, perfil, cargando, errorPerfil, reintentarPerfil } = useAuth()

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center bg-fondo p-8">
        <p role="status" className="flex items-center gap-3 text-tenue">
          <Spinner />
          Cargando...
        </p>
      </div>
    )
  }
  if (sesion && !perfil && errorPerfil) {
    return (
      <div className="grid min-h-screen place-items-center bg-fondo p-4">
        <div className="w-full max-w-md space-y-4 border border-linea bg-superficie p-6">
          <Alerta tipo="error">{errorPerfil}</Alerta>
          <Boton variante="secundario" onClick={reintentarPerfil}>
            Reintentar
          </Boton>
        </div>
      </div>
    )
  }
  if (!sesion || !perfil) return <Navigate to="/login" replace />
  if (!roles.includes(perfil.rol)) return <SinPermiso />
  return <Outlet />
}
