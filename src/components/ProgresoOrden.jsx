import { PASOS_ORDEN, etiquetaOrden } from '../utils/estatusOrden'

// Etiquetas abreviadas para el modo horizontal (5 columnas).
const CORTAS = {
  recibido: 'Recibido',
  en_diagnostico: 'Diagnóstico',
  en_reparacion: 'Reparación',
  listo: 'Listo',
  entregado: 'Entregado',
}

// 5 llamadas numeradas sobre una línea guía. Lista ordenada; el paso actual lleva aria-current="step".
// Responde al ancho del propio componente: en menos de 400px pasa a vertical con etiquetas completas.
export default function ProgresoOrden({ estatus }) {
  const actual = PASOS_ORDEN.indexOf(estatus)
  const avance = actual <= 0 ? 0 : actual / (PASOS_ORDEN.length - 1)
  return (
    <div className="@container">
      <div className="relative">
        {/* Línea guía y tramo completado (decorativos) */}
        <div
          aria-hidden="true"
          style={{ '--p': avance }}
          className="pointer-events-none absolute bottom-3 left-[11px] top-3 w-0.5 bg-linea @[360px]:bottom-auto @[360px]:left-[10%] @[360px]:right-[10%] @[360px]:top-[11px] @[360px]:h-0.5 @[360px]:w-auto"
        >
          <span className="block h-[calc(var(--p)*100%)] w-full bg-tinta @[360px]:h-full @[360px]:w-[calc(var(--p)*100%)]" />
        </div>
        <ol
          aria-label="Progreso de la orden"
          className="relative flex flex-col gap-2 @[360px]:grid @[360px]:grid-cols-5 @[360px]:gap-0"
        >
          {PASOS_ORDEN.map((paso, i) => {
            const hecho = i < actual
            const esActual = i === actual
            return (
              <li
                key={paso}
                aria-current={esActual ? 'step' : undefined}
                className="flex items-center gap-3 @[360px]:flex-col @[360px]:gap-1 @[360px]:text-center"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <span
                    aria-hidden="true"
                    className={`flex items-center justify-center rounded-full border-2 font-display font-bold ${
                      esActual
                        ? 'h-6 w-6 border-tinta bg-amarillo text-sm text-tinta'
                        : hecho
                          ? 'h-[22px] w-[22px] border-tinta bg-tinta text-sm text-white'
                          : 'h-[22px] w-[22px] border-linea bg-fondo text-sm text-tenue'
                    }`}
                  >
                    {i + 1}
                  </span>
                </span>
                <span
                  className={`font-display text-[11px] uppercase leading-3 tracking-[0.08em] ${
                    esActual || hecho ? 'font-bold text-tinta' : 'text-tenue'
                  }`}
                >
                  <span aria-hidden="true" className="hidden @[360px]:inline">
                    {CORTAS[paso] ?? etiquetaOrden(paso)}
                  </span>
                  <span className="@[360px]:sr-only">{etiquetaOrden(paso)}</span>
                  <span className="sr-only">
                    {hecho ? ' (completado)' : esActual ? ' (paso actual)' : ' (pendiente)'}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
