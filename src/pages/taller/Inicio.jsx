import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { citasPorFecha } from '../../services/citas'
import { contarBajoStock } from '../../services/inventario'
import { listarOrdenes, buscarVehiculoPorPlaca, contarSinAsignar } from '../../services/ordenes'
import { useAuth } from '../../context/AuthContext'
import { traducirError } from '../../services/errores'
import { fechaLargaHoy } from '../../utils/fechas'
import { resumenTrabajo } from '../../utils/trabajo'
import { PASOS_ORDEN, etiquetaOrden } from '../../utils/estatusOrden'
import { bloquesDelDia, hoyEnTaller } from '../../utils/horarios'
import { normalizarPlaca, placaEscrita, placaValida } from '../../utils/placa'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'
import AgendaRejilla from '../../components/AgendaRejilla'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import EstadoLista from '../../components/EstadoLista'
import ProgresoOrden from '../../components/ProgresoOrden'

const folio = (id) => `Orden #${String(id).padStart(4, '0')}`

function BuscadorPlaca({ onMensaje }) {
  const navigate = useNavigate()
  const [placa, setPlaca] = useState('')
  const [errorCampo, setErrorCampo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const candado = useCandado()

  async function buscar(e) {
    e.preventDefault()
    const form = e.currentTarget
    onMensaje('')
    const normalizada = normalizarPlaca(placa)
    if (!normalizada) {
      setErrorCampo('Escribe la placa del vehículo.')
      enfocarPrimerError(form)
      return
    }
    if (!placaValida(normalizada)) {
      setErrorCampo('La placa debe tener entre 5 y 8 letras o números, sin símbolos.')
      enfocarPrimerError(form)
      return
    }
    setErrorCampo('')
    if (!candado.tomar()) return
    setBuscando(true)
    try {
      const v = await buscarVehiculoPorPlaca(normalizada)
      if (v) navigate(`/taller/vehiculos/${v.id}`)
      else onMensaje(`No se encontró ningún vehículo con la placa ${normalizada}. Revisa que esté bien escrita.`)
    } catch (err) {
      onMensaje(traducirError(err, 'cargar'))
    } finally {
      candado.soltar()
      setBuscando(false)
    }
  }

  return (
    <form onSubmit={buscar} noValidate role="search" className="w-full md:w-auto">
      <div className="flex gap-2">
        <label htmlFor="buscar-placa" className="sr-only">
          Buscar vehículo por placa
        </label>
        <input
          id="buscar-placa"
          className="campo min-w-0 md:w-72"
          placeholder="Buscar vehículo por placa"
          value={placa}
          onChange={(e) => setPlaca(placaEscrita(e.target.value))}
          maxLength={LIMITES.placaEscrita}
          aria-invalid={errorCampo ? 'true' : undefined}
          aria-describedby={errorCampo ? 'buscar-placa-error' : undefined}
          autoComplete="off"
        />
        <Boton type="submit" cargando={buscando}>
          Buscar
        </Boton>
      </div>
      {errorCampo && (
        <p id="buscar-placa-error" className="mt-1.5 text-sm font-bold text-cancelada">
          {errorCampo}
        </p>
      )}
    </form>
  )
}

function CeldaCita({ c }) {
  return (
    <div className="flex h-full flex-col gap-1">
      <span className="placa text-2xl text-tinta">{c.vehiculo?.placa}</span>
      <p className="truncate font-bold text-tinta" title={c.cliente?.nombre}>
        {c.cliente?.nombre}
      </p>
      <p className="line-clamp-2 text-sm text-tenue" title={c.motivo}>
        {c.motivo}
      </p>
      <div className="flex items-center justify-between gap-2">
        <BadgeEstatus
          texto={c.estatus === 'confirmada' ? 'Confirmada' : 'Pendiente'}
          tono={c.estatus === 'confirmada' ? 'verde' : 'amarillo'}
        />
        <small className="text-tenue">Cita #{String(c.id).padStart(3, '0')}</small>
      </div>
    </div>
  )
}

function FichaOrden({ o }) {
  const paso = PASOS_ORDEN.indexOf(o.estatus) + 1
  return (
    <li className="ficha">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="placa text-2xl text-tinta">{o.vehiculo?.placa}</h3>
          <p className="mt-1 font-bold text-tinta">
            {o.vehiculo?.marca} {o.vehiculo?.modelo} {o.vehiculo?.anio}
            <span className="font-normal text-tenue"> · {o.vehiculo?.cliente?.nombre}</span>
          </p>
          <p className="text-sm text-tenue">Mecánico: {o.asignado?.nombre ?? 'Sin asignar'}</p>
          <p className="line-clamp-1 text-sm text-tinta">
            <span className="etiqueta text-tenue">Trabajo: </span>
            {resumenTrabajo(o) || <span className="text-tenue">Sin descripción</span>}
          </p>
        </div>
        <span className="etiqueta shrink-0 text-cobalto">{folio(o.id)}</span>
      </div>
      <ProgresoOrden estatus={o.estatus} />
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-linea pt-1.5">
        <span className="etiqueta text-tinta">
          {paso} · {etiquetaOrden(o.estatus)}
        </span>
        <Link to={`/taller/ordenes/${o.id}`} className="enlace">
          Ver {folio(o.id)}
        </Link>
      </div>
    </li>
  )
}

export default function InicioTaller() {
  const [citas, setCitas] = useState([])
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [ordenes, setOrdenes] = useState([])
  const [mis, setMis] = useState([])
  const [sinAsignar, setSinAsignar] = useState(0)
  const [bajoStock, setBajoStock] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const abiertas = esAdmin ? ordenes : ordenes.filter((o) => o.asignado_a !== perfil?.id)

  const bloques = bloquesDelDia(hoyEnTaller())

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [c, o, m, n, b] = await Promise.all([
        citasPorFecha(hoyEnTaller()),
        listarOrdenes('abiertas'),
        esAdmin ? Promise.resolve([]) : listarOrdenes('mis', { usuarioId: perfil?.id }),
        esAdmin ? contarSinAsignar() : Promise.resolve(0),
        contarBajoStock().catch(() => 0),
      ])
      setBajoStock(b)
      setMis(m)
      setSinAsignar(n)
      setCitas(c.filter((x) => x.estatus === 'pendiente' || x.estatus === 'confirmada'))
      setOrdenes(o)
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [esAdmin, perfil])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-5">
      <EncabezadoPagina titulo="Inicio del taller" fecha={fechaLargaHoy()} acciones={<BuscadorPlaca onMensaje={setMensaje} />} />
      <Alerta>{mensaje}</Alerta>

      <EstadoLista cargando={cargando} error={error} onReintentar={cargar}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-labelledby="titulo-citas-hoy" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 id="titulo-citas-hoy" className="titulo-seccion text-tinta">
                Agenda de hoy
              </h2>
              <span className="etiqueta text-tenue">3 lugares por hora</span>
            </div>
            {bloques.length === 0 ? (
              <p className="border border-dashed border-linea px-4 py-4 text-tenue">El taller no abre hoy.</p>
            ) : (
              <AgendaRejilla
                bloques={bloques}
                citas={citas}
                etiqueta="Agenda de hoy"
                mensajeVacio="No hay citas para hoy."
                renderCita={(c) => <CeldaCita c={c} />}
              />
            )}
          </section>

          <div className="min-w-0 space-y-6">
          {bajoStock > 0 && (
            <Alerta tipo="info">
              <strong>{bajoStock}</strong> {bajoStock === 1 ? 'pieza con bajo stock o agotada' : 'piezas con bajo stock o agotadas'}.{' '}
              <Link to="/taller/inventario?filtro=bajo" className="enlace">
                Ver piezas con bajo stock
              </Link>
            </Alerta>
          )}
          {esAdmin && sinAsignar > 0 && (
            <Alerta tipo="info">
              Órdenes sin asignar: <strong>{sinAsignar}</strong>.{' '}
              <Link to="/taller/ordenes?filtro=sin_asignar" className="enlace">
                Ver órdenes sin asignar
              </Link>
            </Alerta>
          )}
          {!esAdmin && (
            <section aria-labelledby="titulo-mis-trabajos" className="min-w-0">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="titulo-mis-trabajos" className="titulo-seccion text-tinta">
                  Mis trabajos ({mis.length})
                </h2>
                <Link to="/taller/ordenes?filtro=mis" className="enlace">
                  Ver todos mis trabajos
                </Link>
              </div>
              <EstadoLista vacio={mis.length === 0} mensajeVacio="No tienes trabajos asignados.">
                <ul className="lista-fichas">
                  {mis.slice(0, 5).map((o) => (
                    <FichaOrden key={o.id} o={o} />
                  ))}
                </ul>
              </EstadoLista>
            </section>
          )}
          <section aria-labelledby="titulo-ordenes-abiertas" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 id="titulo-ordenes-abiertas" className="titulo-seccion text-tinta">
                {esAdmin ? 'Órdenes abiertas' : 'Otras órdenes abiertas'} ({abiertas.length})
              </h2>
              <Link to="/taller/ordenes" className="enlace">
                Ver todas las órdenes
              </Link>
            </div>
            <EstadoLista
              vacio={abiertas.length === 0}
              mensajeVacio={esAdmin ? 'No hay órdenes abiertas.' : 'No hay otras órdenes abiertas.'}
            >
              <ul className="lista-fichas">
                {abiertas.slice(0, 5).map((o) => (
                  <FichaOrden key={o.id} o={o} />
                ))}
              </ul>
            </EstadoLista>
          </section>
          </div>
        </div>
      </EstadoLista>
    </div>
  )
}
