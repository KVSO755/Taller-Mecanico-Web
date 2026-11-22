import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { citasPorRango } from '../services/citas'
import { traducirError } from '../services/errores'
import { diaLocal } from '../utils/estatusCita'
import { bloquesDelDia, esDomingo, hoyEnTaller } from '../utils/horarios'
import { clasesBoton } from './clasesBoton'
import EstadoLista from './EstadoLista'

const CAPACIDAD = 3
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const ENCABEZADOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const dos = (n) => String(n).padStart(2, '0')
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function partesMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  return { a, m }
}
// Suma `n` meses a 'YYYY-MM' (calendario puro, vía UTC).
function sumarMeses(mes, n) {
  const { a, m } = partesMes(mes)
  const d = new Date(Date.UTC(a, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}`
}
// Índice de día de la semana con 0 = lunes.
function indiceSemana(a, m, d) {
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7
}
function etiquetaDia(fecha) {
  const [a, m, d] = fecha.split('-').map(Number)
  return `${DIAS[indiceSemana(a, m, d)]} ${d} de ${MESES[m - 1]}`
}

export default function AgendaMes({ mes, onCambiarMes, enlaceDia }) {
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const hoy = hoyEnTaller()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setCitas(await citasPorRango(`${mes}-01`, `${sumarMeses(mes, 1)}-01`))
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [mes])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Resumen por día de las citas activas (pendiente + confirmada).
  const porDia = new Map()
  for (const c of citas) {
    if (c.estatus !== 'pendiente' && c.estatus !== 'confirmada') continue
    const f = diaLocal(c.fecha_hora)
    if (!porDia.has(f)) porDia.set(f, { pendientes: 0, confirmadas: 0, horas: new Map() })
    const r = porDia.get(f)
    if (c.estatus === 'pendiente') r.pendientes++
    else r.confirmadas++
    r.horas.set(c.fecha_hora, (r.horas.get(c.fecha_hora) ?? 0) + 1)
  }
  function resumen(fecha) {
    const r = porDia.get(fecha)
    const llenas = r ? [...r.horas.values()].filter((n) => n >= CAPACIDAD).length : 0
    return {
      total: r ? r.pendientes + r.confirmadas : 0,
      pendientes: r?.pendientes ?? 0,
      confirmadas: r?.confirmadas ?? 0,
      llenas,
      lugares: bloquesDelDia(fecha).length * CAPACIDAD,
    }
  }
  function descripcion(fecha) {
    const s = resumen(fecha)
    if (esDomingo(fecha)) return `${etiquetaDia(fecha)}: cerrado`
    if (s.total === 0) return `${etiquetaDia(fecha)}: sin citas`
    const partes = [plural(s.total, 'cita', 'citas')]
    if (s.pendientes) partes.push(plural(s.pendientes, 'pendiente', 'pendientes'))
    if (s.llenas) partes.push(plural(s.llenas, 'hora llena', 'horas llenas'))
    return `${etiquetaDia(fecha)}: ${partes.join(', ')}`
  }

  const { a, m } = partesMes(mes)
  const nombre = `${cap(MESES[m - 1])} ${a}`
  const nDias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const vacios = indiceSemana(a, m, 1)
  const fechas = Array.from({ length: nDias }, (_, i) => `${mes}-${dos(i + 1)}`)
  const diasConCitas = fechas.filter((f) => resumen(f).total > 0)
  const botonMes = clasesBoton('secundario', '', true)

  return (
    <section aria-labelledby="titulo-mes" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-mes" className="titulo-seccion text-tinta" aria-live="polite">
          {nombre}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonMes} onClick={() => onCambiarMes(sumarMeses(mes, -1))}>
            ‹ Mes anterior
          </button>
          <button type="button" className={botonMes} onClick={() => onCambiarMes(hoy.slice(0, 7))}>
            Hoy
          </button>
          <button type="button" className={botonMes} onClick={() => onCambiarMes(sumarMeses(mes, 1))}>
            Mes siguiente ›
          </button>
        </div>
      </div>

      <EstadoLista cargando={cargando} error={error} onReintentar={cargar}>
        {diasConCitas.length === 0 && <p className="text-tenue">No hay citas en {nombre.toLowerCase()}.</p>}

        <div className="border-t-2 border-tinta">
          <div className="grid grid-cols-7 gap-px border-b border-linea" aria-hidden="true">
            {ENCABEZADOS.map((d, i) => (
              <span key={i} className="etiqueta py-1.5 text-center text-tenue">
                {d}
              </span>
            ))}
          </div>
          <ul className="grid grid-cols-7 gap-px bg-linea" aria-label={`Calendario de ${nombre}`}>
            {Array.from({ length: vacios }, (_, i) => (
              <li key={`v-${i}`} aria-hidden="true" className="min-h-14 bg-neutro-suave/60 md:min-h-28" />
            ))}
            {fechas.map((f) => {
              const s = resumen(f)
              const esHoy = f === hoy
              const dia = Number(f.slice(8))
              const marco = esHoy ? 'outline-2 -outline-offset-2 outline-cobalto' : ''
              if (esDomingo(f)) {
                return (
                  <li
                    key={f}
                    aria-label={descripcion(f)}
                    className={`min-h-14 min-w-0 bg-neutro-suave p-1 text-tenue md:min-h-28 md:p-2 ${marco}`}
                  >
                    <span className="placa text-lg md:text-2xl">{dia}</span>
                    <span className="etiqueta mt-1 hidden md:block">Cerrado</span>
                  </li>
                )
              }
              return (
                <li key={f} className={`min-w-0 bg-superficie ${marco}`}>
                  <Link
                    to={enlaceDia(f)}
                    aria-label={descripcion(f)}
                    aria-current={esHoy ? 'date' : undefined}
                    className="flex min-h-14 flex-col gap-1 p-1 hover:bg-cobalto-suave md:min-h-28 md:p-2"
                  >
                    <span className="placa text-lg text-tinta md:text-2xl">{dia}</span>
                    {s.total > 0 && (
                      <>
                        <span aria-hidden="true" className="etiqueta text-tinta md:hidden">
                          {s.total}
                        </span>
                        <span aria-hidden="true" className="hidden min-w-0 flex-col gap-1 md:flex">
                          <span className="font-bold text-tinta">{plural(s.total, 'cita', 'citas')}</span>
                          <span className="etiqueta flex flex-wrap gap-x-3 text-tinta">
                            {s.pendientes > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 bg-pendiente" />
                                {s.pendientes} pend.
                              </span>
                            )}
                            {s.confirmadas > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 bg-confirmada" />
                                {s.confirmadas} conf.
                              </span>
                            )}
                          </span>
                          <span className="etiqueta text-tenue">
                            {s.total}/{s.lugares} lugares
                          </span>
                          {s.llenas > 0 && (
                            <span className="etiqueta self-start bg-tinta px-2 text-white">
                              {s.llenas === 1 ? '1 hora llena' : `${s.llenas} horas llenas`}
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {diasConCitas.length > 0 && (
          <div className="mt-4 md:hidden">
            <h3 className="titulo-seccion mb-2 text-tinta">Días con citas</h3>
            <ul className="border-t-2 border-tinta">
              {diasConCitas.map((f) => {
                const s = resumen(f)
                return (
                  <li key={f} className="border-b border-linea">
                    <Link
                      to={enlaceDia(f)}
                      className="flex min-h-11 items-center justify-between gap-3 px-1 py-2 hover:bg-cobalto-suave"
                    >
                      <span className="font-bold text-tinta">{cap(etiquetaDia(f))}</span>
                      <span className="text-sm text-tenue">
                        {plural(s.total, 'cita', 'citas')}
                        {s.pendientes > 0 && ` · ${plural(s.pendientes, 'pendiente', 'pendientes')}`}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </EstadoLista>
    </section>
  )
}
