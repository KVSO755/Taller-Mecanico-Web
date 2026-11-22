import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listarMisVehiculos } from '../../services/vehiculos'
import { misCitas } from '../../services/citas'
import { traducirError } from '../../services/errores'
import { fechaLargaHoy, formatearFechaHora } from '../../utils/fechas'
import { etiquetaCliente } from '../../utils/estatusCita'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import { clasesBoton } from '../../components/clasesBoton'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import EstadoLista from '../../components/EstadoLista'
import ProgresoOrden from '../../components/ProgresoOrden'

const ordenAbierta = (v) =>
  (v.ordenes ?? [])
    .filter((o) => o.estatus !== 'entregado')
    .sort((x, y) => new Date(y.actualizado_en) - new Date(x.actualizado_en))[0] ?? null

const folio = (id) => `Orden #${String(id).padStart(4, '0')}`

export default function InicioCliente() {
  const navigate = useNavigate()
  const [vehiculos, setVehiculos] = useState([])
  const [citas, setCitas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [v, c] = await Promise.all([listarMisVehiculos(), misCitas()])
      setVehiculos(v)
      const ahora = Date.now()
      setCitas(
        c
          .filter(
            (x) =>
              (x.estatus === 'pendiente' || x.estatus === 'confirmada') &&
              new Date(x.fecha_hora).getTime() > ahora,
          )
          .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
          .slice(0, 3),
      )
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
    <div className="space-y-10">
      <EncabezadoPagina
        titulo="Mis vehículos"
        fecha={fechaLargaHoy()}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link to="/cliente/vehiculos/nuevo" className={clasesBoton('secundario')}>
              Agregar vehículo
            </Link>
            <Link to="/cliente/citas/nueva" className={clasesBoton('primario')}>
              Agendar cita
            </Link>
          </div>
        }
      />

      <EstadoLista cargando={cargando} error={error} onReintentar={cargar}>
        <section aria-label="Vehículos">
          <EstadoLista
            vacio={vehiculos.length === 0}
            mensajeVacio="Aún no tienes vehículos registrados"
            accionVacia={<Boton onClick={() => navigate('/cliente/vehiculos/nuevo')}>Agregar vehículo</Boton>}
          >
            <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vehiculos.map((v) => {
                const orden = ordenAbierta(v)
                return (
                <li key={v.id} className={orden ? 'lg:col-span-2' : undefined}>
                  <Link
                    to={`/cliente/vehiculos/${v.id}`}
                    className="ficha block h-full transition-colors hover:bg-neutro-suave"
                  >
                    <span className="placa block text-2xl text-tinta">{v.placa}</span>
                    <span className="mt-1 block font-bold text-tinta">
                      {v.marca} {v.modelo} · {v.anio}
                      <span className="font-normal text-tenue"> · {v.kilometraje.toLocaleString('es-MX')} km</span>
                    </span>
                    {orden && (
                      <span className="mt-2 block border-t border-linea pt-2">
                        <span className="placa mb-1.5 block text-base text-tinta">{folio(orden.id)}</span>
                        <ProgresoOrden estatus={orden.estatus} />
                      </span>
                    )}
                  </Link>
                </li>
                )
              })}
            </ul>
          </EstadoLista>
        </section>

        <section aria-labelledby="titulo-citas" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="titulo-citas" className="titulo-seccion">
              Próximas citas
            </h2>
            <Link to="/cliente/citas" className="enlace">
              Ver mis citas
            </Link>
          </div>
          {citas.length === 0 ? (
            <div className="flex flex-col items-start gap-3 border border-dashed border-linea px-4 py-4">
              <p className="text-tenue">No tienes citas próximas.</p>
              <Link to="/cliente/citas/nueva" className={clasesBoton('secundario')}>
                Agendar cita
              </Link>
            </div>
          ) : (
            <>
              <table className="tabla hidden md:table">
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Placa</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.map((c) => (
                    <tr key={c.id}>
                      <td className="font-bold">{formatearFechaHora(c.fecha_hora)}</td>
                      <td className="placa text-lg">{c.vehiculo?.placa}</td>
                      <td>{c.motivo}</td>
                      <td>
                        <BadgeEstatus {...etiquetaCliente(c)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="space-y-3 md:hidden">
                {citas.map((c) => (
                  <li key={c.id} className="ficha">
                    <p className="font-bold">{formatearFechaHora(c.fecha_hora)}</p>
                    <p>
                      <span className="placa text-lg">{c.vehiculo?.placa}</span>
                      <span className="text-tenue"> · {c.motivo}</span>
                    </p>
                    <div className="mt-2">
                      <BadgeEstatus {...etiquetaCliente(c)} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </EstadoLista>
    </div>
  )
}
