import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { buscarPorCorreo, cambiarActivo, cambiarRol, crearEmpleado, listarEmpleados } from '../../services/perfiles'
import { contarAbiertasPorMecanico } from '../../services/ordenes'
import { traducirError } from '../../services/errores'
import Alerta from '../../components/Alerta'
import BadgeEstatus from '../../components/BadgeEstatus'
import Boton from '../../components/Boton'
import EstadoLista from '../../components/EstadoLista'
import Input from '../../components/Input'
import { LIMITES, enfocarPrimerError, useCandado } from '../../utils/formularios'

const MENSAJE_FALLA = 'No se pudo guardar el cambio. Intenta de nuevo.'
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROL = { admin: 'Administrador', empleado: 'Empleado', cliente: 'Cliente' }
const PESTANAS = [
  ['crear', 'Crear cuenta'],
  ['existente', 'Ya tiene cuenta'],
]
const FORM_VACIO = { nombre: '', telefono: '', correo: '', contrasena: '', confirmar: '' }

function mensajeGuardar(e) {
  return e?.code === 'P0001' ? traducirError(e) : MENSAJE_FALLA
}

export default function Empleados() {
  const { perfil } = useAuth()
  const [lista, setLista] = useState([])
  const [abiertas, setAbiertas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [pestana, setPestana] = useState('crear')
  const pestanasRef = useRef([])

  const [form, setForm] = useState(FORM_VACIO)
  const [erroresForm, setErroresForm] = useState({})
  const [errorCrear, setErrorCrear] = useState('')
  const [exitoCrear, setExitoCrear] = useState('')
  const [creando, setCreando] = useState(false)

  const [correo, setCorreo] = useState('')
  const [errorCorreo, setErrorCorreo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [encontrado, setEncontrado] = useState(null)
  const [avisoBusqueda, setAvisoBusqueda] = useState('')
  const candadoCrear = useCandado()
  const candadoBuscar = useCandado()
  const candadoAccion = useCandado()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [l, a] = await Promise.all([listarEmpleados(), contarAbiertasPorMecanico().catch(() => ({}))])
      setLista(l)
      setAbiertas(a)
    } catch (e) {
      setError(traducirError(e, 'cargar'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function teclasPestana(e, i) {
    let destino = null
    if (e.key === 'ArrowRight') destino = (i + 1) % PESTANAS.length
    else if (e.key === 'ArrowLeft') destino = (i - 1 + PESTANAS.length) % PESTANAS.length
    else if (e.key === 'Home') destino = 0
    else if (e.key === 'End') destino = PESTANAS.length - 1
    if (destino === null) return
    e.preventDefault()
    setPestana(PESTANAS[destino][0])
    pestanasRef.current[destino]?.focus()
  }

  async function crear(e) {
    e.preventDefault()
    const formEl = e.currentTarget
    setErrorCrear('')
    setExitoCrear('')
    const nombre = form.nombre.trim()
    const telefono = form.telefono.trim()
    const correoNuevo = form.correo.trim().toLowerCase()
    const errs = {}
    if (!nombre) errs.nombre = 'Escribe el nombre completo.'
    else if (nombre.length < 3) errs.nombre = 'El nombre debe tener al menos 3 caracteres.'
    if (!telefono) errs.telefono = 'Escribe el teléfono.'
    else if (!/^\d{10}$/.test(telefono)) errs.telefono = 'El teléfono debe tener exactamente 10 dígitos, solo números.'
    if (!correoNuevo) errs.correo = 'Escribe el correo.'
    else if (!RE_CORREO.test(correoNuevo)) errs.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.'
    if (!form.contrasena) errs.contrasena = 'Escribe una contraseña temporal.'
    else if (form.contrasena.length < 8) errs.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    if (!form.confirmar) errs.confirmar = 'Confirma la contraseña.'
    else if (form.confirmar !== form.contrasena) errs.confirmar = 'Las contraseñas no coinciden.'
    setErroresForm(errs)
    if (Object.keys(errs).length) {
      enfocarPrimerError(formEl)
      return
    }
    if (!candadoCrear.tomar()) return
    setCreando(true)
    try {
      await crearEmpleado({ nombre, telefono, correo: correoNuevo, contrasena: form.contrasena })
      setExitoCrear(`Empleado creado: ${nombre}. Ya puede iniciar sesión.`)
      setForm(FORM_VACIO)
      await cargar()
    } catch (err) {
      const msg = traducirError(err, 'registro')
      setErrorCrear(
        err?.code === 'user_already_exists' ? `${msg} Usa la pestaña «Ya tiene cuenta» para darle acceso.` : msg,
      )
    } finally {
      candadoCrear.soltar()
      setCreando(false)
    }
  }

  async function buscar(e) {
    e.preventDefault()
    const formEl = e.currentTarget
    setEncontrado(null)
    setAvisoBusqueda('')
    setErrorAccion('')
    const c = correo.trim().toLowerCase()
    const errCorreo = !c
      ? 'Escribe el correo de la persona.'
      : !RE_CORREO.test(c)
        ? 'Escribe un correo válido, por ejemplo nombre@correo.com.'
        : ''
    setErrorCorreo(errCorreo)
    if (errCorreo) {
      enfocarPrimerError(formEl)
      return
    }
    if (!candadoBuscar.tomar()) return
    setBuscando(true)
    try {
      const p = await buscarPorCorreo(c)
      if (!p) {
        setAvisoBusqueda('No hay ninguna cuenta con ese correo. Pide a la persona que se registre primero.')
      } else if (p.rol === 'empleado' || p.rol === 'admin') {
        setAvisoBusqueda('Esta persona ya es empleado.')
      } else {
        setEncontrado(p)
      }
    } catch (err) {
      setAvisoBusqueda(traducirError(err, 'cargar'))
    } finally {
      candadoBuscar.soltar()
      setBuscando(false)
    }
  }

  async function ejecutar(clave, fn, confirmacion, despues) {
    if (!candadoAccion.tomar()) return
    if (!window.confirm(confirmacion)) {
      candadoAccion.soltar()
      return
    }
    setOcupado(clave)
    setErrorAccion('')
    try {
      await fn()
      despues?.()
      await cargar()
    } catch (e) {
      setErrorAccion(mensajeGuardar(e))
    } finally {
      candadoAccion.soltar()
      setOcupado(null)
    }
  }

  function accionesDe(p) {
    return (
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="secundario"
          cargando={ocupado === `r${p.id}`}
          onClick={() =>
            ejecutar(`r${p.id}`, () => cambiarRol(p.id, 'cliente'), `¿Quitar el acceso de empleado a ${p.nombre}?`)
          }
        >
          Quitar acceso
        </Boton>
        <Boton
          variante={p.activo ? 'peligro' : 'primario'}
          cargando={ocupado === `a${p.id}`}
          onClick={() =>
            ejecutar(
              `a${p.id}`,
              () => cambiarActivo(p.id, !p.activo),
              p.activo
                ? `¿Desactivar a ${p.nombre}? Ya no podrá iniciar sesión.`
                : `¿Activar a ${p.nombre}?`,
            )
          }
        >
          {p.activo ? 'Desactivar' : 'Activar'}
        </Boton>
      </div>
    )
  }

  const estadoDe = (p) => <BadgeEstatus texto={p.activo ? 'Activo' : 'Inactivo'} tono={p.activo ? 'verde' : 'gris'} />

  return (
    <div className="space-y-5">
      <h1 className="titulo-pagina text-tinta">Empleados</h1>

      <section aria-labelledby="titulo-agregar" className="border border-linea bg-superficie p-3">
        <h2 id="titulo-agregar" className="titulo-seccion mb-3 text-tinta">
          Agregar empleado
        </h2>
        <div role="tablist" aria-label="Forma de agregar empleado" className="mb-4 flex flex-wrap gap-2">
          {PESTANAS.map(([valor, texto], i) => {
            const activo = pestana === valor
            return (
              <button
                key={valor}
                ref={(el) => {
                  pestanasRef.current[i] = el
                }}
                type="button"
                role="tab"
                id={`tab-alta-${valor}`}
                aria-selected={activo}
                aria-controls={`panel-alta-${valor}`}
                tabIndex={activo ? 0 : -1}
                onClick={() => setPestana(valor)}
                onKeyDown={(e) => teclasPestana(e, i)}
                className={`etiqueta min-h-11 border px-4 md:min-h-10 ${
                  activo
                    ? 'border-tinta bg-amarillo text-tinta'
                    : 'border-linea bg-superficie text-tinta hover:border-tinta hover:bg-neutro-suave'
                }`}
              >
                {texto}
              </button>
            )
          })}
        </div>

        {pestana === 'crear' ? (
          <div role="tabpanel" id="panel-alta-crear" aria-labelledby="tab-alta-crear">
            <form onSubmit={crear} noValidate className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nombre completo"
                  autoComplete="off"
                  maxLength={LIMITES.nombrePerfil}
                  value={form.nombre}
                  onChange={campo('nombre')}
                  error={erroresForm.nombre}
                />
                <Input
                  label="Teléfono (10 dígitos)"
                  type="tel"
                  inputMode="numeric"
                  maxLength={LIMITES.telefono}
                  autoComplete="off"
                  value={form.telefono}
                  onChange={campo('telefono')}
                  error={erroresForm.telefono}
                />
                <Input
                  label="Correo"
                  type="email"
                  autoComplete="off"
                  className="md:col-span-2"
                  maxLength={LIMITES.correo}
                  value={form.correo}
                  onChange={campo('correo')}
                  error={erroresForm.correo}
                />
                <Input
                  label="Contraseña temporal (mínimo 8)"
                  type="password"
                  autoComplete="new-password"
                  maxLength={LIMITES.contrasena}
                  value={form.contrasena}
                  onChange={campo('contrasena')}
                  error={erroresForm.contrasena}
                />
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  autoComplete="new-password"
                  maxLength={LIMITES.contrasena}
                  value={form.confirmar}
                  onChange={campo('confirmar')}
                  error={erroresForm.confirmar}
                />
              </div>
              <Alerta tipo="error">{errorCrear}</Alerta>
              <Alerta tipo="exito">{exitoCrear}</Alerta>
              <Boton type="submit" cargando={creando}>
                Crear empleado
              </Boton>
            </form>
          </div>
        ) : (
          <div role="tabpanel" id="panel-alta-existente" aria-labelledby="tab-alta-existente">
            <form onSubmit={buscar} noValidate>
              <div className="flex flex-wrap items-start gap-2">
                <Input
                  label="Correo"
                  type="email"
                  className="min-w-60 flex-1"
                  maxLength={LIMITES.correo}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  error={errorCorreo || undefined}
                />
                <Boton type="submit" cargando={buscando} className="mt-[1.625rem]">
                  Buscar
                </Boton>
              </div>
            </form>
            <Alerta tipo="info" className="mt-3">
              {avisoBusqueda}
            </Alerta>
            {encontrado && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-3">
                <p className="text-tinta">
                  <span className="font-bold">{encontrado.nombre}</span> · {ROL[encontrado.rol] ?? encontrado.rol}
                </p>
                <Boton
                  cargando={ocupado === 'nuevo'}
                  onClick={() =>
                    ejecutar(
                      'nuevo',
                      () => cambiarRol(encontrado.id, 'empleado'),
                      `¿Dar acceso de empleado a ${encontrado.nombre}?`,
                      () => {
                        setEncontrado(null)
                        setCorreo('')
                      },
                    )
                  }
                >
                  Hacer empleado
                </Boton>
              </div>
            )}
          </div>
        )}
      </section>

      <Alerta tipo="error">{errorAccion}</Alerta>
      <EstadoLista
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        vacio={lista.length === 0}
        mensajeVacio="Aún no hay empleados registrados."
      >
        <table className="tabla hidden md:table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Trabajos abiertos</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="font-bold text-tinta">{p.nombre}</td>
                <td className="break-all">{p.correo}</td>
                <td>{p.telefono}</td>
                <td>{ROL[p.rol] ?? p.rol}</td>
                <td>{estadoDe(p)}</td>
                <td className="placa text-xl">{abiertas[p.id] ?? 0}</td>
                <td>{p.id === perfil?.id ? <span className="text-tenue">Tu cuenta</span> : accionesDe(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="space-y-3 md:hidden">
          {lista.map((p) => (
            <li key={p.id} className="ficha space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-tinta">{p.nombre}</span>
                {estadoDe(p)}
              </div>
              <p className="break-all text-tinta">{p.correo}</p>
              {p.telefono && <p className="text-tenue">{p.telefono}</p>}
              <p className="etiqueta text-tenue">
                {ROL[p.rol] ?? p.rol} · Trabajos abiertos: {abiertas[p.id] ?? 0}
              </p>
              {p.id === perfil?.id ? <p className="text-tenue">Tu cuenta</p> : accionesDe(p)}
            </li>
          ))}
        </ul>
      </EstadoLista>
    </div>
  )
}
