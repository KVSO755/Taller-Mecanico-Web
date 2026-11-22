import { useId } from 'react'

// Select con etiqueta y error accesibles (estilo .campo).
export default function CampoSelect({ label, error, opciones, placeholder, className = '', id, ...resto }) {
  const generado = useId()
  const selectId = id ?? generado
  const errorId = `${selectId}-error`
  return (
    <div className={className}>
      <label htmlFor={selectId} className="etiqueta mb-1.5 block text-tinta">
        {label}
      </label>
      <select
        id={selectId}
        className="campo"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...resto}
      >
        <option value="">{placeholder}</option>
        {opciones.map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {valor} · {texto}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-bold text-cancelada">
          {error}
        </p>
      )}
    </div>
  )
}
