// Indicador de carga decorativo; el texto o aria-busy del contenedor lo anuncia.
export default function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}
