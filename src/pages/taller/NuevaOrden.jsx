import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  buscarVehiculoPorPlaca,
  citaActivaDeVehiculo,
  crearOrden,
  obtenerCitaParaOrden,
  ordenAbiertaDeVehiculo,
  ordenDeCita,
} from '../../services/ordenes'
import { listarMecanicos } from '../../services/perfiles'
import { traducirError } from '../../services/errores'
import { useAuth } from '../../context/AuthContext'
import { formatearFechaHora } from '../../utils/fechas'
import { hoyEnTaller } from '../../utils/horarios'
import { normalizarPlaca, placaEscrita, placaValida } from '../../utils/placa'
import { LIMITES, MAX_KM, enfocarPrimerError, idValido, useCandado } from '../../utils/formularios'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import Input from '../../components/Input'
import Textarea from '../../components/Textarea'

const MSG_FALLA = 'No se pudo crear la orden. Intenta de nuevo.'
const MSG_SIN_PLACA = 'No se encontró ningún vehículo con esa placa. El cliente debe registrarlo primero.'
const MSG_CITA_NO_VALIDA = 'Solo se puede crear la orden de una cita confirmada de hoy.'


function mensajeCrear(e) {
  const m = traducirError(e, 'guardar')
  return m === 'No se pudo guardar. Intenta de nuevo.' ? MSG_FALLA : m
}

// Formulario de km + diagnóstico para un vehículo ya resuelto.
function FormOrden({ vehiculo, citaId, onCreada, onConflicto }) {
  const [km, setKm] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [errorKm, setErrorKm] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [mecanicos, setMecanicos] = useState([])
  const [asignadoA, setAsignadoA] = useState('')
  const [errorMecanicos, setErrorMecanicos] = useState('')

  useEffect(() => {
    if (!esAdmin) return
    let activo = true
    listarMecanicos()
      .then((m) => activo && setMecanicos(m))
      .catch((e) => activo && setErrorMecanicos(traducirError(e, 'cargar')))
    return () => {
      activo = false
    }
  }, [esAdmin])

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setErrorGeneral('')
    const texto = km.trim()
    let errKm = ''
    if (texto === '') errKm = 'Escribe el kilometraje de llegada.'
    else if (texto.startsWith('-')) errKm = 'El kilometraje no puede ser negativo.'
    else if (!/^[0-9]+$/.test(texto)) errKm = 'El kilometraje debe ser un número entero, sin letras ni decimales.'
    else if (Number(texto) > MAX_KM) errKm = `El kilometraje no puede pasar de ${MAX_KM.toLocaleString('es-MX')} km.`
    else if (Number(texto) < vehiculo.kilometraje) {
      errKm = `El kilometraje no puede ser menor a ${vehiculo.kilometraje.toLocaleString('es-MX')} km (último registrado).`
    }
    setErrorKm(errKm)
    if (errKm) {
      enfocarPrimerError(form)
      return
    }
    const valor = Number(texto)
    if (!candado.tomar()) return
    setEnviando(true)
    try {
      const orden = await crearOrden({ vehiculoId: vehiculo.id, citaId, kilometraje: valor, diagnostico, asignadoA: esAdmin ? asignadoA : null })
      onCreada(orden.id)
    } catch (err) {
      const msg = mensajeCrear(err)
      const abierta = /orden #(\d+) abierta/.exec(msg)
      const conCita = msg === 'Esta cita ya tiene una orden.'
      if (abierta || conCita) {
        const ordenId = abierta ? abierta[1] : await ordenDeCita(citaId).catch(() => null)
        onConflicto({ mensaje: msg, ordenId })
      } else if (/kilometraje no puede ser menor/.test(msg)) {
        setErrorKm(msg)
      } else {
        setErrorGeneral(msg)
      }
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="ficha space-y-4">
      <Alerta>{errorGeneral}</Alerta>
      <Input
        label={`Kilometraje de llegada (registrado: ${vehiculo.kilometraje.toLocaleString('es-MX')} km)`}
        type="text"
        inputMode="numeric"
        maxLength={LIMITES.numero}
        autoComplete="off"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        error={errorKm}
      />
      <Textarea
        label="Diagnóstico inicial (opcional)"
        rows={4}
        maxLength={LIMITES.textoOrden}
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
      />
      {esAdmin ? (
        <div>
          <label htmlFor="mecanico" className="etiqueta mb-1.5 block text-tinta">
            Mecánico
          </label>
          <select id="mecanico" className="campo" value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)}>
            <option value="">Sin asignar</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <Alerta>{errorMecanicos}</Alerta>
        </div>
      ) : (
        <p className="text-tinta">
          <span className="etiqueta text-tenue">Mecánico</span>
          <br />
          Se asignará a ti
        </p>
      )}
      <Boton type="submit" cargando={enviando}>
        Crear orden
      </Boton>
    </form>
  )
}

function DatosVehiculo({ vehiculo, cliente }) {
  return (
    <div className="ficha">
      <p className="placa text-3xl text-tinta lg:text-4xl">{vehiculo.placa}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="etiqueta text-tenue">Vehículo</dt>
          <dd className="font-bold text-tinta">
            {vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}
          </dd>
        </div>
        <div>
          <dt className="etiqueta text-tenue">Km registrado</dt>
          <dd className="font-bold text-tinta">{vehiculo.kilometraje.toLocaleString('es-MX')} km</dd>
        </div>
        {cliente && (
          <div className="col-span-2">
            <dt className="etiqueta text-tenue">Dueño</dt>
            <dd className="text-tinta">
              {cliente.nombre}
              {cliente.telefono ? ` · Tel. ${cliente.telefono}` : ''}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function Conflicto({ mensaje, ordenId }) {
  return (
    <Alerta tipo="error">
      {mensaje}{' '}
      {ordenId && (
        <Link to={`/taller/ordenes/${ordenId}`} className="enlace">
          Ver orden #{ordenId}
        </Link>
      )}
    </Alerta>
  )
}

function ModoCita({ citaId, onCreada }) {
  const [estado, setEstado] = useState({ cargando: true, error: '', cita: null, bloqueo: null })
  const [conflicto, setConflicto] = useState(null)

  const cargar = useCallback(async () => {
    setEstado({ cargando: true, error: '', cita: null, bloqueo: null })
    try {
      const cita = idValido(citaId) ? await obtenerCitaParaOrden(citaId) : null
      if (!cita) {
        setEstado({ cargando: false, error: '', cita: null, bloqueo: { mensaje: 'Cita no encontrada.' } })
        return
      }
      if (cita.estatus === 'atendida') {
        const ordenId = await ordenDeCita(cita.id)
        if (ordenId) {
          setEstado({ cargando: false, error: '', cita, bloqueo: { mensaje: 'Esta cita ya tiene una orden.', ordenId } })
          return
        }
      }
      const esHoy = hoyEnTaller(new Date(cita.fecha_hora)) === hoyEnTaller()
      const bloqueo = cita.estatus === 'confirmada' && esHoy ? null : { mensaje: MSG_CITA_NO_VALIDA }
      if (!bloqueo) {
        const abierta = await ordenAbiertaDeVehiculo(cita.vehiculo.id)
        if (abierta) {
          setEstado({
            cargando: false,
            error: '',
            cita,
            bloqueo: { mensaje: `Este vehículo ya tiene la orden #${abierta} abierta.`, ordenId: abierta },
          })
          return
        }
      }
      setEstado({ cargando: false, error: '', cita, bloqueo })
    } catch (e) {
      setEstado({ cargando: false, error: traducirError(e, 'cargar'), cita: null, bloqueo: null })
    }
  }, [citaId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const { cargando, error, cita, bloqueo } = estado
  const aviso = conflicto ?? bloqueo
  return (
    <EstadoLista cargando={cargando} error={error} onReintentar={cargar}>
      {cita && <DatosVehiculo vehiculo={cita.vehiculo} cliente={cita.cliente} />}
      {cita && <p className="text-tinta">Cita: {formatearFechaHora(cita.fecha_hora)} · {cita.motivo}</p>}
      {aviso && <Conflicto mensaje={aviso.mensaje} ordenId={aviso.ordenId} />}
      {cita && !aviso && (
        <FormOrden vehiculo={cita.vehiculo} citaId={cita.id} onCreada={onCreada} onConflicto={setConflicto} />
      )}
    </EstadoLista>
  )
}

function ModoDirecto({ onCreada }) {
  const [placa, setPlaca] = useState('')
  const [errorPlaca, setErrorPlaca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [encontrado, setEncontrado] = useState(null) // { vehiculo, abierta, cita }
  const [sinResultado, setSinResultado] = useState(false)
  const [conflicto, setConflicto] = useState(null)
  const candado = useCandado()

  async function buscar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setEncontrado(null)
    setSinResultado(false)
    setConflicto(null)
    setErrorBusqueda('')
    const normalizada = normalizarPlaca(placa)
    if (!normalizada) {
      setErrorPlaca('Escribe la placa del vehículo.')
      enfocarPrimerError(form)
      return
    }
    if (!placaValida(normalizada)) {
      setErrorPlaca('La placa debe tener entre 5 y 8 letras o números, sin símbolos.')
      enfocarPrimerError(form)
      return
    }
    setErrorPlaca('')
    if (!candado.tomar()) return
    setBuscando(true)
    try {
      const vehiculo = await buscarVehiculoPorPlaca(normalizada)
      if (!vehiculo) {
        setSinResultado(true)
        return
      }
      const [abierta, cita] = await Promise.all([ordenAbiertaDeVehiculo(vehiculo.id), citaActivaDeVehiculo(vehiculo.id)])
      setEncontrado({ vehiculo, abierta, cita })
    } catch (err) {
      setErrorBusqueda(traducirError(err, 'cargar'))
    } finally {
      candado.soltar()
      setBuscando(false)
    }
  }

  const aviso = conflicto ?? (encontrado?.abierta
    ? { mensaje: `Este vehículo ya tiene la orden #${encontrado.abierta} abierta.`, ordenId: encontrado.abierta }
    : null)

  return (
    <div className="space-y-5">
      <form onSubmit={buscar} noValidate className="flex flex-wrap items-end gap-2" role="search">
        <Input
          label="Placa del vehículo"
          className="min-w-48 flex-1"
          value={placa}
          onChange={(e) => setPlaca(placaEscrita(e.target.value))}
          maxLength={LIMITES.placaEscrita}
          error={errorPlaca}
          autoComplete="off"
        />
        <Boton type="submit" cargando={buscando} className="mb-0.5">
          Buscar
        </Boton>
      </form>
      <Alerta>{errorBusqueda}</Alerta>
      {sinResultado && <Alerta tipo="error">{MSG_SIN_PLACA}</Alerta>}
      {encontrado && (
        <>
          <DatosVehiculo vehiculo={encontrado.vehiculo} cliente={encontrado.vehiculo.cliente} />
          {encontrado.cita && (
            <Alerta tipo="info">
              Este vehículo tiene cita el {formatearFechaHora(encontrado.cita.fecha_hora)}.{' '}
              <Link to={`/taller/citas?fecha=${hoyEnTaller(new Date(encontrado.cita.fecha_hora))}`} className="enlace">
                Cancelar cita
              </Link>
            </Alerta>
          )}
          {aviso ? (
            <Conflicto mensaje={aviso.mensaje} ordenId={aviso.ordenId} />
          ) : (
            <FormOrden vehiculo={encontrado.vehiculo} citaId={null} onCreada={onCreada} onConflicto={setConflicto} />
          )}
        </>
      )}
    </div>
  )
}

export default function NuevaOrden() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const citaId = params.get('citaId')
  const irAOrden = (id) => navigate(`/taller/ordenes/${id}`)

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="titulo-pagina text-tinta">Nueva orden</h1>
      {citaId ? <ModoCita citaId={citaId} onCreada={irAOrden} /> : <ModoDirecto onCreada={irAOrden} />}
    </div>
  )
}
