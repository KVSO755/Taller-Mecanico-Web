import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { obtenerFactura } from '../services/facturas'
import { traducirError } from '../services/errores'
import Boton from '../components/Boton'
import EstadoLista from '../components/EstadoLista'
import FacturaDocumento from '../components/FacturaDocumento'
import { idValido } from '../utils/formularios'

export default function FacturaPage() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const esCliente = perfil?.rol === 'cliente'
  const [factura, setFactura] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setFactura(idValido(id) ? await obtenerFactura(id) : null)
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const volver = esCliente
    ? { a: '/cliente/facturas', texto: 'Mis facturas' }
    : factura?.orden_id
      ? { a: `/taller/ordenes/${factura.orden_id}`, texto: 'Volver a la orden' }
      : { a: '/taller/ordenes', texto: 'Órdenes' }

  return (
    <div className="space-y-6">
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={!factura}
        mensajeVacio="Factura no encontrada."
        accionVacia={
          <Link to={esCliente ? '/cliente/facturas' : '/taller/ordenes'} className="enlace">
            Regresar
          </Link>
        }
      >
        {factura ? (
          <>
            <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
              <Link to={volver.a} className="enlace">
                {volver.texto}
              </Link>
              <Boton onClick={() => window.print()}>Imprimir / Guardar PDF</Boton>
            </div>
            <div className="mx-auto max-w-4xl">
              <FacturaDocumento factura={factura} />
            </div>
          </>
        ) : null}
      </EstadoLista>
    </div>
  )
}
