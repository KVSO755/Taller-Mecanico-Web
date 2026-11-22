import { useId } from 'react'
import MensajeError from './MensajeError'

// `contador`: muestra "n/máximo" bajo el campo (requiere maxLength).
export default function Input({ label, error, className = '', id, contador = false, ...resto }) {
  const generado = useId()
  const inputId = id ?? generado
  const errorId = `${inputId}-error`
  const largo = String(resto.value ?? '').length
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
      {error && <MensajeError id={errorId}>{error}</MensajeError>}
      {contador && resto.maxLength ? (
        <p className="mt-1.5 text-sm text-tenue">
          {largo}/{resto.maxLength}
        </p>
      ) : null}
    </div>
  )
}
