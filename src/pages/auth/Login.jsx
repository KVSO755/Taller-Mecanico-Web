import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { rutaInicioPorRol } from '../../routes/rutaInicio'
import { traducirError } from '../../services/errores'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import Input from '../../components/Input'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'
import PantallaAcceso from '../../components/PantallaAcceso'

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { perfil, cargando, aviso, login } = useAuth()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  if (!cargando && perfil) return <Navigate to={rutaInicioPorRol(perfil.rol)} replace />

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    const nuevos = {}
    if (!correo.trim()) nuevos.correo = 'Escribe tu correo.'
    else if (!REGEX_CORREO.test(correo.trim())) nuevos.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
    if (!contrasena) nuevos.contrasena = 'Escribe tu contraseña.'
    setErrores(nuevos)
    setErrorEnvio('')
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return

    setEnviando(true)
    try {
      await login(correo.trim(), contrasena)
    } catch (err) {
      setErrorEnvio(traducirError(err, 'login'))
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      titulo="Inicia sesión para continuar"
      pie={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="enlace">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-5">
        <Alerta tipo="error">{errorEnvio || aviso}</Alerta>
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          maxLength={LIMITES.correo}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          maxLength={LIMITES.contrasena}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={errores.contrasena}
        />
        <Boton type="submit" cargando={enviando} className="w-full">
          Entrar
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
