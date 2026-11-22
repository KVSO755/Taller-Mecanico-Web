import { useState } from 'react'
import { traducirError } from '../services/errores'
import { LIMITES, MAX_KM, enfocarPrimerError, useCandado } from '../utils/formularios'
import { normalizarPlaca, placaEscrita, placaValida } from '../utils/placa'
import Alerta from './Alerta'
import Boton from './Boton'
import Input from './Input'

const MENSAJE_GENERICO = 'No se pudo guardar. Intenta de nuevo.'

// Formulario de vehículo. Modo creación (inicial vacío) o edición (`edicion`):
// en edición la placa y el kilometraje son de solo lectura (decisión Q8).
// `onGuardar(datos)` debe devolver una promesa; si lanza, se muestra el error y se conservan los datos.
export default function FormVehiculo({ inicial, edicion = false, onGuardar, onCancelar }) {
  const [placa, setPlaca] = useState(inicial?.placa ?? '')
  const [marca, setMarca] = useState(inicial?.marca ?? '')
  const [modelo, setModelo] = useState(inicial?.modelo ?? '')
  const [anio, setAnio] = useState(inicial?.anio != null ? String(inicial.anio) : '')
  const [km, setKm] = useState(inicial?.kilometraje != null ? String(inicial.kilometraje) : '')
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  const anioMax = new Date().getFullYear() + 1

  function validar() {
    const e = {}
    if (!edicion) {
      const p = normalizarPlaca(placa)
      if (!p) e.placa = 'La placa es obligatoria.'
      else if (!placaValida(p)) e.placa = 'La placa debe tener de 5 a 8 letras o números, sin símbolos.'
      const k = km.trim()
      if (k === '') e.km = 'El kilometraje es obligatorio.'
      else if (k.startsWith('-')) e.km = 'El kilometraje no puede ser negativo.'
      else if (!/^[0-9]+$/.test(k)) e.km = 'El kilometraje debe ser un número entero, sin letras ni decimales.'
      else if (Number(k) > MAX_KM) e.km = `El kilometraje no puede pasar de ${MAX_KM.toLocaleString('es-MX')} km.`
    }
    const m = marca.trim()
    if (!m) e.marca = 'La marca es obligatoria.'
    else if (m.length > LIMITES.marca) e.marca = `La marca no puede pasar de ${LIMITES.marca} caracteres.`
    const mo = modelo.trim()
    if (!mo) e.modelo = 'El modelo es obligatorio.'
    else if (mo.length > LIMITES.modelo) e.modelo = `El modelo no puede pasar de ${LIMITES.modelo} caracteres.`
    const a = anio.trim()
    if (!a) e.anio = 'El año es obligatorio.'
    else if (!/^[0-9]{4}$/.test(a)) e.anio = `Escribe el año con 4 dígitos, entre 1950 y ${anioMax}.`
    else if (Number(a) < 1950 || Number(a) > anioMax) e.anio = `El año debe estar entre 1950 y ${anioMax}.`
    return e
  }

  async function enviar(ev) {
    ev.preventDefault()
    const form = ev.currentTarget
    const nuevos = validar()
    setErrores(nuevos)
    setErrorEnvio('')
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return

    const datos = { marca: marca.trim(), modelo: modelo.trim(), anio: Number(anio) }
    if (!edicion) {
      datos.placa = normalizarPlaca(placa)
      datos.kilometraje = Number(km)
    }
    setEnviando(true)
    try {
      await onGuardar(datos)
    } catch (err) {
      const msg = traducirError(err, 'guardar')
      setErrorEnvio(msg === MENSAJE_GENERICO ? 'No se pudo guardar el vehículo. Intenta de nuevo.' : msg)
    } finally {
      candado.soltar()
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="max-w-xl space-y-5">
      <Alerta tipo="error">{errorEnvio}</Alerta>
      <Input
        label="Placa"
        value={placa}
        onChange={(e) => setPlaca(placaEscrita(e.target.value))}
        readOnly={edicion}
        maxLength={LIMITES.placaEscrita}
        autoCapitalize="characters"
        autoComplete="off"
        error={errores.placa}
      />
      <Input
        label="Marca"
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        maxLength={LIMITES.marca}
        error={errores.marca}
      />
      <Input
        label="Modelo"
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
        maxLength={LIMITES.modelo}
        error={errores.modelo}
      />
      <Input
        label="Año"
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={anio}
        onChange={(e) => setAnio(e.target.value)}
        error={errores.anio}
      />
      <Input
        label="Kilometraje"
        type="text"
        inputMode="numeric"
        maxLength={LIMITES.numero}
        value={km}
        onChange={(e) => setKm(e.target.value)}
        readOnly={edicion}
        error={errores.km}
      />
      <div className="flex flex-wrap gap-3 border-t border-linea pt-5">
        <Boton type="submit" cargando={enviando}>
          Guardar
        </Boton>
        {onCancelar && (
          <Boton variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
  )
}
