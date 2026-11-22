import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { misFacturas } from '../../services/facturas'
import { traducirError } from '../../services/errores'
import { formatearFecha } from '../../utils/fechas'
import { formatearMoneda } from '../../utils/moneda'
import EstadoLista from '../../components/EstadoLista'

const placaDe = (f) => f.orden?.vehiculo?.placa ?? ''

export default function Facturas() {
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setFacturas(await misFacturas())
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-5">
      <h1 className="titulo-pagina text-tinta">Mis facturas</h1>
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={facturas.length === 0}
        mensajeVacio="Aún no tienes facturas. Puedes pedirla desde el historial de tu vehículo, en un servicio entregado."
      >
        <table className="tabla hidden md:table">
          <thead>
            <tr>
              <th scope="col">Folio</th>
              <th scope="col">Fecha</th>
              <th scope="col">Placa</th>
              <th scope="col" className="text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr
                key={f.id}
                onClick={() => navigate(`/cliente/facturas/${f.id}`)}
                className="cursor-pointer hover:bg-neutro-suave"
              >
                <td>
                  <Link
                    to={`/cliente/facturas/${f.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="enlace placa text-xl no-underline"
                  >
                    {f.folio}
                  </Link>
                </td>
                <td>{formatearFecha(f.emitida_en)}</td>
                <td className="placa text-2xl">{placaDe(f)}</td>
                <td className="text-right font-bold">{formatearMoneda(f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="space-y-3 md:hidden">
          {facturas.map((f) => (
            <li key={f.id}>
              <Link to={`/cliente/facturas/${f.id}`} className="ficha block hover:bg-neutro-suave">
                <div className="flex items-start justify-between gap-3">
                  <span className="placa text-2xl text-tinta">{placaDe(f)}</span>
                  <span className="etiqueta text-cobalto">Factura {f.folio}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-tenue">{formatearFecha(f.emitida_en)}</span>
                  <span className="font-bold text-tinta">{formatearMoneda(f.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </EstadoLista>
    </div>
  )
}
