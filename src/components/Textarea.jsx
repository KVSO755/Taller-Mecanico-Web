import { useId } from 'react'
import MensajeError from './MensajeError'

// Área de texto con etiqueta, error y contador "n/máximo" (usa maxLength).
export default function Textarea({ label, error, ayuda, className = '', id, ...resto }) {
  const generado = useId()
  const areaId = id ?? generado
  const errorId = `${areaId}-error`
  const ayudaId = `${areaId}-ayuda`
  const largo = String(resto.value ?? '').length
  return (
    <div className={className}>
      <label htmlFor={areaId} className="etiqueta mb-1.5 block text-tinta">
        {label}
      </label>
      <textarea
        id={areaId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={`${error ? `${errorId} ` : ''}${ayudaId}`}
        className="campo"
        {...resto}
      />
      {error && <MensajeError id={errorId}>{error}</MensajeError>}
      <p id={ayudaId} className="mt-1.5 text-sm text-tenue">
        {resto.maxLength ? `${largo}/${resto.maxLength}` : null}
        {ayuda ? `${resto.maxLength ? ' · ' : ''}${ayuda}` : null}
      </p>
    </div>
  )
}
