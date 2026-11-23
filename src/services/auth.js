import { supabase } from '../lib/supabase'

export async function iniciarSesion(correo, contrasena) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  })
  if (error) throw error
  return data
}

export async function registrarse({ nombre, telefono, correo, contrasena }) {
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: contrasena,
    options: { data: { nombre, telefono } },
  })
  if (error) throw error
  return data
}

// Manda el correo con el enlace a /restablecer. Supabase no avisa si el correo no existe.
export async function enviarEnlaceRecuperacion(correo) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${window.location.origin}/restablecer`,
  })
  if (error) throw error
}

// Requiere la sesión que abre el enlace del correo (o una sesión normal).
export async function cambiarContrasena(nueva) {
  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) throw error
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function obtenerSesion() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// Devuelve una función para cancelar la suscripción.
export function escucharCambiosAuth(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion))
  return () => data.subscription.unsubscribe()
}
