import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { rutaInicioPorRol } from '../../routes/rutaInicio'
import { traducirError } from '../../services/errores'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import Input from '../../components/Input'
import PantallaAcceso from '../../components/PantallaAcceso'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(f) {
  const e = {}
  const nombre = f.nombre.trim()
  if (!nombre) e.nombre = 'Escribe tu nombre completo.'
  else if (nombre.length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres.'
  else if (nombre.length > LIMITES.nombrePerfil) e.nombre = `El nombre no puede pasar de ${LIMITES.nombrePerfil} caracteres.`
  const tel = f.telefono.trim()
  if (!tel) e.telefono = 'Escribe tu teléfono.'
  else if (!/^\d{10}$/.test(tel)) e.telefono = 'El teléfono debe tener exactamente 10 dígitos, solo números.'
  if (!f.correo.trim()) e.correo = 'Escribe tu correo.'
  else if (!REGEX_CORREO.test(f.correo.trim())) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
  if (!f.contrasena) e.contrasena = 'Escribe una contraseña.'
  else if (f.contrasena.length < 8) e.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
  if (!f.confirmar) e.confirmar = 'Confirma tu contraseña.'
  else if (f.confirmar !== f.contrasena) e.confirmar = 'Las contraseñas no coinciden.'
  return e
}

export default function Registro() {
  const { perfil, cargando, registro } = useAuth()
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    contrasena: '',
    confirmar: '',
  })
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [info, setInfo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  if (!cargando && perfil) return <Navigate to={rutaInicioPorRol(perfil.rol)} replace />

  const campo = (nombre) => ({
    value: form[nombre],
    error: errores[nombre],
    onChange: (e) => setForm((f) => ({ ...f, [nombre]: e.target.value })),
  })

  async function enviar(e) {
    e.preventDefault()
    const formEl = e.currentTarget
    const nuevos = validar(form)
    setErrores(nuevos)
    setErrorEnvio('')
    setInfo('')
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(formEl)
      return
    }
    if (!candado.tomar()) return

    setEnviando(true)
    try {
      const { session } = await registro({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
      })
      // Con sesión, el contexto carga el perfil y esta pantalla redirige a /cliente.
      if (!session) setInfo('Cuenta creada. Ya puedes iniciar sesión.')
    } catch (err) {
      setErrorEnvio(traducirError(err, 'registro'))
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      titulo="Crear cuenta"
      subtitulo="Regístrate como cliente del taller"
      pie={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="enlace">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-5">
        <Alerta tipo="error">{errorEnvio}</Alerta>
        <Alerta tipo="info">{info}</Alerta>
        <Input label="Nombre completo" autoComplete="name" maxLength={LIMITES.nombrePerfil} {...campo('nombre')} />
        <Input
          label="Teléfono (10 dígitos)"
          type="tel"
          inputMode="numeric"
          maxLength={LIMITES.telefono}
          autoComplete="tel"
          {...campo('telefono')}
        />
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          maxLength={LIMITES.correo}
          {...campo('correo')}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITES.contrasena}
          {...campo('contrasena')}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITES.contrasena}
          {...campo('confirmar')}
        />
        <Boton type="submit" cargando={enviando} className="w-full">
          Crear cuenta
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
