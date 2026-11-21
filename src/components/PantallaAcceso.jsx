// Composición de las pantallas de acceso (login, registro, sin permiso, no encontrado).
// Escritorio: panel cobalto a la izquierda (~40%) y formulario a la derecha. Móvil: franja cobalto arriba.
export default function PantallaAcceso({ titulo, subtitulo, children, pie }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="sobre-cobalto bg-cobalto px-4 py-5 text-white sm:px-8 lg:flex lg:w-[40%] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div>
          <p className="font-display text-4xl font-bold leading-none tracking-[0.02em] lg:text-7xl">TallerApp</p>
          <p className="mt-2 max-w-sm text-base text-cobalto-claro lg:mt-6 lg:text-xl lg:leading-snug">
            Agenda tu cita y consulta en qué etapa va tu vehículo, sin llamar al taller.
          </p>
        </div>
        <dl className="mt-8 hidden max-w-sm border-t border-white/30 text-sm lg:block">
          <div className="flex justify-between gap-4 border-b border-white/30 py-3">
            <dt className="etiqueta text-cobalto-claro">Lunes a viernes</dt>
            <dd>08:00–18:00</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/30 py-3">
            <dt className="etiqueta text-cobalto-claro">Sábado</dt>
            <dd>08:00–14:00</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/30 py-3">
            <dt className="etiqueta text-cobalto-claro">Domingo</dt>
            <dd>Cerrado</dd>
          </div>
        </dl>
      </aside>
      <main className="flex flex-1 items-start justify-center bg-fondo px-4 py-8 sm:px-8 lg:items-center lg:px-16 lg:py-12">
        <div className="w-full max-w-md">
          <h1 className="titulo-pagina">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-tenue">{subtitulo}</p>}
          <div className="mt-6">{children}</div>
          {pie && <p className="mt-6 border-t border-linea pt-4 text-sm text-tenue">{pie}</p>}
        </div>
      </main>
    </div>
  )
}
