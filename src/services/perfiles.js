import { supabase, crearClienteAislado } from '../lib/supabase'

export async function obtenerMiPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, correo, telefono, rol, activo')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

const COLS_EMPLEADO = 'id, nombre, correo, telefono, rol, activo'

export async function listarEmpleados() {
  const { data, error } = await supabase
    .from('perfiles')
    .select(COLS_EMPLEADO)
    .in('rol', ['empleado', 'admin'])
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

// Devuelve null si no hay cuenta con ese correo.
export async function buscarPorCorreo(correo) {
  const { data, error } = await supabase
    .from('perfiles')
    .select(COLS_EMPLEADO)
    .eq('correo', String(correo).trim().toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function cambiarRol(id, rol) {
  const { error } = await supabase.rpc('cambiar_rol', { p_perfil_id: id, p_rol: rol })
  if (error) throw error
}

export async function cambiarActivo(id, activo) {
  const { error } = await supabase.rpc('cambiar_activo', { p_perfil_id: id, p_activo: activo })
  if (error) throw error
}

// Perfiles activos que pueden tener órdenes asignadas.
export async function listarMecanicos() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .in('rol', ['empleado', 'admin'])
    .eq('activo', true)
    .order('nombre', { ascending: true })
  if (error) throw error
  return data
}

// Crea la cuenta con un cliente secundario (la sesión del admin no cambia) y luego da el rol con el cliente principal.
export async function crearEmpleado({ nombre, telefono, correo, contrasena }) {
  const aislado = crearClienteAislado('tallerapp-alta-empleado')
  const { data, error } = await aislado.auth.signUp({
    email: String(correo).trim().toLowerCase(),
    password: contrasena,
    options: { data: { nombre: nombre.trim(), telefono: telefono.trim() } },
  })
  if (error) throw error
  const user = data?.user
  // Con correo ya registrado y confirmación activa, Supabase devuelve un usuario sin identidades.
  if (!user || (Array.isArray(user.identities) && user.identities.length === 0)) {
    const e = new Error('User already registered')
    e.code = 'user_already_exists'
    throw e
  }
  await cambiarRol(user.id, 'empleado')
  return { id: user.id, nombre: nombre.trim() }
}
