import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { listarOrdenes } from '../../services/ordenes'
import { traducirError } from '../../services/errores'
import { formatearFechaHora } from '../../utils/fechas'
import { resumenTrabajo } from '../../utils/trabajo'
import { PASOS_ORDEN, etiquetaOrden, tonoOrden } from '../../utils/estatusOrden'
import BadgeEstatus from '../../components/BadgeEstatus'
import EstadoLista from '../../components/EstadoLista'
import { clasesBoton } from '../../components/clasesBoton'
import { useSecuencia } from '../../utils/formularios'

const ESTATUS = PASOS_ORDEN.map((p) => [p, etiquetaOrden(p)])
const MENSAJES_VACIO = {
  abiertas: 'No hay órdenes abiertas.',
  mis: 'No tienes trabajos abiertos.',
  sin_asignar: 'No hay órdenes sin asignar.',
}
const folio = (id) => `#${String(id).padStart(4, '0')}`
const cuando = (o) => formatearFechaHora(o.actualizado_en ?? o.creado_en)

export default function Ordenes() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [params] = useSearchParams()
  const FILTROS = [
    ['mis', 'Mis trabajos'],
    ['abiertas', 'Abiertas'],
    ...(esAdmin ? [['sin_asignar', 'Sin asignar']] : []),
    ...ESTATUS,
  ]
  const pedido = params.get('filtro')
  const [filtro, setFiltro] = useState(() =>
    pedido && (pedido === 'sin_asignar' ? esAdmin : pedido === 'mis' || pedido === 'abiertas')
      ? pedido
      : esAdmin
        ? 'abiertas'
        : 'mis',
  )
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const tabsRef = useRef([])
  const secuencia = useSecuencia()

  const cargar = useCallback(async () => {
    const n = secuencia.siguiente()
    setCargando(true)
    setError('')
    try {
      const lista = await listarOrdenes(filtro, { usuarioId: perfil?.id })
      if (secuencia.vigente(n)) setOrdenes(lista)
    } catch (e) {
      if (secuencia.vigente(n)) setError(traducirError(e, 'cargar'))
    } finally {
      if (secuencia.vigente(n)) setCargando(false)
    }
  }, [filtro, perfil, secuencia])

  useEffect(() => {
    cargar()
  }, [cargar])

  function teclas(e, i) {
    let destino = null
    if (e.key === 'ArrowRight') destino = (i + 1) % FILTROS.length
    else if (e.key === 'ArrowLeft') destino = (i - 1 + FILTROS.length) % FILTROS.length
    else if (e.key === 'Home') destino = 0
    else if (e.key === 'End') destino = FILTROS.length - 1
    if (destino === null) return
    e.preventDefault()
    setFiltro(FILTROS[destino][0])
    tabsRef.current[destino]?.focus()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-pagina text-tinta">Órdenes</h1>
        <Link to="/taller/ordenes/nueva" className={clasesBoton('primario')}>
          Nueva orden
        </Link>
      </div>

      <div role="tablist" aria-label="Filtrar órdenes" className="flex flex-wrap gap-2">
        {FILTROS.map(([valor, texto], i) => {
          const activo = filtro === valor
          return (
            <button
              key={valor}
              ref={(el) => {
                tabsRef.current[i] = el
              }}
              type="button"
              role="tab"
              id={`tab-${valor}`}
              aria-selected={activo}
              aria-controls="panel-ordenes"
              tabIndex={activo ? 0 : -1}
              onClick={() => setFiltro(valor)}
              onKeyDown={(e) => teclas(e, i)}
              className={`etiqueta min-h-11 border px-4 md:min-h-10 ${
                activo
                  ? 'border-tinta bg-amarillo text-tinta'
                  : 'border-linea bg-superficie text-tinta hover:border-tinta hover:bg-neutro-suave'
              }`}
            >
              {texto}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="panel-ordenes" aria-labelledby={`tab-${filtro}`}>
        <EstadoLista
          cargando={cargando}
          error={error}
          onReintentar={cargar}
          vacio={ordenes.length === 0}
          mensajeVacio={MENSAJES_VACIO[filtro] ?? 'No hay órdenes con este estatus.'}
        >
          <table className="tabla hidden md:table">
            <thead>
              <tr>
                <th scope="col">Folio</th>
                <th scope="col">Placa</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Cliente</th>
                <th scope="col">Trabajo</th>
                <th scope="col">Mecánico</th>
                <th scope="col">Estatus</th>
                <th scope="col">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/taller/ordenes/${o.id}`)}
                  className="cursor-pointer hover:bg-neutro-suave"
                >
                  <td>
                    <Link
                      to={`/taller/ordenes/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="enlace placa text-xl no-underline"
                    >
                      {folio(o.id)}
                      <span className="sr-only"> Orden</span>
                    </Link>
                  </td>
                  <td className="placa text-xl">{o.vehiculo?.placa}</td>
                  <td>
                    {o.vehiculo?.marca} {o.vehiculo?.modelo}
                  </td>
                  <td>{o.vehiculo?.cliente?.nombre}</td>
                  <td className="max-w-56 lg:max-w-72">
                    <p className="truncate" title={resumenTrabajo(o) || undefined}>
                      {resumenTrabajo(o) || <span className="text-tenue">Sin descripción</span>}
                    </p>
                  </td>
                  <td>{o.asignado?.nombre ?? <span className="text-tenue">Sin asignar</span>}</td>
                  <td>
                    <BadgeEstatus texto={etiquetaOrden(o.estatus)} tono={tonoOrden(o.estatus)} />
                  </td>
                  <td className="text-tenue">{cuando(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="lista-fichas md:hidden">
            {ordenes.map((o) => (
              <li key={o.id}>
                <Link to={`/taller/ordenes/${o.id}`} className="ficha block hover:bg-neutro-suave">
                  <div className="flex items-start justify-between gap-3">
                    <span className="placa text-2xl text-tinta">{o.vehiculo?.placa}</span>
                    <span className="etiqueta text-cobalto">Orden {folio(o.id)}</span>
                  </div>
                  <p className="mt-1 font-bold text-tinta">
                    {o.vehiculo?.marca} {o.vehiculo?.modelo}
                    {o.vehiculo?.cliente?.nombre && <span className="font-normal text-tenue"> · {o.vehiculo.cliente.nombre}</span>}
                  </p>
                  <p className="line-clamp-1 text-tinta">
                    <span className="etiqueta text-tenue">Trabajo: </span>
                    {resumenTrabajo(o) || <span className="text-tenue">Sin descripción</span>}
                  </p>
                  <p className="text-sm text-tenue">Mecánico: {o.asignado?.nombre ?? 'Sin asignar'}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <BadgeEstatus texto={etiquetaOrden(o.estatus)} tono={tonoOrden(o.estatus)} />
                    <span className="text-sm text-tenue">{cuando(o)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </EstadoLista>
      </div>
    </div>
  )
}
