// Encabezado de pantalla: título, fecha opcional y acciones.
// La fecha va al lado del título (misma línea base) en escritorio y debajo en celular; nunca encima.
export default function EncabezadoPagina({ titulo, fecha, acciones, className = '' }) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}>
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-x-4">
        <h1 className="titulo-pagina text-tinta">{titulo}</h1>
        {fecha && <p className="text-base text-tenue">{fecha}</p>}
      </div>
      {acciones}
    </header>
  )
}
