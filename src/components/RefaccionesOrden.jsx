import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarPiezas,
  piezasDeOrden,
  quitarPiezaDeOrden,
  usarPiezaEnOrden,
} from '../services/inventario'
import { traducirError } from '../services/errores'
import { detectarMarcaModelo } from '../utils/catalogoVehiculos'
import { validarEntero } from '../utils/inventario'
import { LIMITES, enfocarPrimerError, useCandado } from '../utils/formularios'
import { formatearMoneda } from '../utils/moneda'
import Alerta from './Alerta'
import Boton from './Boton'
import EstadoLista from './EstadoLista'
import MensajeError from './MensajeError'

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function AgregarPieza({ ordenId, vehiculo, onAgregada }) {
  const detectado = useMemo(
    () => detectarMarcaModelo(vehiculo?.marca, vehiculo?.modelo),
    [vehiculo?.marca, vehiculo?.modelo],
  )
  const nombreVehiculo = detectado ? [detectado.marca, detectado.modelo].filter(Boolean).join(' ') : ''
  const [piezas, setPiezas] = useState([])
  const [compatibles, setCompatibles] = useState([])
  const [verTodas, setVerTodas] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [piezaId, setPiezaId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const candado = useCandado()

  const cargarPiezas = useCallback(async () => {
    try {
      const todas = await listarPiezas({ filtro: 'todas' })
      const activas = todas.filter((p) => p.activa)
      setPiezas(activas)
      if (detectado) {
        const comp = await listarPiezas({ filtro: 'todas', marca: detectado.marca, modelo: detectado.modelo ?? '' })
        setCompatibles(comp.filter((p) => p.activa))
      } else setCompatibles([])
    } catch {
      // El selector queda vacío; el error real se mostrará al intentar agregar.
    }
  }, [detectado])

  useEffect(() => {
    cargarPiezas()
  }, [cargarPiezas])

  const q = normalizar(filtro.trim())
  const hayCompatibles = compatibles.length > 0
  const filtrando = Boolean(detectado) && hayCompatibles && !verTodas
  const base = filtrando ? compatibles : piezas
  const visibles = base.filter(
    (p) => !q || normalizar(`${p.codigo} ${p.nombre} ${p.compatibilidad ?? ''}`).includes(q) || String(p.id) === piezaId,
  )

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    const c = validarEntero(cantidad, { min: 1, nombre: 'La cantidad' })
    const errs = { pieza: piezaId ? undefined : 'Elige una pieza.', cantidad: c.error }
    const elegida = piezas.find((p) => String(p.id) === piezaId)
    if (!errs.cantidad && elegida && c.valor > elegida.existencias) {
      errs.cantidad = `Solo hay ${elegida.existencias} en existencia de esta pieza.`
    }
    setErrores(errs)
    if (errs.pieza || errs.cantidad) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await usarPiezaEnOrden(ordenId, piezaId, c.valor)
      setPiezaId('')
      setCantidad('1')
      setFiltro('')
      await Promise.all([onAgregada(), cargarPiezas()])
    } catch (err) {
      setError(traducirError(err, 'guardar'))
      cargarPiezas()
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Agregar refacción" className="space-y-3 border border-linea bg-superficie p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        {detectado && hayCompatibles ? (
          <>
            <p className="font-bold text-tinta">
              {filtrando ? `Piezas compatibles con ${nombreVehiculo}` : 'Todas las piezas activas'}
            </p>
            <button type="button" className="enlace min-h-11 md:min-h-0" aria-pressed={verTodas} onClick={() => setVerTodas((v) => !v)}>
              {filtrando ? 'Ver todas las piezas' : `Ver solo compatibles con ${nombreVehiculo}`}
            </button>
          </>
        ) : (
          <p className="text-tenue">No hay piezas registradas para este vehículo; se muestran todas.</p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_7rem]">
        <div>
          <label htmlFor="filtro-pieza" className="etiqueta mb-1.5 block text-tinta">
            Buscar pieza
          </label>
          <input
            id="filtro-pieza"
            type="search"
            className="campo"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            maxLength={LIMITES.busqueda}
            placeholder="Código o nombre"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="select-pieza" className="etiqueta mb-1.5 block text-tinta">
            Pieza
          </label>
          <select
            id="select-pieza"
            className="campo"
            value={piezaId}
            onChange={(e) => {
              setPiezaId(e.target.value)
              setErrores({})
            }}
            aria-invalid={errores.pieza ? 'true' : undefined}
            aria-describedby={errores.pieza ? 'error-pieza' : undefined}
          >
            <option value="">{visibles.length ? 'Elige una pieza' : 'Sin piezas que coincidan'}</option>
            {visibles.map((p) => (
              <option key={p.id} value={p.id} disabled={p.existencias === 0}>
                {p.codigo} · {p.nombre} ({p.existencias === 0 ? 'agotada' : `${p.existencias} en existencia`})
              </option>
            ))}
          </select>
          <MensajeError id="error-pieza">{errores.pieza}</MensajeError>
        </div>
        <div>
          <label htmlFor="cantidad-pieza" className="etiqueta mb-1.5 block text-tinta">
            Cantidad
          </label>
          <input
            id="cantidad-pieza"
            className="campo"
            inputMode="numeric"
            maxLength={7}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            aria-invalid={errores.cantidad ? 'true' : undefined}
            aria-describedby={errores.cantidad ? 'error-cantidad' : undefined}
            autoComplete="off"
          />
        </div>
      </div>
      <MensajeError id="error-cantidad">{errores.cantidad}</MensajeError>
      <Alerta>{error}</Alerta>
      <Boton type="submit" variante="secundario" cargando={guardando}>
        Agregar refacción
      </Boton>
    </form>
  )
}

// Sección "Refacciones usadas" de una orden. puedeEditar ya incluye "orden no entregada".
export default function RefaccionesOrden({ ordenId, vehiculo, puedeEditar, manoObra = null }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [quitando, setQuitando] = useState(null) // id de fila en confirmación
  const [procesando, setProcesando] = useState(false)
  const [errorQuitar, setErrorQuitar] = useState('')
  const candadoQuitar = useCandado()

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setCargando(true)
      setError('')
      try {
        setFilas(await piezasDeOrden(ordenId))
      } catch (e) {
        setError(traducirError(e, 'cargar'))
      } finally {
        setCargando(false)
      }
    },
    [ordenId],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  async function quitar(fila) {
    setErrorQuitar('')
    if (!candadoQuitar.tomar()) return
    setProcesando(true)
    try {
      await quitarPiezaDeOrden(fila.id)
      setQuitando(null)
      await cargar({ silencioso: true })
    } catch (e) {
      setQuitando(null)
      setErrorQuitar(traducirError(e, 'guardar'))
    } finally {
      candadoQuitar.soltar()
      setProcesando(false)
    }
  }

  const subtotal = (f) => Number(f.costo_unitario) * f.cantidad
  const total = filas.reduce((s, f) => s + subtotal(f), 0)
  const totalEstimado = total + (manoObra ?? 0)

  const botonQuitar = (f) =>
    quitando === f.id ? (
      <span role="group" aria-label={`Confirmar quitar ${f.pieza?.nombre ?? 'pieza'}`} className="inline-flex flex-wrap gap-2">
        <Boton variante="peligro" onClick={() => quitar(f)} cargando={procesando}>
          Confirmar
        </Boton>
        <Boton variante="secundario" onClick={() => setQuitando(null)} disabled={procesando}>
          Cancelar
        </Boton>
      </span>
    ) : (
      <Boton variante="fantasma" onClick={() => setQuitando(f.id)} aria-label={`Quitar ${f.pieza?.nombre ?? 'pieza'}`}>
        Quitar
      </Boton>
    )

  return (
    <section aria-labelledby="titulo-refacciones" className="min-w-0 space-y-3">
      <h2 id="titulo-refacciones" className="titulo-seccion text-tinta">
        Refacciones usadas
      </h2>
      <Alerta>{errorQuitar}</Alerta>
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={filas.length === 0}
        mensajeVacio="No se han usado refacciones en esta orden."
      >
        <table className="tabla hidden md:table">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Pieza</th>
              <th scope="col" className="text-right">
                Cant.
              </th>
              <th scope="col" className="text-right">
                Costo unit.
              </th>
              <th scope="col" className="text-right">
                Subtotal
              </th>
              {puedeEditar && (
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="placa whitespace-nowrap text-xl">{f.pieza?.codigo}</td>
                <td className="font-bold">{f.pieza?.nombre}</td>
                <td className="text-right">{f.cantidad}</td>
                <td className="text-right">{formatearMoneda(f.costo_unitario)}</td>
                <td className="text-right">{formatearMoneda(subtotal(f))}</td>
                {puedeEditar && <td className="text-right">{botonQuitar(f)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4} className="text-right">
                Refacciones
              </th>
              <td className="text-right font-bold">{formatearMoneda(total)}</td>
              {puedeEditar && <td />}
            </tr>
            <tr>
              <th scope="row" colSpan={4} className="text-right">
                Mano de obra
              </th>
              <td className="text-right font-bold">{manoObra == null ? 'Sin capturar' : formatearMoneda(manoObra)}</td>
              {puedeEditar && <td />}
            </tr>
            <tr>
              <th scope="row" colSpan={4} className="text-right">
                Total estimado (sin IVA)
              </th>
              <td className="text-right font-bold">{formatearMoneda(totalEstimado)}</td>
              {puedeEditar && <td />}
            </tr>
          </tfoot>
        </table>

        <ul className="border-t-2 border-tinta md:hidden">
          {filas.map((f) => (
            <li key={f.id} className="space-y-1 border-b border-linea py-3">
              <p className="placa text-2xl text-tinta">{f.pieza?.codigo}</p>
              <p className="font-bold text-tinta">{f.pieza?.nombre}</p>
              <p className="text-tinta">
                {f.cantidad} × {formatearMoneda(f.costo_unitario)} = <span className="font-bold">{formatearMoneda(subtotal(f))}</span>
              </p>
              {puedeEditar && <div className="pt-1">{botonQuitar(f)}</div>}
            </li>
          ))}
          <li className="flex justify-between gap-3 border-b border-linea py-3 text-tinta">
            <span>Refacciones</span>
            <span className="font-bold">{formatearMoneda(total)}</span>
          </li>
          <li className="flex justify-between gap-3 border-b border-linea py-3 text-tinta">
            <span>Mano de obra</span>
            <span className="font-bold">{manoObra == null ? 'Sin capturar' : formatearMoneda(manoObra)}</span>
          </li>
          <li className="flex justify-between gap-3 py-3 font-bold text-tinta">
            <span>Total estimado (sin IVA)</span>
            <span>{formatearMoneda(totalEstimado)}</span>
          </li>
        </ul>
      </EstadoLista>
      {puedeEditar && <AgregarPieza ordenId={ordenId} vehiculo={vehiculo} onAgregada={() => cargar({ silencioso: true })} />}
    </section>
  )
}
