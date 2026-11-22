import { Link, useNavigate } from 'react-router'
import { crearVehiculo } from '../../services/vehiculos'
import FormVehiculo from '../../components/FormVehiculo'

export default function NuevoVehiculo() {
  const navigate = useNavigate()

  async function guardar(datos) {
    await crearVehiculo(datos)
    navigate('/cliente')
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Link to="/cliente" className="enlace inline-block">
          Regresar
        </Link>
        <h1 className="titulo-pagina">Agregar vehículo</h1>
      </div>
      <div className="ficha">
        <FormVehiculo onGuardar={guardar} onCancelar={() => navigate('/cliente')} />
      </div>
    </div>
  )
}
