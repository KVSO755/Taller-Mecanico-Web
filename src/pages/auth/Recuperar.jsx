import { useState } from 'react'
import { Link } from 'react-router'
import { enviarEnlaceRecuperacion } from '../../services/auth'
import { traducirError } from '../../services/errores'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import Input from '../../components/Input'
import PantallaAcceso from '../../components/PantallaAcceso'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Mismo mensaje exista o no la cuenta: no se revela qué correos están registrados.
const MENSAJE_ENVIADO =
  'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa tu bandeja y la carpeta de spam.'

export default function Recuperar() {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    const c = correo.trim()
    let nuevo = ''
    if (!c) nuevo = 'Escribe tu correo.'
    else if (!REGEX_CORREO.test(c)) nuevo = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
    setError(nuevo)
    setErrorEnvio('')
    if (nuevo) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return

    setEnviando(true)
    try {
      await enviarEnlaceRecuperacion(c)
      setEnviado(true)
    } catch (err) {
      setErrorEnvio(traducirError(err, 'recuperar'))
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      titulo="Recupera tu contraseña"
      subtitulo="Escribe el correo de tu cuenta y te mandaremos un enlace para crear una contraseña nueva."
      pie={
        <>
          ¿Ya la recordaste?{' '}
          <Link to="/login" className="enlace">
            Inicia sesión
          </Link>
        </>
      }
    >
      {enviado ? (
        <div className="space-y-5">
          <Alerta tipo="exito">{MENSAJE_ENVIADO}</Alerta>
          <Boton variante="secundario" onClick={() => setEnviado(false)} className="w-full">
            Enviar a otro correo
          </Boton>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-5">
          <Alerta tipo="error">{errorEnvio}</Alerta>
          <Input
            label="Correo"
            type="email"
            autoComplete="email"
            maxLength={LIMITES.correo}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={error}
          />
          <Boton type="submit" cargando={enviando} className="w-full">
            Enviar enlace
          </Boton>
        </form>
      )}
    </PantallaAcceso>
  )
}
