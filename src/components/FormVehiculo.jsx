import { useState } from 'react'
import { traducirError } from '../services/errores'
import { MARCAS, MARCA_UNIVERSAL, modelosDe } from '../utils/catalogoVehiculos'
import { LIMITES, MAX_KM, enfocarPrimerError, useCandado } from '../utils/formularios'
import { normalizarPlaca, placaEscrita, placaValida } from '../utils/placa'
import Alerta from './Alerta'
import Boton from './Boton'
import CampoSelect from './CampoSelect'
import Input from './Input'

const MENSAJE_GENERICO = 'No se pudo guardar. Intenta de nuevo.'

// Opciones "no está en la lista": el usuario escribe el dato a mano.
const OTRA_MARCA = 'Otra marca'
const OTRO_MODELO = 'Otro modelo'
const MARCAS_LISTA = MARCAS.filter((m) => m !== MARCA_UNIVERSAL)
const nombresModelos = (marca) => modelosDe(marca).map((x) => x.nombre)

// Estado inicial de los selects a partir del vehículo guardado (texto libre en la BD).
// Solo se preselecciona si coincide exacto con el catálogo, para no cambiar el texto guardado.
function seleccionInicial(marca = '', modelo = '') {
  if (!marca) return { marcaSel: '', marcaTexto: '', modeloSel: '', modeloTexto: '' }
  if (!MARCAS_LISTA.includes(marca)) {
    return { marcaSel: OTRA_MARCA, marcaTexto: marca, modeloSel: '', modeloTexto: modelo }
  }
  if (!modelo || nombresModelos(marca).includes(modelo)) {
    return { marcaSel: marca, marcaTexto: '', modeloSel: modelo, modeloTexto: '' }
  }
  return { marcaSel: marca, marcaTexto: '', modeloSel: OTRO_MODELO, modeloTexto: modelo }
}

// Formulario de vehículo. Modo creación (inicial vacío) o edición (`edicion`):
// en edición la placa y el kilometraje son de solo lectura (decisión Q8).
// Marca y modelo se eligen del catálogo; con "Otra marca" / "Otro modelo" se escriben a mano.
// `onGuardar(datos)` debe devolver una promesa; si lanza, se muestra el error y se conservan los datos.
export default function FormVehiculo({ inicial, edicion = false, onGuardar, onCancelar }) {
  const [placa, setPlaca] = useState(inicial?.placa ?? '')
  const [sel, setSel] = useState(() => seleccionInicial(inicial?.marca ?? '', inicial?.modelo ?? ''))
  const [anio, setAnio] = useState(inicial?.anio != null ? String(inicial.anio) : '')
  const [km, setKm] = useState(inicial?.kilometraje != null ? String(inicial.kilometraje) : '')
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const candado = useCandado()

  const anioMax = new Date().getFullYear() + 1
  const marcaOtra = sel.marcaSel === OTRA_MARCA
  const modeloOtro = marcaOtra || sel.modeloSel === OTRO_MODELO
  const marca = marcaOtra ? sel.marcaTexto : sel.marcaSel
  const modelo = modeloOtro ? sel.modeloTexto : sel.modeloSel

  function cambiarMarca(valor) {
    // Al cambiar de marca el modelo elegido ya no aplica.
    setSel({ marcaSel: valor, marcaTexto: '', modeloSel: '', modeloTexto: '' })
    setErrores((e) => ({ ...e, marca: undefined, modelo: undefined }))
  }

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
    if (!sel.marcaSel) e.marca = 'Elige la marca.'
    else if (!m) e.marca = 'Escribe la marca.'
    else if (m.length > LIMITES.marca) e.marca = `La marca no puede pasar de ${LIMITES.marca} caracteres.`
    const mo = modelo.trim()
    if (!modeloOtro && !sel.modeloSel) e.modelo = 'Elige el modelo.'
    else if (!mo) e.modelo = 'Escribe el modelo.'
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

  const opcionesMarca = [...MARCAS_LISTA, OTRA_MARCA].map((m) => [m, null])
  const opcionesModelo = sel.marcaSel ? [...nombresModelos(sel.marcaSel), OTRO_MODELO].map((m) => [m, null]) : []

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
      <CampoSelect
        label="Marca"
        placeholder="Elige la marca"
        opciones={opcionesMarca}
        value={sel.marcaSel}
        onChange={(e) => cambiarMarca(e.target.value)}
        error={marcaOtra ? undefined : errores.marca}
      />
      {marcaOtra && (
        <Input
          label="Escribe la marca"
          value={sel.marcaTexto}
          onChange={(e) => setSel((s) => ({ ...s, marcaTexto: e.target.value }))}
          maxLength={LIMITES.marca}
          autoComplete="off"
          error={errores.marca}
        />
      )}
      {!marcaOtra && (
        <CampoSelect
          label="Modelo"
          placeholder={sel.marcaSel ? 'Elige el modelo' : 'Primero elige la marca'}
          opciones={opcionesModelo}
          value={sel.modeloSel}
          onChange={(e) => setSel((s) => ({ ...s, modeloSel: e.target.value, modeloTexto: '' }))}
          disabled={!sel.marcaSel}
          error={sel.modeloSel === OTRO_MODELO ? undefined : errores.modelo}
        />
      )}
      {modeloOtro && (
        <Input
          label={marcaOtra ? 'Modelo' : 'Escribe el modelo'}
          value={sel.modeloTexto}
          onChange={(e) => setSel((s) => ({ ...s, modeloTexto: e.target.value }))}
          maxLength={LIMITES.modelo}
          autoComplete="off"
          error={errores.modelo}
        />
      )}
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
