import { useEffect, useState } from 'react'
import { piezasUsadas } from '../services/inventario'

// Lista de refacciones de una orden para el cliente: nombre × cantidad, sin costos.
// Si no hay piezas (o falla la consulta) no muestra nada.
export default function RefaccionesCliente({ ordenId, encabezado: Encabezado = 'h3' }) {
  const [estado, setEstado] = useState({ ordenId: null, piezas: [] })

  useEffect(() => {
    let activo = true
    piezasUsadas(ordenId)
      .then((p) => activo && setEstado({ ordenId, piezas: p }))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [ordenId])

  const piezas = estado.ordenId === ordenId ? estado.piezas : []
  if (piezas.length === 0) return null
  return (
    <div>
      <Encabezado className="etiqueta mb-1 text-tenue">Refacciones</Encabezado>
      <ul className="border-t-2 border-tinta">
        {piezas.map((p) => (
          <li key={`${p.codigo}-${p.nombre}`} className="flex justify-between gap-4 border-b border-linea py-2 text-tinta">
            <span>{p.nombre}</span>
            <span className="font-bold">× {p.cantidad}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
