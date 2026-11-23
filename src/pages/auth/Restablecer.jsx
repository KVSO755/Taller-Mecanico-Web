import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { rutaInicioPorRol } from '../../routes/rutaInicio'
import { cambiarContrasena } from '../../services/auth'
import { traducirError } from '../../services/errores'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import { clasesBoton } from '../../components/clasesBoton'
import Input from '../../components/Input'
import PantallaAcceso from '../../components/PantallaAcceso'
import Spinner from '../../components/Spinner'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'

const MENSAJE_ENLACE = 'El enlace no es válido o ya venció. Pide uno nuevo.'

// Supabase regresa con ?error=… o #error=… cuando el enlace venció o ya se usó.
function enlaceConError() {
  const params = `${window.location.search}&${window.location.hash.replace(/^#/, '')}`
  return /(^|[?&])error(_code)?=/.test(params)
}

function validar(contrasena, confirmar) {
  const e = {}
  if (!contrasena) e.contrasena = 'Escribe una contraseña.'
  else if (contrasena.length < 8) e.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
  if (!confirmar) e.confirmar = 'Confirma tu contraseña.'
  else if (confirmar !== contrasena) e.confirmar = 'Las contraseñas no coinciden.'
  return e
}

// Pantalla a la que lleva el enlace del correo: el enlace abre la sesión y aquí se elige la contraseña nueva.
export default function Restablecer() {
  const { sesion, perfil, cargando, aviso } = useAuth()
  const navigate = useNavigate()
  const [errorEnlace] = useState(enlaceConError)
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  if (cargando) {
    return (
      <PantallaAcceso titulo="Crea tu contraseña nueva">
        <p role="status" className="flex items-center gap-3 text-tenue">
          <Spinner />
          Revisando el enlace...
        </p>
      </PantallaAcceso>
    )
  }

  if (errorEnlace || !sesion) {
    return (
      <PantallaAcceso titulo="Crea tu contraseña nueva">
        <div className="space-y-5">
          <Alerta tipo="error">{aviso || MENSAJE_ENLACE}</Alerta>
          <Link to="/recuperar" className={`${clasesBoton('primario')} w-full`}>
            Pedir un enlace nuevo
          </Link>
          <p className="text-sm text-tenue">
            <Link to="/login" className="enlace">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </PantallaAcceso>
    )
  }

  async function enviar(ev) {
    ev.preventDefault()
    const form = ev.currentTarget
    const nuevos = validar(contrasena, confirmar)
    setErrores(nuevos)
    setErrorEnvio('')
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return

    setEnviando(true)
    try {
      await cambiarContrasena(contrasena)
      const destino = perfil ? rutaInicioPorRol(perfil.rol) : '/'
      navigate(destino, { replace: true, state: { aviso: 'Tu contraseña se actualizó.' } })
    } catch (err) {
      setErrorEnvio(traducirError(err, 'contrasena'))
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      titulo="Crea tu contraseña nueva"
      subtitulo={sesion.user?.email ? `Para la cuenta ${sesion.user.email}.` : undefined}
    >
      <form onSubmit={enviar} noValidate className="space-y-5">
        <Alerta tipo="error">{errorEnvio}</Alerta>
        <Input
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITES.contrasena}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={errores.contrasena}
        />
        <Input
          label="Confirmar contraseña nueva"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITES.contrasena}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          error={errores.confirmar}
        />
        <Boton type="submit" cargando={enviando} className="w-full">
          Guardar contraseña
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
