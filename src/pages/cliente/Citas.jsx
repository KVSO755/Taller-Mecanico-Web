import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { cancelarCita, misCitas } from '../../services/citas'
import { traducirError } from '../../services/errores'
import { formatearFechaHora } from '../../utils/fechas'
import { etiquetaCliente as etiquetaDeCita } from '../../utils/estatusCita'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import { clasesBoton } from '../../components/clasesBoton'
import EstadoLista from '../../components/EstadoLista'
import { useCandado } from '../../utils/formularios'

const UNA_HORA = 60 * 60 * 1000

function IconoTelefono() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square">
      <path d="M4 3h3l1.5 4-2 1.5a10 10 0 005 5L13 11.5l4 1.5v3a1 1 0 01-1 1A13 13 0 013 4a1 1 0 011-1z" />
    </svg>
  )
}

export default function Citas() {
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [cancelando, setCancelando] = useState(null)
  const candado = useCandado()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setCitas(await misCitas())
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function cancelar(c) {
    if (!candado.tomar()) return
    if (!window.confirm('¿Seguro que quieres cancelar esta cita?')) {
      candado.soltar()
      return
    }
    setCancelando(c.id)
    setErrorAccion('')
    try {
      await cancelarCita(c.id)
      await cargar()
    } catch (e) {
      setErrorAccion(traducirError(e, 'guardar'))
      // Puede que el estado haya cambiado (p. ej. pasó la hora límite): refrescar.
      if (e?.code === 'P0001') await cargar()
    } finally {
      candado.soltar()
      setCancelando(null)
    }
  }

  // Particiona al renderizar: próximas (activas y futuras) y anteriores.
  const esProxima = (c) =>
    (c.estatus === 'pendiente' || c.estatus === 'confirmada') && new Date(c.fecha_hora).getTime() > Date.now()
  const proximas = citas.filter(esProxima)
  const anteriores = citas.filter((c) => !esProxima(c))

  function accion(c) {
    const activa = c.estatus === 'pendiente' || c.estatus === 'confirmada'
    const futura = new Date(c.fecha_hora).getTime() > Date.now()
    const puedeCancelar = activa && new Date(c.fecha_hora).getTime() - Date.now() > UNA_HORA
    if (puedeCancelar) {
      return (
        <Boton variante="peligro" cargando={cancelando === c.id} onClick={() => cancelar(c)}>
          Cancelar
        </Boton>
      )
    }
    if (activa && futura) {
      return (
        <p className="flex items-start gap-2 text-sm text-tenue">
          <IconoTelefono />
          <span>Ya no puedes cancelar en línea. Llama al taller.</span>
        </p>
      )
    }
    return null
  }

  function grupo(id, titulo, lista) {
    if (lista.length === 0) return null
    return (
      <section aria-labelledby={id} className="space-y-3">
        <h2 id={id} className="titulo-seccion">
          {titulo}
        </h2>
        <table className="tabla hidden md:table">
          <thead>
            <tr>
              <th scope="col">Folio</th>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Placa</th>
              <th scope="col">Motivo</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const { texto, tono } = etiquetaDeCita(c)
              return (
                <tr key={c.id}>
                  <td className="placa whitespace-nowrap text-lg">Cita #{c.id}</td>
                  <td className="font-bold">{formatearFechaHora(c.fecha_hora)}</td>
                  <td>
                    <span className="placa text-xl">{c.vehiculo?.placa}</span>
                    <span className="block text-tenue">
                      {c.vehiculo?.marca} {c.vehiculo?.modelo}
                    </span>
                  </td>
                  <td className="max-w-xs">{c.motivo}</td>
                  <td>
                    <BadgeEstatus texto={texto} tono={tono} />
                  </td>
                  <td>{accion(c)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <ul className="space-y-3 md:hidden">
          {lista.map((c) => {
            const { texto, tono } = etiquetaDeCita(c)
            return (
              <li key={c.id} className="ficha space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="placa text-lg">Cita #{c.id}</span>
                  <BadgeEstatus texto={texto} tono={tono} />
                </div>
                <p className="font-bold">{formatearFechaHora(c.fecha_hora)}</p>
                <p>
                  <span className="placa text-xl">{c.vehiculo?.placa}</span>
                  <span className="text-tenue">
                    {' '}
                    · {c.vehiculo?.marca} {c.vehiculo?.modelo}
                  </span>
                </p>
                <p>{c.motivo}</p>
                {accion(c)}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-pagina">Mis citas</h1>
        <Link to="/cliente/citas/nueva" className={clasesBoton('primario')}>
          Agendar cita
        </Link>
      </div>
      <Alerta tipo="error">{errorAccion}</Alerta>
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={citas.length === 0}
        mensajeVacio="Aún no tienes citas."
        accionVacia={
          <Link to="/cliente/citas/nueva" className={clasesBoton('secundario')}>
            Agendar cita
          </Link>
        }
      >
        <div className="space-y-6">
          {grupo('titulo-proximas', 'Próximas', proximas)}
          {grupo('titulo-anteriores', 'Anteriores', anteriores)}
        </div>
      </EstadoLista>
    </div>
  )
}
