import { ZONA, etiquetaHora } from '../utils/horarios'

const LUGARES = 3

const fmtHora = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' })

// Hora entera (0-23) de una cita en la zona del taller.
function horaDeCita(iso) {
  return Number(fmtHora.format(new Date(iso)))
}

// Retícula hora x 3 lugares. Las citas no tienen lugar asignado: se llenan en orden.
// En celular cada hora es un encabezado con sus citas debajo.
export default function AgendaRejilla({ bloques, citas, renderCita, etiqueta = 'Agenda por hora', mensajeVacio }) {
  const porHora = new Map()
  for (const c of citas) {
    const h = horaDeCita(c.fecha_hora)
    if (!porHora.has(h)) porHora.set(h, [])
    porHora.get(h).push(c)
  }
  const horas = [...new Set([...bloques.map((b) => b.hora), ...porHora.keys()])].sort((a, b) => a - b)

  // Día sin citas activas: mensaje y una línea tenue por hora, sin celdas "Libre".
  if (citas.length === 0) {
    return (
      <div>
        {mensajeVacio && <p className="mb-3 text-tenue">{mensajeVacio}</p>}
        <ol aria-label={etiqueta} className="border-t-2 border-tinta">
          {horas.map((h) => (
            <li key={h} className="flex flex-wrap items-baseline gap-x-2 border-b border-linea py-2 text-tenue">
              <span className="placa w-14 text-lg">{etiquetaHora(h)}</span>
              <span>
                · Libre · {LUGARES} lugares
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <ol aria-label={etiqueta} className="border-t-2 border-tinta">
      {horas.map((h) => {
        const lista = porHora.get(h) ?? []
        const libres = Math.max(0, LUGARES - lista.length)
        if (lista.length === 0) {
          return (
            <li key={h} className="border-b border-linea py-2 md:grid md:grid-cols-[64px_minmax(0,1fr)] md:gap-3">
              <div className="mb-1 flex items-center gap-3 md:mb-0 md:block">
                <h3 className="placa text-xl text-tinta">{etiquetaHora(h)}</h3>
              </div>
              <p className="etiqueta flex min-h-11 items-center justify-center border border-dashed border-linea px-3 text-tenue md:h-9 md:min-h-0">
                Libre · {LUGARES} lugares
              </p>
            </li>
          )
        }
        return (
          <li key={h} className="border-b border-linea py-2 md:grid md:grid-cols-[64px_minmax(0,1fr)] md:gap-3">
            <div className="mb-1 flex items-center gap-3 md:mb-0 md:block">
              <h3 className="placa text-xl text-tinta">{etiquetaHora(h)}</h3>
              {lista.length >= LUGARES && (
                <span className="etiqueta mt-1 inline-block bg-tinta px-2 text-white">Lleno</span>
              )}
            </div>
            <div className="grid min-w-0 gap-2 md:grid-cols-3 md:items-start">
              {lista.map((c) => (
                <div key={c.id} className="min-w-0 border border-linea bg-superficie p-2.5">
                  {renderCita(c)}
                </div>
              ))}
              {Array.from({ length: libres }, (_, i) => (
                <div
                  key={`libre-${i}`}
                  className="etiqueta hidden min-h-9 items-center justify-center border border-dashed border-linea text-tenue md:flex"
                >
                  Libre
                </div>
              ))}
              {libres > 0 && (
                <p className="etiqueta border border-dashed border-linea px-3 py-1.5 text-tenue md:hidden">
                  Libre · {libres} {libres === 1 ? 'lugar' : 'lugares'}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
