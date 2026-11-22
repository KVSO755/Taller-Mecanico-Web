import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { historialVehiculo } from '../../services/vehiculos'
import { formatearFechaHora } from '../../utils/fechas'
import { traducirError } from '../../services/errores'
import { idValido } from '../../utils/formularios'
import { etiquetaOrden, tonoOrden } from '../../utils/estatusOrden'
import Boton from '../../components/Boton'
import BadgeEstatus from '../../components/BadgeEstatus'
import EstadoLista from '../../components/EstadoLista'
import ProgresoOrden from '../../components/ProgresoOrden'
import HistorialServicios from '../../components/HistorialServicios'

function ultimoCambio(orden) {
  const fechas = (orden.cambios ?? []).map((c) => c.creado_en)
  return fechas.length ? fechas.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : orden.actualizado_en
}

export default function HistorialVehiculo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehiculo, setVehiculo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setVehiculo(idValido(id) ? await historialVehiculo(id) : null)
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enCurso = vehiculo?.ordenes?.find((o) => o.estatus !== 'entregado')

  return (
    <div className="space-y-6">
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={!vehiculo}
        mensajeVacio="Vehículo no encontrado."
        accionVacia={
          <Boton variante="secundario" onClick={() => navigate('/taller')}>
            Regresar
          </Boton>
        }
      >
        {vehiculo ? (
          <>
            <header className="border-b-2 border-tinta pb-5">
              <h1 className="placa text-7xl text-tinta md:text-8xl">
                <span className="sr-only">Vehículo </span>
                {vehiculo.placa}
              </h1>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <div>
                  <dt className="etiqueta text-tenue">Vehículo</dt>
                  <dd className="font-bold text-tinta">
                    {vehiculo.marca} {vehiculo.modelo}
                  </dd>
                </div>
                <div>
                  <dt className="etiqueta text-tenue">Año</dt>
                  <dd className="text-tinta">{vehiculo.anio}</dd>
                </div>
                <div>
                  <dt className="etiqueta text-tenue">Kilometraje</dt>
                  <dd className="text-tinta">{vehiculo.kilometraje.toLocaleString('es-MX')} km</dd>
                </div>
                {vehiculo.cliente && (
                  <div>
                    <dt className="etiqueta text-tenue">Dueño</dt>
                    <dd className="text-tinta">
                      {vehiculo.cliente.nombre}
                      {vehiculo.cliente.telefono && (
                        <>
                          {' · '}
                          <a href={`tel:${vehiculo.cliente.telefono}`} className="enlace">
                            {vehiculo.cliente.telefono}
                          </a>
                        </>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </header>

            {enCurso && (
              <section aria-labelledby="titulo-en-curso" className="ficha space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="titulo-en-curso" className="titulo-seccion text-tinta">
                    Orden en curso
                  </h2>
                  <BadgeEstatus texto={etiquetaOrden(enCurso.estatus)} tono={tonoOrden(enCurso.estatus)} />
                </div>
                <ProgresoOrden estatus={enCurso.estatus} />
                {enCurso.diagnostico && (
                  <div>
                    <h3 className="etiqueta text-tenue">Diagnóstico</h3>
                    <p className="whitespace-pre-wrap text-tinta">{enCurso.diagnostico}</p>
                  </div>
                )}
                <p className="text-tenue">Último cambio: {formatearFechaHora(ultimoCambio(enCurso))}</p>
                <Link to={`/taller/ordenes/${enCurso.id}`} className="enlace inline-block">
                  Ver orden #{enCurso.id}
                </Link>
              </section>
            )}

            <section aria-labelledby="titulo-historial" className="space-y-3">
              <h2 id="titulo-historial" className="titulo-seccion text-tinta">
                Servicios anteriores
              </h2>
              <HistorialServicios ordenes={vehiculo.ordenes} />
            </section>
          </>
        ) : null}
      </EstadoLista>
    </div>
  )
}
