import Alerta from './Alerta'
import Boton from './Boton'
import Spinner from './Spinner'

export default function EstadoLista({
  cargando,
  error,
  onReintentar,
  vacio,
  mensajeVacio = 'No hay información para mostrar.',
  accionVacia,
  children,
}) {
  if (cargando) {
    return (
      <div role="status" className="py-4">
        <p className="flex items-center gap-3 text-tenue">
          <Spinner />
          Cargando...
        </p>
        <div aria-hidden="true" className="mt-4 space-y-3 border-t-2 border-tinta pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse bg-neutro-suave" />
          ))}
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-3 py-4">
        <Alerta tipo="error">
          {typeof error === 'string' ? error : 'No se pudo cargar la información.'}
        </Alerta>
        {onReintentar && (
          <Boton variante="secundario" onClick={onReintentar}>
            Reintentar
          </Boton>
        )}
      </div>
    )
  }
  if (vacio) {
    return (
      <div className="my-4 flex flex-col items-start gap-3 border border-dashed border-linea px-4 py-8 sm:items-center sm:text-center">
        <p className="text-tenue">{mensajeVacio}</p>
        {accionVacia}
      </div>
    )
  }
  return children
}
