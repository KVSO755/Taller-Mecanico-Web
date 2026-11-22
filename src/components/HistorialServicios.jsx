import { useState } from 'react'
import { Link } from 'react-router'
import { formatearFecha, formatearFechaHora } from '../utils/fechas'
import { etiquetaOrden } from '../utils/estatusOrden'
import RefaccionesCliente from './RefaccionesCliente'

// El embed 1:1 puede llegar como objeto o como arreglo.
const facturaDe = (orden) => (Array.isArray(orden.factura) ? orden.factura[0] : orden.factura) ?? null

function Servicio({ orden, conFactura }) {
  const factura = conFactura ? facturaDe(orden) : null
  const [abierto, setAbierto] = useState(false)
  const panelId = `servicio-${orden.id}`
  const cambios = [...(orden.cambios ?? [])].sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
  return (
    <li className="border-b border-linea">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((v) => !v)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-neutro-suave"
      >
        <span>
          <span className="block font-display text-xl font-bold leading-6 tracking-[0.02em] text-tinta">
            Entregado el {formatearFecha(orden.entregado_en ?? orden.actualizado_en)}
          </span>
          <span className="block text-sm text-tenue">
            {orden.kilometraje.toLocaleString('es-MX')} km
            {orden.cita?.motivo ? ` · ${orden.cita.motivo}` : ''}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-tinta transition-transform ${abierto ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
      {conFactura && (
        <p className="px-3 pb-3">
          {factura ? (
            <Link to={`/cliente/facturas/${factura.id}`} className="enlace">
              Ver factura {factura.folio}
            </Link>
          ) : (
            <Link to={`/cliente/facturas/nueva?ordenId=${orden.id}`} className="enlace">
              Pedir factura
            </Link>
          )}
        </p>
      )}
      <div id={panelId} hidden={!abierto} className="space-y-4 border-t border-linea bg-superficie p-4 text-sm">
        <div>
          <h4 className="etiqueta mb-1 text-tenue">Diagnóstico</h4>
          <p className="whitespace-pre-wrap text-tinta">{orden.diagnostico || 'Sin diagnóstico.'}</p>
        </div>
        <div>
          <h4 className="etiqueta mb-1 text-tenue">Trabajo realizado</h4>
          <p className="whitespace-pre-wrap text-tinta">{orden.trabajo_realizado || 'Sin descripción.'}</p>
        </div>
        {abierto && <RefaccionesCliente ordenId={orden.id} encabezado="h4" />}
        <div>
          <h4 className="etiqueta mb-1 text-tenue">Bitácora</h4>
          {cambios.length === 0 && <p className="text-tenue">Sin cambios de estatus registrados.</p>}
          <ul className="border-t-2 border-tinta">
            {cambios.map((c, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-4 border-b border-linea py-2 text-tinta">
                <span>{etiquetaOrden(c.estatus_nuevo)}</span>
                <span className="text-tenue">{formatearFechaHora(c.creado_en)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}

// Lista expandible de órdenes entregadas, la más reciente primero.
export default function HistorialServicios({ ordenes, conFactura = false }) {
  const entregadas = (ordenes ?? [])
    .filter((o) => o.estatus === 'entregado')
    .sort((a, b) => new Date(b.entregado_en ?? b.actualizado_en) - new Date(a.entregado_en ?? a.actualizado_en))
  if (entregadas.length === 0) {
    return <p className="py-4 text-tenue">Este vehículo aún no tiene servicios registrados.</p>
  }
  return (
    <ul className="border-t-2 border-tinta">
      {entregadas.map((o) => (
        <Servicio key={o.id} orden={o} conFactura={conFactura} />
      ))}
    </ul>
  )
}
