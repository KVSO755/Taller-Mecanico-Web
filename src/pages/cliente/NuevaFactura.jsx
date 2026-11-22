import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { solicitarFactura, ultimosDatosFiscales } from '../../services/facturas'
import { traducirError } from '../../services/errores'
import {
  REGIMENES_FISCALES,
  USOS_CFDI,
  codigoPostalValido,
  correoValido,
  normalizarRfc,
  rfcValido,
} from '../../utils/catalogosSat'
import Alerta from '../../components/Alerta'
import Boton from '../../components/Boton'
import CampoSelect from '../../components/CampoSelect'
import Input from '../../components/Input'
import Spinner from '../../components/Spinner'
import { LIMITES, enfocarPrimerError, idValido, useCandado } from '../../utils/formularios'

const VACIO = { rfc: '', razon_social: '', regimen_fiscal: '', codigo_postal: '', uso_cfdi: '', correo: '' }

function validar(d) {
  const e = {}
  if (!d.rfc.trim()) e.rfc = 'Escribe el RFC.'
  else if (!rfcValido(d.rfc)) e.rfc = 'Escribe un RFC válido: 12 o 13 caracteres, por ejemplo XAXX010101000.'
  const rs = d.razon_social.trim()
  if (!rs) e.razon_social = 'Escribe la razón social.'
  else if (rs.length < 3 || rs.length > LIMITES.razonSocial) e.razon_social = `La razón social debe tener entre 3 y ${LIMITES.razonSocial} caracteres.`
  if (!d.regimen_fiscal) e.regimen_fiscal = 'Elige un régimen fiscal.'
  else if (!REGIMENES_FISCALES.some(([c]) => c === d.regimen_fiscal)) e.regimen_fiscal = 'Elige un régimen fiscal válido.'
  if (!d.codigo_postal.trim()) e.codigo_postal = 'Escribe el código postal.'
  else if (!codigoPostalValido(d.codigo_postal)) e.codigo_postal = 'El código postal debe tener 5 dígitos, solo números.'
  if (!d.uso_cfdi) e.uso_cfdi = 'Elige un uso de CFDI.'
  else if (!USOS_CFDI.some(([c]) => c === d.uso_cfdi)) e.uso_cfdi = 'Elige un uso de CFDI válido.'
  if (!d.correo.trim()) e.correo = 'Escribe el correo.'
  else if (!correoValido(d.correo) || d.correo.trim().length > LIMITES.correo) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
  return e
}

export default function NuevaFactura() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [params] = useSearchParams()
  const ordenParam = params.get('ordenId')
  const ordenId = idValido(ordenParam) ? Number(ordenParam) : null
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const candado = useCandado()

  useEffect(() => {
    let activo = true
    ultimosDatosFiscales()
      .catch(() => null)
      .then((u) => {
        if (!activo) return
        setDatos(u ? { ...VACIO, ...u } : { ...VACIO, correo: perfil?.correo ?? '' })
        setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [perfil?.correo])

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    const errs = validar(datos)
    setErrores(errs)
    if (Object.keys(errs).length) {
      enfocarPrimerError(form)
      return
    }
    if (!candado.tomar()) return
    setEnviando(true)
    try {
      const f = await solicitarFactura(ordenId, {
        ...datos,
        rfc: normalizarRfc(datos.rfc),
        razon_social: datos.razon_social.trim(),
        codigo_postal: datos.codigo_postal.trim(),
        correo: datos.correo.trim(),
      })
      navigate(`/cliente/facturas/${f.id}`, { replace: true })
    } catch (err) {
      setError(traducirError(err, 'guardar'))
      candado.soltar()
      setEnviando(false)
    }
  }

  if (!ordenId) {
    return (
      <div className="space-y-4">
        <h1 className="titulo-pagina text-tinta">Pedir factura</h1>
        <Alerta tipo="error">Falta indicar el servicio a facturar. Elígelo desde el historial de tu vehículo.</Alerta>
        <Link to="/cliente" className="enlace inline-block">
          Ir al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link to="/cliente/facturas" className="enlace inline-block">
          Mis facturas
        </Link>
        <h1 className="titulo-pagina text-tinta">Pedir factura</h1>
        <p className="max-w-prose text-tenue">
          Captura tus datos fiscales para la orden #{String(ordenId).padStart(4, '0')}. La factura se genera al
          enviar y no se puede modificar después.
        </p>
      </header>

      {cargando ? (
        <p role="status" className="flex items-center gap-3 text-tenue">
          <Spinner />
          Cargando...
        </p>
      ) : (
        <form id="form-factura" onSubmit={enviar} noValidate className="ficha max-w-3xl space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="RFC"
              value={datos.rfc}
              onChange={cambiar('rfc')}
              error={errores.rfc}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={13}
              className="[&_input]:uppercase"
            />
            <Input
              label="Razón social"
              value={datos.razon_social}
              onChange={cambiar('razon_social')}
              error={errores.razon_social}
              maxLength={LIMITES.razonSocial}
              contador
              autoComplete="organization"
            />
            <CampoSelect
              label="Régimen fiscal"
              placeholder="Elige un régimen"
              opciones={REGIMENES_FISCALES}
              value={datos.regimen_fiscal}
              onChange={cambiar('regimen_fiscal')}
              error={errores.regimen_fiscal}
            />
            <Input
              label="Código postal"
              value={datos.codigo_postal}
              onChange={cambiar('codigo_postal')}
              error={errores.codigo_postal}
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
            />
            <CampoSelect
              label="Uso de CFDI"
              placeholder="Elige un uso"
              opciones={USOS_CFDI}
              value={datos.uso_cfdi}
              onChange={cambiar('uso_cfdi')}
              error={errores.uso_cfdi}
            />
            <Input
              label="Correo"
              type="email"
              value={datos.correo}
              onChange={cambiar('correo')}
              error={errores.correo}
              maxLength={LIMITES.correo}
              autoComplete="email"
            />
          </div>
          <Alerta>{error}</Alerta>
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" cargando={enviando}>
              Generar factura
            </Boton>
            <Boton variante="secundario" onClick={() => navigate(-1)} disabled={enviando}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </div>
  )
}
