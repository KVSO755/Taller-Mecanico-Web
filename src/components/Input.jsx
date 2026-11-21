import { useId } from 'react'

export default function Input({ label, error, className = '', id, ...resto }) {
  const generado = useId()
  const inputId = id ?? generado
  const errorId = `${inputId}-error`
  return (
    <div className={className}>
      <label htmlFor={inputId} className="etiqueta mb-1.5 block text-tinta">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className="campo"
        {...resto}
      />
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-bold text-cancelada">
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
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
