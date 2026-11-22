import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { obtenerOrden, guardarNotas, avanzarEstatus, asignarOrden } from '../../services/ordenes'
import { facturaDeOrden } from '../../services/facturas'
import { parsearManoObra } from '../../utils/trabajo'
import { listarMecanicos } from '../../services/perfiles'
import { useAuth } from '../../context/AuthContext'
import { MENSAJE_RED, traducirError } from '../../services/errores'
import { formatearFechaHora } from '../../utils/fechas'
import { PASOS_ORDEN, etiquetaOrden, siguienteEstatus, tonoOrden } from '../../utils/estatusOrden'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import ProgresoOrden from '../../components/ProgresoOrden'
import RefaccionesOrden from '../../components/RefaccionesOrden'
import Textarea from '../../components/Textarea'
import { LIMITES, idValido, useCandado } from '../../utils/formularios'

const MSG_CONCURRENCIA = 'La orden ya fue actualizada por otra persona.'
const MSG_FALLA = 'No se pudo actualizar la orden. Intenta de nuevo.'

function mensajeActualizar(e) {
  const m = traducirError(e, 'guardar')
  return m === 'No se pudo guardar. Intenta de nuevo.' ? MSG_FALLA : m
}

const folio = (id) => `Orden #${String(id).padStart(4, '0')}`
const numeroPaso = (estatus) => PASOS_ORDEN.indexOf(estatus) + 1

export default function DetalleOrden() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orden, setOrden] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [trabajo, setTrabajo] = useState('')
  const [manoObra, setManoObra] = useState('')
  const [factura, setFactura] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [avanzando, setAvanzando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState(null) // { tipo, texto }
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [mecanicos, setMecanicos] = useState([])
  const [seleccion, setSeleccion] = useState('')
  const [asignando, setAsignando] = useState(false)
  const candado = useCandado()

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setCargando(true)
      setError('')
      try {
        const o = idValido(id) ? await obtenerOrden(id) : null
        setOrden(o)
        setDiagnostico(o?.diagnostico ?? '')
        setTrabajo(o?.trabajo_realizado ?? '')
        setManoObra(o?.mano_obra == null ? '' : String(o.mano_obra))
        setFactura(o?.estatus === 'entregado' ? await facturaDeOrden(o.id).catch(() => null) : null)
        setSeleccion(o?.asignado_a ?? '')
      } catch (e) {
        setError(traducirError(e, 'cargar'))
      } finally {
        setCargando(false)
      }
    },
    [id],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!esAdmin) return
    let activo = true
    listarMecanicos()
      .then((m) => activo && setMecanicos(m))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [esAdmin])

  const cerrada = orden?.estatus === 'entregado'
  // Solo el admin y el mecánico asignado editan; los demás empleados solo leen.
  const puedeEditar = esAdmin || (!!orden?.asignado_a && orden.asignado_a === perfil?.id)
  const avisoSoloLectura = orden?.asignado_a
    ? 'Esta orden está asignada a otro mecánico.'
    : 'Esta orden no tiene mecánico asignado. Pide al administrador que la asigne.'
  const siguiente = orden ? siguienteEstatus(orden.estatus) : null
  const mo = parsearManoObra(manoObra)
  const manoGuardada = orden?.mano_obra == null ? null : Number(orden.mano_obra)
  const sucio =
    orden &&
    (diagnostico.trim() !== (orden.diagnostico ?? '').trim() ||
      trabajo.trim() !== (orden.trabajo_realizado ?? '').trim() ||
      mo.valor !== manoGuardada)

  async function guardar() {
    setAviso(null)
    if (mo.error) {
      document.getElementById('mano-obra')?.focus()
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await guardarNotas(id, { diagnostico, trabajo_realizado: trabajo, mano_obra: mo.valor })
      await cargar({ silencioso: true })
      setAviso({ tipo: 'exito', texto: 'Notas guardadas.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeActualizar(e) })
      if (e?.message === 'Orden cerrada.') await cargar({ silencioso: true })
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  async function asignar() {
    setAviso(null)
    if (!candado.tomar()) return
    setAsignando(true)
    try {
      await asignarOrden(id, seleccion || null)
      await cargar({ silencioso: true })
      setAviso({ tipo: 'exito', texto: 'Mecánico actualizado.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeActualizar(e) })
    } finally {
      candado.soltar()
      setAsignando(false)
    }
  }

  async function avanzar() {
    setAviso(null)
    if (mo.error) {
      setConfirmando(false)
      document.getElementById('mano-obra')?.focus()
      return
    }
    if (!candado.tomar()) return
    setAvanzando(true)
    try {
      // La BD valida contra lo guardado: primero se guardan las notas pendientes.
      if (sucio) await guardarNotas(id, { diagnostico, trabajo_realizado: trabajo, mano_obra: mo.valor })
      await avanzarEstatus(id, orden.estatus)
      setConfirmando(false)
      await cargar({ silencioso: true })
      setAviso({ tipo: 'exito', texto: 'Estatus actualizado.' })
    } catch (e) {
      const texto = e?.code === 'P0001' || e?.message === MENSAJE_RED ? mensajeActualizar(e) : MSG_FALLA
      setConfirmando(false)
      setAviso({ tipo: 'error', texto })
      if (texto === MSG_CONCURRENCIA || texto === 'Orden cerrada.') await cargar({ silencioso: true })
    } finally {
      candado.soltar()
      setAvanzando(false)
    }
  }

  const cambios = orden?.cambios ?? []
  const textoCambio = (c) =>
    `${c.estatus_anterior ? `${etiquetaOrden(c.estatus_anterior)} → ` : ''}${etiquetaOrden(c.estatus_nuevo)}`

  return (
    <div className="space-y-5">
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={() => cargar()}
        vacio={!orden}
        mensajeVacio="Orden no encontrada."
        accionVacia={
          <Boton variante="secundario" onClick={() => navigate('/taller/ordenes')}>
            Regresar
          </Boton>
        }
      >
        {orden ? (
          <>
            <header>
              <h1 className="titulo-pagina text-tinta">{folio(orden.id)}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="placa text-3xl text-tinta lg:text-4xl">{orden.vehiculo?.placa}</p>
                <BadgeEstatus texto={etiquetaOrden(orden.estatus)} tono={tonoOrden(orden.estatus)} />
              </div>
            </header>

            <section aria-label="Avance de la orden" className="ficha">
              <ProgresoOrden estatus={orden.estatus} />
            </section>

            <Alerta tipo={aviso?.tipo ?? 'info'}>{aviso?.texto}</Alerta>
            {cerrada && <Alerta tipo="info">Orden cerrada</Alerta>}
            {!cerrada && !puedeEditar && <Alerta tipo="info">{avisoSoloLectura}</Alerta>}

            {!cerrada && puedeEditar && siguiente && (
              <div className="flex flex-col md:items-end">
                {confirmando ? (
                  <div role="group" aria-label="Confirmar avance" className="w-full space-y-3 border border-tinta bg-superficie p-4 md:max-w-md">
                    <p className="text-tinta">
                      ¿Avanzar la orden a «{etiquetaOrden(siguiente)}»? No se puede regresar al estatus anterior.
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Boton onClick={avanzar} cargando={avanzando}>
                        Confirmar
                      </Boton>
                      <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={avanzando}>
                        Cancelar
                      </Boton>
                    </div>
                  </div>
                ) : (
                  <Boton onClick={() => setConfirmando(true)} disabled={guardando} className="w-full md:w-auto">
                    Avanzar a {etiquetaOrden(siguiente)}
                  </Boton>
                )}
              </div>
            )}

            {esAdmin && (
              <div className="flex flex-wrap items-end gap-2 border border-linea bg-superficie p-3">
                <div className="min-w-56 flex-1">
                  <label htmlFor="asignar-a" className="etiqueta mb-1.5 block text-tinta">
                    Asignar a
                  </label>
                  <select
                    id="asignar-a"
                    className="campo"
                    value={seleccion}
                    disabled={cerrada || asignando}
                    onChange={(e) => setSeleccion(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {mecanicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <Boton
                  variante="secundario"
                  onClick={asignar}
                  cargando={asignando}
                  disabled={cerrada || seleccion === (orden.asignado_a ?? '')}
                >
                  Asignar
                </Boton>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <div className="min-w-0 space-y-4">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!cerrada && sucio) guardar()
                  }}
                >
                  <Textarea
                    id="diagnostico"
                    label="Diagnóstico"
                    rows={5}
                    maxLength={LIMITES.textoOrden}
                    value={diagnostico}
                    disabled={cerrada}
                    readOnly={!puedeEditar}
                    onChange={(e) => setDiagnostico(e.target.value)}
                  />
                  <Textarea
                    id="trabajo"
                    label="Trabajo realizado"
                    rows={5}
                    maxLength={LIMITES.textoOrden}
                    value={trabajo}
                    disabled={cerrada}
                    readOnly={!puedeEditar}
                    onChange={(e) => setTrabajo(e.target.value)}
                  />
                  <div className="md:max-w-xs">
                    <label htmlFor="mano-obra" className="etiqueta mb-1.5 block text-tinta">
                      Mano de obra (MXN)
                    </label>
                    <input
                      id="mano-obra"
                      className="campo"
                      inputMode="decimal"
                      maxLength={LIMITES.numero + 3}
                      autoComplete="off"
                      placeholder="0.00"
                      value={manoObra}
                      disabled={cerrada}
                      readOnly={!puedeEditar}
                      onChange={(e) => setManoObra(e.target.value)}
                      aria-invalid={mo.error ? 'true' : undefined}
                      aria-describedby={mo.error ? 'error-mano-obra' : 'ayuda-mano-obra'}
                    />
                    {mo.error ? (
                      <p id="error-mano-obra" className="mt-1.5 text-sm font-bold text-cancelada">
                        {mo.error}
                      </p>
                    ) : (
                      <p id="ayuda-mano-obra" className="mt-1.5 text-sm text-tenue">
                        Se requiere para marcar la orden como entregada. Sin IVA.
                      </p>
                    )}
                  </div>
                  {!cerrada && puedeEditar && (
                    <Boton type="submit" variante="secundario" cargando={guardando} disabled={!sucio || avanzando || !!mo.error}>
                      Guardar notas
                    </Boton>
                  )}
                </form>
              </div>

              <aside aria-labelledby="titulo-vehiculo" className="ficha min-w-0 self-start">
                <h2 id="titulo-vehiculo" className="titulo-seccion mb-3 text-tinta">
                  Vehículo y cliente
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="etiqueta text-tenue">Vehículo</dt>
                    <dd className="font-bold text-tinta">
                      {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
                    </dd>
                  </div>
                  <div>
                    <dt className="etiqueta text-tenue">Cliente</dt>
                    <dd className="text-tinta">{orden.vehiculo?.cliente?.nombre}</dd>
                  </div>
                  {orden.vehiculo?.cliente?.telefono && (
                    <div>
                      <dt className="etiqueta text-tenue">Teléfono</dt>
                      <dd>
                        <a href={`tel:${orden.vehiculo.cliente.telefono}`} className="enlace">
                          {orden.vehiculo.cliente.telefono}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="etiqueta text-tenue">Mecánico</dt>
                    <dd className="text-tinta">{orden.asignado?.nombre ?? 'Sin asignar'}</dd>
                  </div>
                  <div>
                    <dt className="etiqueta text-tenue">Kilometraje al recibir</dt>
                    <dd className="text-tinta">{orden.kilometraje.toLocaleString('es-MX')} km</dd>
                  </div>
                  {orden.cita?.motivo && (
                    <div>
                      <dt className="etiqueta text-tenue">Motivo de la cita</dt>
                      <dd className="text-tinta">{orden.cita.motivo}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="etiqueta text-tenue">Recibida</dt>
                    <dd className="text-tinta">{formatearFechaHora(orden.creado_en)}</dd>
                  </div>
                </dl>
                <Link to={`/taller/vehiculos/${orden.vehiculo_id}`} className="enlace mt-4 inline-block">
                  Ver historial del vehículo
                </Link>
              </aside>
            </div>

            <RefaccionesOrden
              ordenId={orden.id}
              vehiculo={orden.vehiculo}
              puedeEditar={puedeEditar && !cerrada}
              manoObra={manoGuardada}
            />
            {factura && (
              <p>
                <Link to={`/taller/facturas/${factura.id}`} className="enlace">
                  Ver factura {factura.folio}
                </Link>
              </p>
            )}

            <section aria-labelledby="titulo-bitacora" className="min-w-0">
              <h2 id="titulo-bitacora" className="titulo-seccion mb-3 text-tinta">
                Bitácora
              </h2>
              {cambios.length === 0 && (
                <p className="border border-dashed border-linea px-4 py-8 text-tenue">
                  Esta orden aún no tiene cambios de estatus registrados.
                </p>
              )}
              <table className={`tabla hidden ${cambios.length ? 'md:table' : ''}`}>
                <thead>
                  <tr>
                    <th scope="col">Paso</th>
                    <th scope="col">De → A</th>
                    <th scope="col">Quién</th>
                    <th scope="col">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {cambios.map((c) => (
                    <tr key={c.id}>
                      <td className="placa text-xl">{numeroPaso(c.estatus_nuevo)}</td>
                      <td>{textoCambio(c)}</td>
                      <td>{c.por?.nombre ?? 'Sistema'}</td>
                      <td className="text-tenue">{formatearFechaHora(c.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="border-t-2 border-tinta md:hidden">
                {cambios.map((c) => (
                  <li key={c.id} className="border-b border-linea py-3">
                    <p className="font-bold text-tinta">
                      {numeroPaso(c.estatus_nuevo)} · {textoCambio(c)}
                    </p>
                    <p className="text-sm text-tenue">
                      {c.por?.nombre ?? 'Sistema'} · {formatearFechaHora(c.creado_en)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </EstadoLista>
    </div>
  )
}
