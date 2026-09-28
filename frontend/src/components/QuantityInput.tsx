interface Props {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
}

/** A −/+ stepper clamped to 1..max. */
export function QuantityInput({ value, max, onChange, label, disabled }: Props) {
  const set = (next: number) => onChange(Math.min(Math.max(1, next), max))
  return (
    <div className="quantity" role="group" aria-label={label}>
      <button type="button" className="secondary" aria-label="Decrease quantity"
        disabled={disabled || value <= 1} onClick={() => set(value - 1)}>−</button>
      <input aria-label={label} inputMode="numeric" value={value} disabled={disabled}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) set(n)
        }} />
      <button type="button" className="secondary" aria-label="Increase quantity"
        disabled={disabled || value >= max} onClick={() => set(value + 1)}>+</button>
    </div>
  )
}
