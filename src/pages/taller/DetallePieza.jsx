import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { actualizarPieza, ajustarExistencias, obtenerPieza, registrarEntrada } from '../../services/inventario'
import { traducirError } from '../../services/errores'
import { formatearFechaHora } from '../../utils/fechas'
import {
  TIPOS_MOVIMIENTO,
  cantidadConSigno,
  estadoPieza,
  validarCosto,
  validarEntero,
  validarNombre,
} from '../../utils/inventario'
import { formatearMoneda } from '../../utils/moneda'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import Input from '../../components/Input'
import { LIMITES, enfocarPrimerError, idValido, useCandado } from '../../utils/formularios'

const folioOrden = (id) => `#${String(id).padStart(4, '0')}`

function Acciones({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

function FormEntrada({ pieza, onListo, onCancelar }) {
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [errorCampo, setErrorCampo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const candado = useCandado()

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    const c = validarEntero(cantidad, { min: 1, nombre: 'La cantidad' })
    setErrorCampo(c.error ?? '')
    if (c.error) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await registrarEntrada(pieza.id, c.valor, motivo)
      await onListo('Entrada registrada.')
    } catch (err) {
      setError(traducirError(err, 'guardar'))
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-entrada" className="ficha space-y-4">
      <h2 id="titulo-entrada" className="titulo-seccion text-tinta">
        Registrar entrada
      </h2>
      <div className="grid gap-4 md:grid-cols-[10rem_1fr]">
        <Input label="Cantidad" inputMode="numeric" maxLength={7} value={cantidad} onChange={(e) => setCantidad(e.target.value)} error={errorCampo} autoComplete="off" />
        <Input
          label="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Compra a proveedor"
          autoComplete="off"
          maxLength={LIMITES.motivoMovimiento}
          contador
        />
      </div>
      <Alerta>{error}</Alerta>
      <Acciones>
        <Boton type="submit" cargando={guardando}>
          Registrar entrada
        </Boton>
        <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
      </Acciones>
    </form>
  )
}

function FormAjuste({ pieza, onListo, onCancelar }) {
  const [nuevas, setNuevas] = useState(String(pieza.existencias))
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const candado = useCandado()

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    const n = validarEntero(nuevas, { nombre: 'Las existencias' })
    const errs = {
      nuevas: n.error,
      motivo: motivo.trim() ? undefined : 'Escribe el motivo del ajuste.',
    }
    if (!n.error && n.valor === pieza.existencias) errs.nuevas = 'Las existencias no cambiaron.'
    setErrores(errs)
    if (errs.nuevas || errs.motivo) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await ajustarExistencias(pieza.id, n.valor, motivo.trim())
      await onListo('Existencias ajustadas.')
    } catch (err) {
      setError(traducirError(err, 'guardar'))
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-ajuste" className="ficha space-y-4">
      <h2 id="titulo-ajuste" className="titulo-seccion text-tinta">
        Ajustar existencias
      </h2>
      <div className="grid gap-4 md:grid-cols-[10rem_1fr]">
        <Input label="Nuevas existencias" inputMode="numeric" maxLength={7} value={nuevas} onChange={(e) => setNuevas(e.target.value)} error={errores.nuevas} autoComplete="off" />
        <Input
          label="Motivo del ajuste"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={errores.motivo}
          placeholder="Ej. Conteo físico"
          autoComplete="off"
          maxLength={LIMITES.motivoMovimiento}
          contador
        />
      </div>
      <Alerta>{error}</Alerta>
      <Acciones>
        <Boton type="submit" cargando={guardando}>
          Ajustar
        </Boton>
        <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
      </Acciones>
    </form>
  )
}

function FormEditar({ pieza, onListo, onCancelar }) {
  const [v, setV] = useState({
    nombre: pieza.nombre,
    compatibilidad: pieza.compatibilidad ?? '',
    costo: String(pieza.costo),
    stock_minimo: String(pieza.stock_minimo),
  })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const candado = useCandado()
  const cambiar = (campo) => (e) => setV((x) => ({ ...x, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    const nombre = validarNombre(v.nombre)
    const costo = validarCosto(v.costo)
    const minimo = validarEntero(v.stock_minimo, { nombre: 'El stock mínimo' })
    const errs = {
      nombre: nombre.error,
      costo: costo.error,
      stock_minimo: minimo.error,
      compatibilidad:
        v.compatibilidad.trim().length > LIMITES.compatibilidad
          ? `La compatibilidad no puede pasar de ${LIMITES.compatibilidad} caracteres.`
          : undefined,
    }
    setErrores(errs)
    if (Object.values(errs).some(Boolean)) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await actualizarPieza(pieza.id, {
        nombre: nombre.valor,
        compatibilidad: v.compatibilidad,
        costo: costo.valor,
        stock_minimo: minimo.valor,
        activa: pieza.activa,
      })
      await onListo('Pieza actualizada.')
    } catch (err) {
      setError(traducirError(err, 'guardar'))
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-editar" className="ficha space-y-4">
      <h2 id="titulo-editar" className="titulo-seccion text-tinta">
        Editar pieza
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre" value={v.nombre} onChange={cambiar('nombre')} error={errores.nombre} autoComplete="off" maxLength={LIMITES.nombrePieza} className="md:col-span-2" />
        <Input
          label="Compatible con (opcional)"
          value={v.compatibilidad}
          onChange={cambiar('compatibilidad')}
          error={errores.compatibilidad}
          autoComplete="off"
          maxLength={LIMITES.compatibilidad}
          contador
          className="md:col-span-2"
        />
        <Input label="Costo (MXN)" inputMode="decimal" maxLength={LIMITES.numero + 3} value={v.costo} onChange={cambiar('costo')} error={errores.costo} autoComplete="off" />
        <Input label="Stock mínimo" inputMode="numeric" maxLength={7} value={v.stock_minimo} onChange={cambiar('stock_minimo')} error={errores.stock_minimo} autoComplete="off" />
      </div>
      <Alerta>{error}</Alerta>
      <Acciones>
        <Boton type="submit" cargando={guardando}>
          Guardar cambios
        </Boton>
        <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
      </Acciones>
    </form>
  )
}

export default function DetallePieza() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pieza, setPieza] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState(null) // 'entrada' | 'ajuste' | 'editar' | 'desactivar'
  const [aviso, setAviso] = useState(null)
  const [cambiandoActiva, setCambiandoActiva] = useState(false)
  const candadoActiva = useCandado()

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setCargando(true)
      setError('')
      try {
        setPieza(idValido(id) ? await obtenerPieza(id) : null)
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

  async function terminado(texto) {
    setPanel(null)
    setAviso({ tipo: 'exito', texto })
    await cargar({ silencioso: true })
  }

  async function cambiarActiva(activa) {
    setAviso(null)
    if (!candadoActiva.tomar()) return
    setCambiandoActiva(true)
    try {
      await actualizarPieza(pieza.id, {
        nombre: pieza.nombre,
        compatibilidad: pieza.compatibilidad,
        costo: pieza.costo,
        stock_minimo: pieza.stock_minimo,
        activa,
      })
      await terminado(activa ? 'Pieza activada.' : 'Pieza desactivada.')
    } catch (e) {
      setPanel(null)
      setAviso({ tipo: 'error', texto: traducirError(e, 'guardar') })
    } finally {
      candadoActiva.soltar()
      setCambiandoActiva(false)
    }
  }

  const movimientos = pieza?.movimientos ?? []
  const est = pieza ? estadoPieza(pieza) : null

  return (
    <div className="space-y-5">
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={() => cargar()}
        vacio={!pieza}
        mensajeVacio="Pieza no encontrada."
        accionVacia={
          <Boton variante="secundario" onClick={() => navigate('/taller/inventario')}>
            Regresar
          </Boton>
        }
      >
        {pieza ? (
          <>
            <header className="space-y-3">
              <Link to="/taller/inventario" className="enlace inline-block">
                Regresar al inventario
              </Link>
              <h1 className="placa break-all text-3xl text-tinta lg:text-4xl">{pieza.codigo}</h1>
              <p className="text-xl font-bold text-tinta">{pieza.nombre}</p>
              {pieza.compatibilidad && <p className="text-tenue">Compatible con: {pieza.compatibilidad}</p>}
            </header>

            <section aria-label="Resumen de existencias" className="ficha flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="etiqueta text-tenue">Existencias</p>
                <p className="placa text-4xl text-tinta">{pieza.existencias}</p>
              </div>
              <div>
                <p className="etiqueta mb-1 text-tenue">Estado</p>
                <BadgeEstatus texto={est.texto} tono={est.tono} />
              </div>
              <div>
                <p className="etiqueta text-tenue">Stock mínimo</p>
                <p className="text-lg font-bold text-tinta">{pieza.stock_minimo}</p>
              </div>
              <div>
                <p className="etiqueta text-tenue">Costo</p>
                <p className="text-lg font-bold text-tinta">{formatearMoneda(pieza.costo)}</p>
              </div>
            </section>

            <Alerta tipo={aviso?.tipo ?? 'info'}>{aviso?.texto}</Alerta>

            {panel === null && (
              <Acciones>
                <Boton onClick={() => setPanel('entrada')} disabled={!pieza.activa}>
                  Registrar entrada
                </Boton>
                <Boton variante="secundario" onClick={() => setPanel('ajuste')}>
                  Ajustar existencias
                </Boton>
                <Boton variante="secundario" onClick={() => setPanel('editar')}>
                  Editar
                </Boton>
                {pieza.activa ? (
                  <Boton variante="fantasma" onClick={() => setPanel('desactivar')}>
                    Desactivar
                  </Boton>
                ) : (
                  <Boton variante="fantasma" onClick={() => cambiarActiva(true)} cargando={cambiandoActiva}>
                    Activar
                  </Boton>
                )}
              </Acciones>
            )}

            {panel === 'entrada' && <FormEntrada pieza={pieza} onListo={terminado} onCancelar={() => setPanel(null)} />}
            {panel === 'ajuste' && <FormAjuste pieza={pieza} onListo={terminado} onCancelar={() => setPanel(null)} />}
            {panel === 'editar' && <FormEditar pieza={pieza} onListo={terminado} onCancelar={() => setPanel(null)} />}
            {panel === 'desactivar' && (
              <div role="group" aria-label="Confirmar desactivación" className="w-full space-y-3 border border-tinta bg-superficie p-4 md:max-w-xl">
                <p className="text-tinta">
                  ¿Desactivar «{pieza.nombre}»? No se podrá usar en órdenes nuevas; el historial se conserva y puedes activarla de nuevo.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Boton variante="peligro" onClick={() => cambiarActiva(false)} cargando={cambiandoActiva}>
                    Desactivar
                  </Boton>
                  <Boton variante="secundario" onClick={() => setPanel(null)} disabled={cambiandoActiva}>
                    Cancelar
                  </Boton>
                </div>
              </div>
            )}

            <section aria-labelledby="titulo-movimientos" className="min-w-0">
              <h2 id="titulo-movimientos" className="titulo-seccion mb-3 text-tinta">
                Movimientos
              </h2>
              {movimientos.length === 0 ? (
                <p className="border border-dashed border-linea px-4 py-8 text-tenue">Esta pieza aún no tiene movimientos.</p>
              ) : (
                <>
                  <table className="tabla hidden md:table">
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Tipo</th>
                        <th scope="col" className="text-right">
                          Cantidad
                        </th>
                        <th scope="col" className="text-right">
                          Existencias
                        </th>
                        <th scope="col">Orden</th>
                        <th scope="col">Motivo</th>
                        <th scope="col">Quién</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id}>
                          <td className="text-tenue">{formatearFechaHora(m.creado_en)}</td>
                          <td>{TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo}</td>
                          <td className="text-right font-bold">{cantidadConSigno(m.cantidad)}</td>
                          <td className="text-right">{m.existencias_resultantes}</td>
                          <td>
                            {m.orden_id ? (
                              <Link to={`/taller/ordenes/${m.orden_id}`} className="enlace">
                                Orden {folioOrden(m.orden_id)}
                              </Link>
                            ) : (
                              <span className="text-tenue">—</span>
                            )}
                          </td>
                          <td>{m.motivo || <span className="text-tenue">—</span>}</td>
                          <td>{m.hecho?.nombre ?? 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="border-t-2 border-tinta md:hidden">
                    {movimientos.map((m) => (
                      <li key={m.id} className="border-b border-linea py-3">
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-tinta">
                          <span className="font-bold">
                            {TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo} {cantidadConSigno(m.cantidad)}
                          </span>
                          <span className="text-sm text-tenue">Quedan {m.existencias_resultantes}</span>
                        </p>
                        {m.motivo && <p className="text-tinta">{m.motivo}</p>}
                        {m.orden_id && (
                          <p>
                            <Link to={`/taller/ordenes/${m.orden_id}`} className="enlace">
                              Orden {folioOrden(m.orden_id)}
                            </Link>
                          </p>
                        )}
                        <p className="text-sm text-tenue">
                          {m.hecho?.nombre ?? 'Sistema'} · {formatearFechaHora(m.creado_en)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        ) : null}
      </EstadoLista>
    </div>
  )
}
