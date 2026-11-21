export function rutaInicioPorRol(rol) {
  return rol === 'cliente' ? '/cliente' : '/taller'
}
