import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { cancelarCita, citasPorFecha, confirmarCita } from '../../services/citas'
import { traducirError } from '../../services/errores'
import { formatearFechaHora } from '../../utils/fechas'
import { diaLocal, etiquetaTaller } from '../../utils/estatusCita'
import { bloquesDelDia, fechaValida, hoyEnTaller, mesValido } from '../../utils/horarios'
import { useCandado, useSecuencia } from '../../utils/formularios'
import AgendaMes from '../../components/AgendaMes'
import AgendaRejilla from '../../components/AgendaRejilla'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import Input from '../../components/Input'
import ReprogramarCita from '../../components/ReprogramarCita'
import { clasesBoton } from '../../components/clasesBoton'

const QUINCE_MIN = 15 * 60 * 1000
const MENSAJE_FALLA = 'No se pudo actualizar la cita. Intenta de nuevo.'
const ESTATUS = [
  ['', 'Todas'],
  ['pendiente', 'Pendiente'],
  ['confirmada', 'Confirmada'],
  ['cancelada', 'Cancelada'],
  ['atendida', 'Atendida'],
]

function hora(iso) {
  return formatearFechaHora(iso).split(',').pop().trim()
}

const esActiva = (c) => c.estatus === 'pendiente' || c.estatus === 'confirmada'

const BASE_VISTA =
  'etiqueta min-h-11 border px-4 md:min-h-10 transition-colors'

export default function Citas() {
  const [params, setParams] = useSearchParams()
  const f = params.get('fecha')
  // Parámetros inválidos (?fecha=2026-99-99, ?mes=hola) caen al valor por defecto.
  const fecha = fechaValida(f) ? f : hoyEnTaller()
  const mp = params.get('mes')
  const mes = mesValido(mp) ? mp : fecha.slice(0, 7)
  const vista = params.get('vista') === 'mes' ? 'mes' : 'dia'

  const irADia = (valor) => setParams(valor ? { vista: 'dia', fecha: valor } : { vista: 'dia' }, { replace: true })
  const irAMes = (valor) => setParams({ vista: 'mes', mes: valor }, { replace: true })
  const hrefDia = (valor) => `/taller/citas?vista=dia&fecha=${valor}`

  return (
    <div className="space-y-5">
      <EncabezadoPagina titulo="Citas" />
      <div role="group" aria-label="Vista de la agenda" className="flex gap-2">
        {[
          ['dia', 'Día', () => irADia(fecha)],
          ['mes', 'Mes', () => irAMes(mes)],
        ].map(([v, texto, ir]) => (
          <button
            key={v}
            type="button"
            aria-pressed={vista === v}
            onClick={ir}
            className={`${BASE_VISTA} ${
              vista === v ? 'border-tinta bg-amarillo text-tinta' : 'border-linea bg-superficie text-tinta hover:bg-neutro-suave'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
      {vista === 'mes' ? (
        <AgendaMes mes={mes} onCambiarMes={irAMes} enlaceDia={hrefDia} />
      ) : (
        <VistaDia fecha={fecha} setFecha={irADia} hrefMes={`/taller/citas?vista=mes&mes=${fecha.slice(0, 7)}`} />
      )}
    </div>
  )
}

function VistaDia({ fecha, setFecha, hrefMes }) {
  const [estatus, setEstatus] = useState('')
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [ocupada, setOcupada] = useState(null)
  const [reprogramando, setReprogramando] = useState(null)
  const candado = useCandado()
  const secuencia = useSecuencia()

  const cargar = useCallback(async () => {
    if (!fecha) return
    const n = secuencia.siguiente()
    setCargando(true)
    setError('')
    try {
      const lista = await citasPorFecha(fecha, estatus || null)
      if (secuencia.vigente(n)) setCitas(lista)
    } catch (e) {
      if (secuencia.vigente(n)) setError(traducirError(e, 'cargar'))
    } finally {
      if (secuencia.vigente(n)) setCargando(false)
    }
  }, [fecha, estatus, secuencia])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function accion(c, fn, confirmacion) {
    if (!candado.tomar()) return
    if (confirmacion && !window.confirm(confirmacion)) {
      candado.soltar()
      return
    }
    setOcupada(c.id)
    setErrorAccion('')
    try {
      await fn(c.id)
      await cargar()
    } catch (e) {
      const msg = traducirError(e, 'guardar')
      setErrorAccion(msg === 'No se pudo guardar. Intenta de nuevo.' ? MENSAJE_FALLA : msg)
      if (e?.code === 'P0001') await cargar()
    } finally {
      candado.soltar()
      setOcupada(null)
    }
  }

  const cerrarModal = useCallback(
    (recargar, mensaje) => {
      setReprogramando(null)
      if (mensaje) setErrorAccion(mensaje)
      if (recargar) cargar()
    },
    [cargar],
  )

  const hoy = hoyEnTaller()
  const activas = citas.filter(esActiva)
  const cerradas = citas.filter((c) => !esActiva(c))
  const bloques = fecha ? bloquesDelDia(fecha) : []
  const conRejilla = estatus === ''

  // Contenido de una cita con sus acciones (celda de la conRejilla o ficha de la lista).
  function contenidoCita(c, conHora = false) {
    const { texto, tono } = etiquetaTaller(c)
    const tel = c.cliente?.telefono
    const ms = new Date(c.fecha_hora).getTime()
    const puedeConfirmar = c.estatus === 'pendiente' && Date.now() <= ms + QUINCE_MIN
    const activa = esActiva(c)
    const puedeOrden = c.estatus === 'confirmada' && diaLocal(c.fecha_hora) === hoy
    return (
      <div className="flex h-full flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="placa text-2xl text-tinta">{c.vehiculo?.placa}</span>
          {conHora && <span className="etiqueta text-tenue">{hora(c.fecha_hora)}</span>}
        </div>
        <div>
          <p className="font-bold text-tinta">{c.cliente?.nombre}</p>
          {tel && (
            <p className="text-sm text-tenue">
              Tel.{' '}
              <a href={`tel:${tel}`} className="enlace">
                {tel}
              </a>
            </p>
          )}
          <p className="text-sm text-tenue">
            {c.vehiculo?.marca} {c.vehiculo?.modelo}
          </p>
          <p className="line-clamp-2 text-sm text-tinta" title={c.motivo}>
            {c.motivo}
          </p>
        </div>
        <div>
          <BadgeEstatus texto={texto} tono={tono} />
        </div>
        {activa && (
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            {puedeConfirmar && (
              <Boton compacto className="w-full" cargando={ocupada === c.id} onClick={() => accion(c, confirmarCita)}>
                Confirmar
              </Boton>
            )}
            {puedeOrden && (
              <Link to={`/taller/ordenes/nueva?citaId=${c.id}`} className={clasesBoton('primario', 'w-full', true)}>
                Crear orden
              </Link>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Boton compacto variante="secundario" className="px-2!" onClick={() => setReprogramando(c)}>
                Reprogramar
              </Boton>
              <Boton
                compacto
                variante="peligro"
                className="px-2!"
                cargando={ocupada === c.id}
                onClick={() => accion(c, cancelarCita, '¿Seguro que quieres cancelar esta cita?')}
              >
                Cancelar
              </Boton>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 border border-linea bg-superficie p-3">
        <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <div>
          <label htmlFor="filtro-estatus" className="etiqueta mb-1.5 block text-tinta">
            Estatus
          </label>
          <select
            id="filtro-estatus"
            value={estatus}
            onChange={(e) => setEstatus(e.target.value)}
            className="campo sm:w-48"
          >
            {ESTATUS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Link to={hrefMes} className="enlace ml-auto inline-flex min-h-11 items-center md:min-h-10">
          Ver mes
        </Link>
      </div>

      <Alerta tipo="error">{errorAccion}</Alerta>

      <EstadoLista cargando={cargando} error={error} onReintentar={cargar}>
        <section aria-labelledby="titulo-agenda" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 id="titulo-agenda" className="titulo-seccion text-tinta">
              Agenda del día
            </h2>
            {conRejilla && <span className="etiqueta text-tenue">3 lugares por hora</span>}
          </div>
          {!conRejilla && citas.length === 0 && <p className="mb-3 text-tenue">No hay citas para este día.</p>}
          {conRejilla ? (
            bloques.length === 0 && activas.length === 0 ? (
              <p className="border border-dashed border-linea px-4 py-8 text-tenue">El taller no abre este día.</p>
            ) : (
              <AgendaRejilla
                bloques={bloques}
                citas={activas}
                etiqueta="Agenda del día"
                mensajeVacio="No hay citas para este día."
                renderCita={(c) => contenidoCita(c)}
              />
            )
          ) : (
            activas.length > 0 && (
              <ul className="grid gap-2 border-t-2 border-tinta pt-3 md:grid-cols-2 xl:grid-cols-3">
                {activas.map((c) => (
                  <li key={c.id} className="border border-linea bg-superficie p-3">
                    {contenidoCita(c, true)}
                  </li>
                ))}
              </ul>
            )
          )}
        </section>

        {cerradas.length > 0 && (
          <section aria-labelledby="titulo-cerradas" className="min-w-0">
            <h2 id="titulo-cerradas" className="titulo-seccion mb-4 text-tinta">
              Canceladas y atendidas
            </h2>
            <ul className="border-t-2 border-tinta">
              {cerradas.map((c) => {
                const { texto, tono } = etiquetaTaller(c)
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-linea px-1 py-3"
                  >
                    <span className="placa w-16 text-2xl text-tenue">{hora(c.fecha_hora)}</span>
                    <span className="placa text-2xl text-tinta">{c.vehiculo?.placa}</span>
                    <span className="min-w-0 flex-1 basis-48 text-tinta">
                      {c.cliente?.nombre} <span className="text-tenue">· {c.motivo}</span>
                    </span>
                    <BadgeEstatus texto={texto} tono={tono} />
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </EstadoLista>

      {reprogramando && (
        <ReprogramarCita cita={reprogramando} onGuardado={() => cerrarModal(true)} onCerrar={cerrarModal} />
      )}
    </div>
  )
}
