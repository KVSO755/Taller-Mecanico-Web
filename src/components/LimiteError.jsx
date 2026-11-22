import { Component } from 'react'
import Alerta from './Alerta'
import Boton from './Boton'

const MENSAJE_CHUNK = 'No se pudo cargar esta pantalla. Puede que haya una versión nueva de la app. Recarga la página.'
const MENSAJE_GENERAL = 'Algo salió mal. Recarga la página.'

const esErrorDeCarga = (e) =>
  /dynamically imported module|importing a module script|Loading chunk|Loading CSS chunk|error loading dynamically/i.test(
    String(e?.message ?? e),
  )

// Límite de error: en lugar de pantalla en blanco muestra un mensaje y el botón "Recargar".
// También atrapa los fallos de los imports perezosos (chunk no disponible tras un despliegue nuevo).
// `clave`: al cambiar (p. ej. la ruta) el límite se reinicia y vuelve a intentar dibujar.
export default class LimiteError extends Component {
  state = { error: null, clave: this.props.clave }

  static getDerivedStateFromError(error) {
    return { error }
  }

  // Al cambiar la clave (otra ruta) se descarta el error y se vuelve a intentar dibujar.
  static getDerivedStateFromProps(props, state) {
    return props.clave !== state.clave ? { error: null, clave: props.clave } : null
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="grid min-h-[50vh] place-items-center bg-fondo p-4">
        <div className="w-full max-w-md space-y-4 border border-linea bg-superficie p-6">
          <Alerta tipo="error">{esErrorDeCarga(error) ? MENSAJE_CHUNK : MENSAJE_GENERAL}</Alerta>
          <Boton onClick={() => window.location.reload()}>Recargar</Boton>
        </div>
      </div>
    )
  }
}
