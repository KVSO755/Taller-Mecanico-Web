import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as auth from '../services/auth'
import { obtenerMiPerfil } from '../services/perfiles'
import { traducirError } from '../services/errores'

const AuthContext = createContext(null)

export const MENSAJE_DESACTIVADA = 'Tu cuenta está desactivada. Contacta al taller.'

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [sesionLista, setSesionLista] = useState(false)
  const [perfil, setPerfil] = useState(null)
  // id del usuario cuyo perfil ya se intentó cargar
  const [perfilIntentadoDe, setPerfilIntentadoDe] = useState(null)
  const [aviso, setAviso] = useState('')
  // Mensaje si la carga del perfil falló (p. ej. sin red); la sesión se conserva.
  const [errorPerfil, setErrorPerfil] = useState('')
  const [intento, setIntento] = useState(0)

  const userId = sesion?.user?.id ?? null

  // 1) Sesión: el callback de onAuthStateChange solo hace setState (sin await a supabase).
  useEffect(() => {
    let activo = true
    auth
      .obtenerSesion()
      .then((s) => activo && setSesion(s))
      .catch(() => {})
      .finally(() => activo && setSesionLista(true))
    const cancelar = auth.escucharCambiosAuth((s) => {
      if (activo) setSesion(s)
    })
    return () => {
      activo = false
      cancelar()
    }
  }, [])

  // 2) Perfil: efecto que depende del usuario, fuera del callback de auth.
  useEffect(() => {
    if (!userId) return
    let activo = true
    obtenerMiPerfil(userId)
      .then((p) => {
        if (!activo) return
        setErrorPerfil('')
        if (!p || !p.activo) {
          setAviso(MENSAJE_DESACTIVADA)
          setPerfil(null)
          auth.cerrarSesion().catch(() => {})
        } else {
          setAviso('')
          setPerfil(p)
        }
      })
      .catch((e) => {
        if (!activo) return
        // Error de red u otro fallo de carga: NO se cierra la sesión.
        setErrorPerfil(traducirError(e, 'cargar'))
        setPerfil(null)
      })
      .finally(() => activo && setPerfilIntentadoDe(userId))
    return () => {
      activo = false
    }
  }, [userId, intento])

  // 3) Cuenta desactivada con la sesión abierta: al volver a la pestaña se revalida el perfil.
  useEffect(() => {
    if (!userId) return undefined
    let activo = true
    function revisar() {
      if (document.visibilityState !== 'visible') return
      obtenerMiPerfil(userId)
        .then((p) => {
          if (!activo || (p && p.activo)) return
          setAviso(MENSAJE_DESACTIVADA)
          setPerfil(null)
          auth.cerrarSesion().catch(() => {})
        })
        .catch(() => {}) // sin red: se conserva la sesión
    }
    document.addEventListener('visibilitychange', revisar)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', revisar)
    }
  }, [userId])

  const reintentarPerfil = useCallback(() => {
    setErrorPerfil('')
    setPerfilIntentadoDe(null)
    setIntento((n) => n + 1)
  }, [])

  const recargarPerfil = useCallback(async () => {
    if (!userId) return
    const p = await obtenerMiPerfil(userId)
    if (p) setPerfil(p)
  }, [userId])

  const login = useCallback(async (correo, contrasena) => {
    setAviso('')
    await auth.iniciarSesion(correo, contrasena)
  }, [])

  const registro = useCallback(async (datos) => {
    setAviso('')
    return auth.registrarse(datos)
  }, [])

  const logout = useCallback(async () => {
    setPerfil(null)
    await auth.cerrarSesion()
  }, [])

  const cargando = !sesionLista || (userId !== null && perfilIntentadoDe !== userId)
  // Sin sesión nunca exponemos un perfil viejo.
  const perfilActual = userId ? perfil : null

  const valor = {
    sesion,
    perfil: perfilActual,
    cargando,
    aviso,
    errorPerfil: userId ? errorPerfil : '',
    reintentarPerfil,
    login,
    registro,
    logout,
    recargarPerfil,
  }
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
