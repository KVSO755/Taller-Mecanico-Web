import { formatearFechaHora } from '../utils/fechas'
import { formatearMoneda } from '../utils/moneda'
import { nombreRegimen, nombreUsoCfdi } from '../utils/catalogosSat'

const EMISOR = {
  nombre: 'TallerApp · Taller de demostración',
  rfc: 'XAXX010101000',
  cp: '22000',
}

function Dato({ termino, children }) {
  return (
    <div>
      <dt className="etiqueta text-tenue">{termino}</dt>
      <dd className="text-tinta">{children}</dd>
    </div>
  )
}

// Documento tipo hoja de una factura simple (no CFDI). Recibe la factura de obtenerFactura().
export default function FacturaDocumento({ factura }) {
  const conceptos = factura.conceptos ?? []
  const v = factura.orden?.vehiculo
  return (
    <article aria-label={`Factura ${factura.folio}`} className="documento ficha space-y-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-linea pb-4">
        <div>
          <h1 className="etiqueta text-tenue">Factura</h1>
          <p className="placa text-4xl text-tinta">{factura.folio}</p>
        </div>
        <p className="text-tinta sm:text-right">
          <span className="etiqueta block text-tenue">Fecha de emisión</span>
          {formatearFechaHora(factura.emitida_en)}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="fac-emisor">
          <h2 id="fac-emisor" className="titulo-seccion mb-2 text-tinta">
            Emisor
          </h2>
          <dl className="space-y-2">
            <Dato termino="Nombre">{EMISOR.nombre}</Dato>
            <Dato termino="RFC">{EMISOR.rfc}</Dato>
            <Dato termino="Código postal">{EMISOR.cp}</Dato>
          </dl>
          <p className="mt-2 text-sm text-tenue">Datos de demostración.</p>
        </section>
        <section aria-labelledby="fac-receptor">
          <h2 id="fac-receptor" className="titulo-seccion mb-2 text-tinta">
            Receptor
          </h2>
          <dl className="space-y-2">
            <Dato termino="Razón social">{factura.razon_social}</Dato>
            <Dato termino="RFC">{factura.rfc}</Dato>
            <Dato termino="Régimen fiscal">{nombreRegimen(factura.regimen_fiscal)}</Dato>
            <Dato termino="Código postal">{factura.codigo_postal}</Dato>
            <Dato termino="Uso de CFDI">{nombreUsoCfdi(factura.uso_cfdi)}</Dato>
            <Dato termino="Correo">{factura.correo}</Dato>
          </dl>
        </section>
      </div>

      <section aria-labelledby="fac-conceptos" className="min-w-0">
        <h2 id="fac-conceptos" className="titulo-seccion mb-2 text-tinta">
          Conceptos
        </h2>
        <table className="tabla hidden sm:table">
          <thead>
            <tr>
              <th scope="col">Descripción</th>
              <th scope="col" className="text-right">
                Cant.
              </th>
              <th scope="col" className="text-right">
                Precio unit.
              </th>
              <th scope="col" className="text-right">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map((c) => (
              <tr key={c.id}>
                <td>{c.descripcion}</td>
                <td className="text-right">{Number(c.cantidad)}</td>
                <td className="text-right">{formatearMoneda(c.precio_unitario)}</td>
                <td className="text-right">{formatearMoneda(c.importe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="border-t-2 border-tinta sm:hidden">
          {conceptos.map((c) => (
            <li key={c.id} className="border-b border-linea py-3">
              <p className="font-bold text-tinta">{c.descripcion}</p>
              <p className="flex justify-between gap-3 text-tinta">
                <span>
                  {Number(c.cantidad)} × {formatearMoneda(c.precio_unitario)}
                </span>
                <span className="font-bold">{formatearMoneda(c.importe)}</span>
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 ml-auto w-full space-y-1 sm:max-w-xs">
          <div className="flex justify-between gap-4 text-tinta">
            <dt>Subtotal</dt>
            <dd>{formatearMoneda(factura.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-tinta">
            <dt>IVA 16 %</dt>
            <dd>{formatearMoneda(factura.iva)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-tinta pt-2 text-tinta">
            <dt className="etiqueta">Total</dt>
            <dd className="placa text-3xl">{formatearMoneda(factura.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="fac-servicio" className="border-t border-linea pt-4">
        <h2 id="fac-servicio" className="sr-only">
          Servicio facturado
        </h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Dato termino="Vehículo">
            <span className="placa block text-2xl">{v?.placa}</span>
            <span className="block">
              {v?.marca} {v?.modelo} {v?.anio}
            </span>
          </Dato>
          <Dato termino="Orden">#{String(factura.orden_id).padStart(4, '0')}</Dato>
        </dl>
      </section>

      <p className="border-t border-linea pt-4 text-sm text-tenue">
        Este documento no es un Comprobante Fiscal Digital por Internet (CFDI).
      </p>
    </article>
  )
}
