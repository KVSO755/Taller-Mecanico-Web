// Mensaje de error bajo un campo (icono + texto en rojo).
export default function MensajeError({ id, children, className = '' }) {
  if (!children) return null
  return (
    <p id={id} className={`mt-1.5 flex items-start gap-1.5 text-sm font-bold text-cancelada ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      >
        <circle cx="10" cy="10" r="8" />
        <path d="M10 5.5v5.5M10 14v.5" />
      </svg>
      <span>{children}</span>
    </p>
  )
}
