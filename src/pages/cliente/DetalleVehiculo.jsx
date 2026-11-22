import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { historialVehiculo, actualizarVehiculo } from '../../services/vehiculos'
import { nombreMecanico } from '../../services/ordenes'
import { traducirError } from '../../services/errores'
import Boton from '../../components/Boton'
import { clasesBoton } from '../../components/clasesBoton'
import EstadoLista from '../../components/EstadoLista'
import FormVehiculo from '../../components/FormVehiculo'
import ProgresoOrden from '../../components/ProgresoOrden'
import HistorialServicios from '../../components/HistorialServicios'
import BadgeEstatus from '../../components/BadgeEstatus'
import RefaccionesCliente from '../../components/RefaccionesCliente'
import { formatearFechaHora } from '../../utils/fechas'
import { idValido } from '../../utils/formularios'
import { etiquetaOrden, tonoOrden } from '../../utils/estatusOrden'

function ultimoCambio(orden) {
  const fechas = (orden.cambios ?? []).map((c) => c.creado_en)
  return fechas.length ? fechas.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : orden.actualizado_en
}

function Dato({ termino, children }) {
  return (
    <div className="border-b border-linea py-2 last:border-b-0">
      <dt className="etiqueta text-tenue">{termino}</dt>
      <dd className="text-lg font-bold">{children}</dd>
    </div>
  )
}

export default function DetalleVehiculo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehiculo, setVehiculo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // Un id no numérico equivale a "no encontrado".
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

  async function guardar(datos) {
    const actualizado = await actualizarVehiculo(id, datos)
    if (!actualizado) throw new Error('sin cambios')
    setVehiculo((v) => ({ ...v, ...actualizado }))
    setEditando(false)
  }

  const enCurso = vehiculo?.ordenes?.find((o) => o.estatus !== 'entregado')
  const enCursoId = enCurso?.id
  const [mecanicoDe, setMecanicoDe] = useState({ id: null, nombre: null })
  const mecanico = mecanicoDe.id === enCursoId ? mecanicoDe.nombre : null

  useEffect(() => {
    if (!enCursoId) return
    let activo = true
    nombreMecanico(enCursoId)
      .then((n) => activo && setMecanicoDe({ id: enCursoId, nombre: n }))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [enCursoId])

  return (
    <div className="space-y-6">
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={!vehiculo}
        mensajeVacio="Vehículo no encontrado."
        accionVacia={
          <Boton variante="secundario" onClick={() => navigate('/cliente')}>
            Regresar
          </Boton>
        }
      >
        {vehiculo ? (
          <>
            <header className="space-y-3">
              <Link to="/cliente" className="enlace inline-block">
                Regresar
              </Link>
              <h1 className="placa text-3xl text-tinta lg:text-4xl">{vehiculo.placa}</h1>
              <p className="text-lg text-tenue">
                {vehiculo.marca} {vehiculo.modelo}
              </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
              <section aria-labelledby="titulo-datos" className="ficha">
                <h2 id="titulo-datos" className="titulo-seccion mb-2">
                  {editando ? 'Editar datos' : 'Datos'}
                </h2>
                {editando ? (
                  <FormVehiculo
                    edicion
                    inicial={vehiculo}
                    onGuardar={guardar}
                    onCancelar={() => setEditando(false)}
                  />
                ) : (
                  <>
                    <dl>
                      <Dato termino="Marca">{vehiculo.marca}</Dato>
                      <Dato termino="Modelo">{vehiculo.modelo}</Dato>
                      <Dato termino="Año">{vehiculo.anio}</Dato>
                      <Dato termino="Kilometraje">{vehiculo.kilometraje.toLocaleString('es-MX')} km</Dato>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Boton variante="secundario" onClick={() => setEditando(true)}>
                        Editar datos
                      </Boton>
                      <Link to={`/cliente/citas/nueva?vehiculoId=${vehiculo.id}`} className={clasesBoton('primario')}>
                        Agendar cita
                      </Link>
                    </div>
                  </>
                )}
              </section>

              {enCurso && (
                <section aria-labelledby="titulo-en-curso" className="ficha space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="titulo-en-curso" className="titulo-seccion">
                      Orden en curso
                    </h2>
                    <BadgeEstatus texto={etiquetaOrden(enCurso.estatus)} tono={tonoOrden(enCurso.estatus)} />
                  </div>
                  <ProgresoOrden estatus={enCurso.estatus} />
                  {mecanico && <p className="text-tinta">Mecánico: {mecanico}</p>}
                  {enCurso.diagnostico && (
                    <div>
                      <h3 className="etiqueta text-tenue">Diagnóstico</h3>
                      <p className="whitespace-pre-wrap">{enCurso.diagnostico}</p>
                    </div>
                  )}
                  <RefaccionesCliente ordenId={enCurso.id} />
                  <p className="text-tenue">Último cambio: {formatearFechaHora(ultimoCambio(enCurso))}</p>
                </section>
              )}
            </div>

            <section aria-labelledby="titulo-historial" className="space-y-3">
              <h2 id="titulo-historial" className="titulo-seccion">
                Servicios anteriores
              </h2>
              <HistorialServicios ordenes={vehiculo.ordenes} conFactura />
            </section>
          </>
        ) : null}
      </EstadoLista>
    </div>
  )
}
