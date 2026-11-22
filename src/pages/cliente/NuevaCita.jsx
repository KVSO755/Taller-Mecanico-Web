import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { listarMisVehiculos } from '../../services/vehiculos'
import { agendarCita, bloquesDisponibles } from '../../services/citas'
import { traducirError } from '../../services/errores'
import { esDomingo, etiquetaHora, rangoFechasPermitidas } from '../../utils/horarios'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import Input from '../../components/Input'
import MensajeError from '../../components/MensajeError'
import Textarea from '../../components/Textarea'
import { LIMITES, enfocarPrimerError, useCandado, useSecuencia } from '../../utils/formularios'

// Número de paso: llamada numerada; el paso en curso va en amarillo.
function Paso({ n, actual, titulo, children }) {
  return (
    <section className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-3">
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-tinta font-display text-lg font-bold text-tinta ${actual ? 'bg-amarillo' : 'bg-superficie'}`}
      >
        {n}
      </span>
      <h2 className="titulo-seccion self-center">
        <span className="sr-only">Paso {n}: </span>
        {titulo}
      </h2>
      <div className="col-span-2 space-y-3 md:col-span-1 md:col-start-2">{children}</div>
    </section>
  )
}

const MENSAJE_OCUPADO = 'Ese horario se acaba de ocupar. Elige otro.'
const MENSAJE_FALLA = 'No se pudo agendar la cita. Intenta de nuevo.'

export default function NuevaCita() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [vehiculos, setVehiculos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [vehiculoId, setVehiculoId] = useState('')
  const [fecha, setFecha] = useState('')
  const [bloques, setBloques] = useState([])
  const [cargandoBloques, setCargandoBloques] = useState(false)
  const [errorBloques, setErrorBloques] = useState('')
  const [bloque, setBloque] = useState(null) // iso elegido
  const [motivo, setMotivo] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState({})
  const candado = useCandado()
  const secuencia = useSecuencia()

  const { min, max } = rangoFechasPermitidas()
  const cerrado = fecha !== '' && esDomingo(fecha)
  const fechaFueraDeRango = fecha !== '' && (fecha < min || fecha > max)

  const cargarVehiculos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const lista = await listarMisVehiculos()
      setVehiculos(lista)
      const pre = params.get('vehiculoId')
      if (pre && lista.some((v) => String(v.id) === pre)) setVehiculoId(pre)
      else if (lista.length === 1) setVehiculoId(String(lista[0].id))
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [params])

  useEffect(() => {
    cargarVehiculos()
  }, [cargarVehiculos])

  const cargarBloques = useCallback(
    async (f) => {
      const n = secuencia.siguiente()
      setBloque(null)
      setBloques([])
      setErrorBloques('')
      if (!f || esDomingo(f)) return
      setCargandoBloques(true)
      try {
        const lista = await bloquesDisponibles(f)
        if (secuencia.vigente(n)) setBloques(lista)
      } catch (e) {
        if (secuencia.vigente(n)) setErrorBloques(traducirError(e, 'cargar'))
      } finally {
        if (secuencia.vigente(n)) setCargandoBloques(false)
      }
    },
    [secuencia],
  )

  useEffect(() => {
    if (fecha && !fechaFueraDeRango) cargarBloques(fecha)
    else {
      secuencia.siguiente()
      setBloque(null)
      setBloques([])
      setErrorBloques('')
      setCargandoBloques(false)
    }
  }, [fecha, fechaFueraDeRango, cargarBloques, secuencia])

  const motivoLimpio = motivo.trim()
  const limpiarError = (campo) => setErrores((x) => ({ ...x, [campo]: undefined }))

  function validar() {
    const e = {}
    if (!vehiculoId) e.vehiculo = 'Elige el vehículo para la cita.'
    if (!fecha) e.fecha = 'Elige el día de la cita.'
    else if (fechaFueraDeRango) e.fecha = 'Elige una fecha a partir de mañana y dentro de los próximos 30 días.'
    else if (cerrado) e.fecha = 'El taller no abre los domingos. Elige otro día.'
    if (!bloque) e.hora = 'Elige una hora disponible.'
    if (!motivoLimpio) e.motivo = 'Escribe el motivo de la cita.'
    else if (motivoLimpio.length < 5) e.motivo = 'El motivo debe tener al menos 5 caracteres.'
    return e
  }

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setErrorEnvio('')
    const nuevos = validar()
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setEnviando(true)
    try {
      await agendarCita({ vehiculoId: Number(vehiculoId), fechaHoraIso: bloque, motivo: motivoLimpio })
      navigate('/cliente/citas')
    } catch (err) {
      const msg = traducirError(err, 'guardar')
      setErrorEnvio(err?.code === 'P0001' || msg !== 'No se pudo guardar. Intenta de nuevo.' ? msg : MENSAJE_FALLA)
      if (msg === MENSAJE_OCUPADO) cargarBloques(fecha)
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  const pasoActual = !vehiculoId ? 1 : !fecha || cerrado || fechaFueraDeRango ? 2 : 3

  return (
    <div className="max-w-[960px] space-y-5">
      <h1 className="titulo-pagina">Agendar cita</h1>
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargarVehiculos}
        vacio={vehiculos.length === 0}
        mensajeVacio="Primero registra un vehículo"
        accionVacia={<Boton onClick={() => navigate('/cliente/vehiculos/nuevo')}>Agregar vehículo</Boton>}
      >
        <form onSubmit={enviar} noValidate className="space-y-6 pb-24 md:pb-0">
          <Alerta tipo="error">{errorEnvio}</Alerta>

          <Paso n={1} actual={pasoActual === 1} titulo="Vehículo">
            <fieldset tabIndex={-1} data-error={errores.vehiculo ? 'true' : undefined} className="focus:outline-none">
              <legend className="sr-only">Vehículo</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vehiculos.map((v) => (
                  <label
                    key={v.id}
                    className="relative block cursor-pointer border-2 border-linea bg-superficie p-3 hover:border-neutro has-[:checked]:border-cobalto has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cobalto"
                  >
                    <input
                      type="radio"
                      name="vehiculo"
                      value={v.id}
                      checked={vehiculoId === String(v.id)}
                      onChange={(e) => {
                        setVehiculoId(e.target.value)
                        limpiarError('vehiculo')
                      }}
                      className="peer sr-only"
                    />
                    <span aria-hidden="true" className="absolute right-2 top-2 hidden h-3 w-3 bg-amarillo peer-checked:block" />
                    <span className="placa block text-2xl text-tinta">{v.placa}</span>
                    <span className="block text-tenue">
                      {v.marca} {v.modelo}
                    </span>
                  </label>
                ))}
              </div>
              <MensajeError>{errores.vehiculo}</MensajeError>
            </fieldset>
          </Paso>

          <Paso n={2} actual={pasoActual === 2} titulo="Día">
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              min={min}
              max={max}
              onChange={(e) => {
                setFecha(e.target.value)
                limpiarError('fecha')
              }}
              className="max-w-xs"
              error={
                fechaFueraDeRango
                  ? 'Elige una fecha a partir de mañana y dentro de los próximos 30 días.'
                  : errores.fecha
              }
            />
          </Paso>

          <Paso n={3} actual={pasoActual === 3} titulo="Hora y motivo">
            {(!fecha || fechaFueraDeRango) && <p className="text-tenue">Elige un día para ver los horarios.</p>}
            {fecha && !fechaFueraDeRango && (
              <fieldset tabIndex={-1} data-error={errores.hora ? 'true' : undefined} className="focus:outline-none">
                <legend className="etiqueta mb-1.5 block text-tinta">Hora</legend>
                {cerrado ? (
                  <Alerta tipo="info">El taller no abre ese día.</Alerta>
                ) : (
                  <EstadoLista
                    cargando={cargandoBloques}
                    error={errorBloques}
                    onReintentar={() => cargarBloques(fecha)}
                    vacio={bloques.length === 0}
                    mensajeVacio="No hay horarios disponibles ese día. Elige otra fecha."
                  >
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {bloques.map((b) => (
                        <button
                          key={b.iso}
                          type="button"
                          aria-pressed={bloque === b.iso}
                          onClick={() => {
                            setBloque(b.iso)
                            limpiarError('hora')
                          }}
                          className={`min-h-11 border-2 px-2 font-display text-xl font-bold tracking-wide ${
                            bloque === b.iso
                              ? 'border-tinta bg-amarillo text-tinta'
                              : 'border-linea bg-superficie text-tinta hover:border-neutro hover:bg-neutro-suave'
                          }`}
                        >
                          {etiquetaHora(b.hora)}
                        </button>
                      ))}
                    </div>
                  </EstadoLista>
                )}
                <MensajeError>{errores.hora}</MensajeError>
              </fieldset>
            )}

            <Textarea
              label="Motivo"
              rows={3}
              maxLength={LIMITES.motivoCita}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                limpiarError('motivo')
              }}
              error={errores.motivo}
              ayuda="mínimo 5 caracteres"
            />
          </Paso>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-fondo px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0">
            <Boton type="submit" cargando={enviando} className="w-full md:w-auto">
              Agendar
            </Boton>
          </div>
        </form>
      </EstadoLista>
    </div>
  )
}
