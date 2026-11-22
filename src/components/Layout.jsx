import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { rutaInicioPorRol } from '../routes/rutaInicio'
import Boton from './Boton'
import LimiteError from './LimiteError'

function enlacesPorRol(rol) {
  if (rol === 'cliente') {
    return [
      { a: '/cliente', texto: 'Inicio', fin: true },
      { a: '/cliente/citas', texto: 'Mis citas' },
      { a: '/cliente/facturas', texto: 'Mis facturas' },
    ]
  }
  const base = [
    { a: rutaInicioPorRol(rol), texto: 'Inicio', fin: true },
    { a: '/taller/citas', texto: 'Citas' },
    { a: '/taller/ordenes', texto: 'Órdenes' },
    { a: '/taller/inventario', texto: 'Inventario' },
  ]
  if (rol === 'admin') base.push({ a: '/admin/empleados', texto: 'Empleados' })
  return base
}

const ROLES = { cliente: 'Cliente', empleado: 'Empleado', admin: 'Administrador' }

function Menu({ enlaces, onNavegar }) {
  return (
    <nav aria-label="Principal">
      <ul>
        {enlaces.map((e) => (
          <li key={e.a}>
            <NavLink
              to={e.a}
              end={e.fin}
              onClick={onNavegar}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/8 ${
                  isActive ? 'bg-white/12' : ''
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 ${isActive ? 'bg-amarillo' : 'bg-transparent'}`} />
                  {e.texto}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Usuario({ nombre, rol, conRol = true, onSalir }) {
  return (
    <div className="px-6">
      <p className={`font-medium ${conRol ? '' : 'mb-4'}`}>{nombre}</p>
      {conRol && <p className="mb-4 text-sm text-cobalto-claro">{ROLES[rol] ?? rol}</p>}
      <Boton variante="claro" onClick={onSalir} className="w-full">
        Salir
      </Boton>
    </div>
  )
}

function Marca({ rol }) {
  return (
    <div className="px-6">
      <span className="block font-display text-[2rem] font-bold leading-8 tracking-[0.02em]">TallerApp</span>
      <span className="mt-1 block text-sm text-cobalto-claro">{ROLES[rol] ?? ''}</span>
    </div>
  )
}

export default function Layout() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const botonRef = useRef(null)
  const enlaces = enlacesPorRol(perfil?.rol)

  // Escape cierra el panel y devuelve el foco al botón de menú.
  useEffect(() => {
    if (!abierto) return undefined
    function onKey(e) {
      if (e.key === 'Escape') {
        setAbierto(false)
        botonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto])

  async function salir() {
    try {
      await logout()
    } catch {
      // Sin red: igual se sale de la pantalla actual.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#contenido"
        className="no-imprimir sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-amarillo focus:px-3 focus:py-2 focus:text-tinta"
      >
        Saltar al contenido
      </a>

      {/* Móvil y tablet: barra superior cobalto pegajosa con panel desplegable */}
      <header className="no-imprimir sobre-cobalto sticky top-0 z-30 bg-cobalto text-white lg:hidden">
        <div className="flex h-14 items-center justify-between pl-4 pr-2">
          <span className="font-display text-2xl font-bold tracking-[0.02em]">TallerApp</span>
          <button
            ref={botonRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center hover:bg-white/12"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setAbierto((v) => !v)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
            >
              {abierto ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        <div
          id="menu-principal"
          hidden={!abierto}
          className="absolute left-0 right-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/20 bg-cobalto pb-6 pt-2"
        >
          <Menu enlaces={enlaces} onNavegar={() => setAbierto(false)} />
          <div className="mt-4 border-t border-white/20 pt-4">
            <Usuario nombre={perfil?.nombre} rol={perfil?.rol} onSalir={salir} />
          </div>
        </div>
      </header>

      {/* Escritorio: riel izquierdo de 240px */}
      <aside className="no-imprimir sobre-cobalto sticky top-0 hidden h-screen flex-col bg-cobalto pb-6 pt-8 text-white lg:flex">
        <Marca rol={perfil?.rol} />
        <div className="mt-8">
          <Menu enlaces={enlaces} onNavegar={() => {}} />
        </div>
        <div className="mt-auto">
          <Usuario nombre={perfil?.nombre} rol={perfil?.rol} conRol={false} onSalir={salir} />
        </div>
      </aside>

      <main id="contenido" className="min-w-0 px-4 py-4 sm:px-6 lg:p-6">
        <div className="mx-auto w-full max-w-[1360px]">
          <LimiteError clave={pathname}>
            <Outlet />
          </LimiteError>
        </div>
      </main>
    </div>
  )
}
