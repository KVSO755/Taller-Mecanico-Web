import { useCallback, useEffect, useRef, useState } from 'react'
import { bloquesDisponibles, reprogramarCita } from '../services/citas'
import { traducirError } from '../services/errores'
import { esDomingo, etiquetaHora, rangoFechasPermitidas } from '../utils/horarios'
import Alerta from './Alerta'
import Boton from './Boton'
import EstadoLista from './EstadoLista'
import Input from './Input'
import MensajeError from './MensajeError'
import { enfocarPrimerError, useCandado, useSecuencia } from '../utils/formularios'

const MENSAJE_SIN_LUGAR = 'Ese horario ya no tiene lugar. Elige otro.'

// onGuardado(): la cita se reprogramó. onCerrar(recargar, mensaje): cierra el modal.
export default function ReprogramarCita({ cita, onGuardado, onCerrar }) {
  const [fecha, setFecha] = useState('')
  const [bloques, setBloques] = useState([])
  const [cargandoBloques, setCargandoBloques] = useState(false)
  const [errorBloques, setErrorBloques] = useState('')
  const [bloque, setBloque] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState({})
  const tituloRef = useRef(null)
  const modalRef = useRef(null)
  const candado = useCandado()
  const secuencia = useSecuencia()

  const { min, max } = rangoFechasPermitidas()
  const cerrado = fecha !== '' && esDomingo(fecha)
  const fueraDeRango = fecha !== '' && (fecha < min || fecha > max)

  useEffect(() => {
    tituloRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onCerrar(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCerrar])

  const cargarBloques = useCallback(
    async (f) => {
      const n = secuencia.siguiente()
      setBloque(null)
      setBloques([])
      setErrorBloques('')
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
    if (fecha && !cerrado && !fueraDeRango) cargarBloques(fecha)
    else {
      secuencia.siguiente()
      setBloque(null)
      setBloques([])
      setErrorBloques('')
      setCargandoBloques(false)
    }
  }, [fecha, cerrado, fueraDeRango, cargarBloques, secuencia])

  async function guardar() {
    setError('')
    const nuevos = {}
    if (!fecha) nuevos.fecha = 'Elige la nueva fecha.'
    else if (fueraDeRango) nuevos.fecha = 'Elige una fecha a partir de mañana y dentro de los próximos 30 días.'
    else if (cerrado) nuevos.fecha = 'El taller no abre los domingos. Elige otro día.'
    if (!bloque) nuevos.hora = 'Elige una hora disponible.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(modalRef.current)
      return
    }
    if (!candado.tomar()) return
    setGuardando(true)
    try {
      await reprogramarCita(cita.id, bloque)
      onGuardado()
    } catch (e) {
      const msg = traducirError(e, 'guardar')
      if (msg === MENSAJE_SIN_LUGAR) {
        setError(msg)
        cargarBloques(fecha)
      } else if (e?.code === 'P0001') {
        // La cita cambió o venció: se cierra y se recarga la lista.
        onCerrar(true, msg)
      } else {
        setError(
          msg === 'No se pudo guardar. Intenta de nuevo.'
            ? 'No se pudo actualizar la cita. Intenta de nuevo.'
            : msg,
        )
      }
    } finally {
      candado.soltar()
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-tinta/60 sm:items-center sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reprogramar-titulo"
        className="flex h-full w-full flex-col gap-5 overflow-y-auto border-tinta bg-superficie p-5 sm:h-auto sm:max-h-full sm:max-w-md sm:rounded-sm sm:border-2"
      >
        <h2
          id="reprogramar-titulo"
          ref={tituloRef}
          tabIndex={-1}
          className="titulo-seccion border-b-2 border-tinta pb-3 text-tinta focus:outline-none"
        >
          Reprogramar cita
        </h2>
        <Alerta tipo="error">{error}</Alerta>
        <Input
          label="Nueva fecha"
          type="date"
          value={fecha}
          min={min}
          max={max}
          onChange={(e) => {
            setFecha(e.target.value)
            setErrores({})
          }}
          error={
            fueraDeRango
              ? 'Elige una fecha a partir de mañana y dentro de los próximos 30 días.'
              : errores.fecha
          }
        />
        {fecha && !fueraDeRango && (
          <fieldset tabIndex={-1} data-error={errores.hora ? 'true' : undefined} className="focus:outline-none">
            <legend className="etiqueta mb-1.5 block text-tinta">Hora</legend>
            {cerrado ? (
              <p className="text-sm text-tenue">El taller no abre ese día.</p>
            ) : (
              <EstadoLista
                cargando={cargandoBloques}
                error={errorBloques}
                onReintentar={() => cargarBloques(fecha)}
                vacio={bloques.length === 0}
                mensajeVacio="No hay horarios disponibles ese día. Elige otra fecha."
              >
                <div className="flex flex-wrap gap-2">
                  {bloques.map((b) => (
                    <button
                      key={b.iso}
                      type="button"
                      aria-pressed={bloque === b.iso}
                      onClick={() => {
                        setBloque(b.iso)
                        setErrores({})
                      }}
                      className={`min-h-11 min-w-20 rounded-sm border px-3 font-display text-lg font-bold tracking-[0.04em] md:min-h-10 ${
                        bloque === b.iso
                          ? 'border-tinta bg-amarillo text-tinta'
                          : 'border-linea bg-superficie text-tinta hover:border-tinta hover:bg-neutro-suave'
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
        <div className="mt-auto flex justify-end gap-3 border-t border-linea pt-4">
          <Boton variante="secundario" onClick={() => onCerrar(false)}>
            Cerrar
          </Boton>
          <Boton cargando={guardando} onClick={guardar}>
            Guardar
          </Boton>
        </div>
      </div>
    </div>
  )
}
