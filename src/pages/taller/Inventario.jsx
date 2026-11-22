import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { crearPieza, listarPiezas } from '../../services/inventario'
import { traducirError } from '../../services/errores'
import { estadoPieza, validarCodigo, validarCosto, validarEntero, validarNombre } from '../../utils/inventario'
import { formatearMoneda } from '../../utils/moneda'
import { MARCAS, modelosDe } from '../../utils/catalogoVehiculos'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import EstadoLista from '../../components/EstadoLista'
import Input from '../../components/Input'
import { LIMITES, enfocarPrimerError, useCandado, useSecuencia } from '../../utils/formularios'

const FILTROS = [
  ['todas', 'Todas'],
  ['bajo', 'Bajo stock y agotadas'],
  ['inactivas', 'Inactivas'],
]
const MENSAJES_VACIO = {
  todas: 'Aún no hay refacciones registradas.',
  bajo: 'No hay piezas con bajo stock.',
  inactivas: 'No hay piezas inactivas.',
}

const marcaValida = (pedida) => (MARCAS.includes(pedida) ? pedida : '')
// Descarta de la URL un modelo que no está en el catálogo de la marca.
const modeloValido = (marca, pedido) => (modelosDe(marca).some((x) => x.nombre === pedido) ? pedido : '')

function FormNuevaPieza({ onCreada, onCancelar }) {
  const [v, setV] = useState({ codigo: '', nombre: '', compatibilidad: '', costo: '', existencias: '0', stock_minimo: '0' })
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const candado = useCandado()
  const cambiar = (campo) => (e) => setV((x) => ({ ...x, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setErrorGeneral('')
    const codigo = validarCodigo(v.codigo)
    const nombre = validarNombre(v.nombre)
    const costo = validarCosto(v.costo)
    const existencias = validarEntero(v.existencias, { nombre: 'Las existencias' })
    const minimo = validarEntero(v.stock_minimo, { nombre: 'El stock mínimo' })
    const errs = {
      codigo: codigo.error,
      nombre: nombre.error,
      costo: costo.error,
      existencias: existencias.error,
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
      const pieza = await crearPieza({
        codigo: codigo.valor,
        nombre: nombre.valor,
        compatibilidad: v.compatibilidad,
        costo: costo.valor,
        existencias: existencias.valor,
        stock_minimo: minimo.valor,
      })
      onCreada(pieza)
    } catch (err) {
      setErrorGeneral(traducirError(err, 'guardar'))
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-nueva-pieza" className="ficha space-y-4">
      <h2 id="titulo-nueva-pieza" className="titulo-seccion text-tinta">
        Nueva pieza
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Código" value={v.codigo} onChange={cambiar('codigo')} error={errores.codigo} autoComplete="off" maxLength={LIMITES.codigoPieza} />
        <Input
          label="Nombre"
          value={v.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          autoComplete="off"
          maxLength={LIMITES.nombrePieza}
        />
        <Input
          label="Compatible con (opcional)"
          className="md:col-span-2"
          value={v.compatibilidad}
          onChange={cambiar('compatibilidad')}
          placeholder="Ej. Nissan Versa 2012–2019"
          autoComplete="off"
          maxLength={LIMITES.compatibilidad}
          error={errores.compatibilidad}
          contador
        />
        <Input
          label="Costo (MXN)"
          inputMode="decimal"
          value={v.costo}
          onChange={cambiar('costo')}
          error={errores.costo}
          autoComplete="off"
          maxLength={LIMITES.numero + 3}
        />
        <Input
          label="Existencias iniciales"
          inputMode="numeric"
          value={v.existencias}
          maxLength={7}
          onChange={cambiar('existencias')}
          error={errores.existencias}
          autoComplete="off"
        />
        <Input
          label="Stock mínimo"
          inputMode="numeric"
          value={v.stock_minimo}
          maxLength={7}
          onChange={cambiar('stock_minimo')}
          error={errores.stock_minimo}
          autoComplete="off"
        />
      </div>
      <Alerta>{errorGeneral}</Alerta>
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" cargando={guardando}>
          Guardar pieza
        </Boton>
        <Boton variante="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

export default function Inventario() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const pedido = params.get('filtro')
  const filtro = FILTROS.some(([v]) => v === pedido) ? pedido : 'todas'
  const marcaPedida = params.get('marca')
  const marca = marcaValida(marcaPedida)
  const modelo = modeloValido(marca, params.get('modelo'))
  const modelos = modelosDe(marca)
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [piezas, setPiezas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const tabsRef = useRef([])
  const secuencia = useSecuencia()

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    const n = secuencia.siguiente()
    setCargando(true)
    setError('')
    try {
      const lista = await listarPiezas({ busqueda, filtro, marca, modelo })
      if (secuencia.vigente(n)) setPiezas(lista)
    } catch (e) {
      if (secuencia.vigente(n)) setError(traducirError(e, 'cargar'))
    } finally {
      if (secuencia.vigente(n)) setCargando(false)
    }
  }, [busqueda, filtro, marca, modelo, secuencia])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Escribe en la URL solo lo que no es el valor por defecto; al cambiar marca se limpia modelo.
  function actualizar({ filtro: f = filtro, marca: ma = marca, modelo: mo = modelo }) {
    const next = {}
    if (f !== 'todas') next.filtro = f
    if (ma) next.marca = ma
    if (ma && mo) next.modelo = mo
    setParams(next, { replace: true })
  }

  const elegir = (valor) => actualizar({ filtro: valor })
  const hayFiltros = Boolean(marca || modelo || busqueda.trim() || filtro !== 'todas')
  function limpiarFiltros() {
    setTexto('')
    setBusqueda('')
    setParams({}, { replace: true })
  }

  function teclas(e, i) {
    let destino = null
    if (e.key === 'ArrowRight') destino = (i + 1) % FILTROS.length
    else if (e.key === 'ArrowLeft') destino = (i - 1 + FILTROS.length) % FILTROS.length
    else if (e.key === 'Home') destino = 0
    else if (e.key === 'End') destino = FILTROS.length - 1
    if (destino === null) return
    e.preventDefault()
    elegir(FILTROS[destino][0])
    tabsRef.current[destino]?.focus()
  }

  const vehiculoElegido = [marca, modelo].filter(Boolean).join(' ')
  const vacioMensaje = vehiculoElegido
    ? `No hay piezas para ${vehiculoElegido}.`
    : busqueda.trim()
      ? `No se encontró ninguna pieza que coincida con «${busqueda.trim()}». Revisa el texto o limpia los filtros.`
      : MENSAJES_VACIO[filtro]

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        titulo="Inventario"
        acciones={
          !creando && (
            <Boton onClick={() => setCreando(true)} className="w-full md:w-auto">
              Nueva pieza
            </Boton>
          )
        }
      />

      {creando && (
        <FormNuevaPieza onCreada={(p) => navigate(`/taller/inventario/${p.id}`)} onCancelar={() => setCreando(false)} />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Filtrar refacciones" className="flex flex-wrap gap-2">
          {FILTROS.map(([valor, rotulo], i) => {
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
                aria-controls="panel-piezas"
                tabIndex={activo ? 0 : -1}
                onClick={() => elegir(valor)}
                onKeyDown={(e) => teclas(e, i)}
                className={`etiqueta min-h-11 border px-4 md:min-h-10 ${
                  activo
                    ? 'border-tinta bg-amarillo text-tinta'
                    : 'border-linea bg-superficie text-tinta hover:border-tinta hover:bg-neutro-suave'
                }`}
              >
                {rotulo}
              </button>
            )
          })}
        </div>
        <div role="search" className="w-full md:w-80">
          <label htmlFor="buscar-pieza" className="sr-only">
            Buscar por código, nombre o compatibilidad
          </label>
          <input
            id="buscar-pieza"
            type="search"
            className="campo"
            placeholder="Buscar código, nombre o vehículo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITES.busqueda}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="md:w-72">
          <label htmlFor="filtro-marca" className="etiqueta mb-1.5 block text-tinta">
            Marca
          </label>
          <select id="filtro-marca" className="campo" value={marca} onChange={(e) => actualizar({ marca: e.target.value, modelo: '' })}>
            <option value="">Todas</option>
            {MARCAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        {modelos.length > 0 && (
          <div role="group" aria-label={`Modelo de ${marca}`} className="flex flex-wrap gap-2">
            {[{ nombre: '' }, ...modelos].map(({ nombre }) => {
              const activo = modelo === nombre
              return (
                <button
                  key={nombre || 'todos'}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => actualizar({ modelo: nombre })}
                  className={`etiqueta min-h-11 border px-4 md:min-h-10 ${
                    activo
                      ? 'border-tinta bg-amarillo text-tinta'
                      : 'border-linea bg-superficie text-tinta hover:border-tinta hover:bg-neutro-suave'
                  }`}
                >
                  {nombre || 'Todos'}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
          {!cargando && !error && (
            <p className="text-tenue">
              {piezas.length} {piezas.length === 1 ? 'pieza' : 'piezas'}
            </p>
          )}
          {hayFiltros && (
            <Boton variante="fantasma" onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          )}
        </div>
      </div>

      <div role="tabpanel" id="panel-piezas" aria-labelledby={`tab-${filtro}`}>
        <EstadoLista cargando={cargando} error={error} onReintentar={cargar} vacio={piezas.length === 0} mensajeVacio={vacioMensaje}
          accionVacia={
            hayFiltros && (
              <Boton variante="secundario" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            )
          }
        >
          <table className="tabla hidden w-full table-fixed md:table">
            <thead>
              <tr>
                <th scope="col" className="w-44">Código</th>
                <th scope="col" className="w-1/4">Pieza</th>
                <th scope="col">Compatible con</th>
                <th scope="col" className="w-28 text-right">
                  Existencias
                </th>
                <th scope="col" className="w-20 text-right">
                  Mínimo
                </th>
                <th scope="col" className="w-28 text-right">
                  Costo
                </th>
                <th scope="col" className="w-32">Estado</th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((p) => {
                const est = estadoPieza(p)
                return (
                  <tr key={p.id} onClick={() => navigate(`/taller/inventario/${p.id}`)} className="cursor-pointer hover:bg-neutro-suave">
                    <td className="break-all">
                      <Link
                        to={`/taller/inventario/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="enlace placa text-lg no-underline"
                      >
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="font-bold">{p.nombre}</td>
                    <td className="text-tenue">
                      {p.compatibilidad ? (
                        <span className="line-clamp-2" title={p.compatibilidad}>
                          {p.compatibilidad}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-right font-bold">{p.existencias}</td>
                    <td className="text-right text-tenue">{p.stock_minimo}</td>
                    <td className="text-right">{formatearMoneda(p.costo)}</td>
                    <td>
                      <BadgeEstatus texto={est.texto} tono={est.tono} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <ul className="lista-fichas md:hidden">
            {piezas.map((p) => {
              const est = estadoPieza(p)
              return (
                <li key={p.id}>
                  <Link to={`/taller/inventario/${p.id}`} className="ficha block hover:bg-neutro-suave">
                    <div className="flex items-start justify-between gap-3">
                      <span className="placa break-all text-2xl text-tinta">{p.codigo}</span>
                      <BadgeEstatus texto={est.texto} tono={est.tono} />
                    </div>
                    <p className="mt-1 font-bold text-tinta">{p.nombre}</p>
                    {p.compatibilidad && <p className="truncate text-sm text-tenue">{p.compatibilidad}</p>}
                    <p className="text-sm text-tinta">
                      <span className="font-bold">{p.existencias}</span> en existencia · mínimo {p.stock_minimo} · {formatearMoneda(p.costo)}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </EstadoLista>
      </div>
    </div>
  )
}
