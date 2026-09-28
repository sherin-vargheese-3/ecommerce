import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
}

export function FormField({ label, name, error, ...inputProps }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} aria-invalid={error ? true : undefined} {...inputProps} />
      {error && <small className="error">{error}</small>}
    </label>
  )
}
