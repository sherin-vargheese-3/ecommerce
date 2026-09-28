const priceFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const compactPriceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
})
const countFormatter = new Intl.NumberFormat('en-IN')
const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** Full amount below ₹1 lakh; compact (₹12.3L, ₹9.9Cr) above, where full digits stop being readable at a glance. */
export function formatPriceShort(value: number): string {
  return Math.abs(value) >= 100_000 ? compactPriceFormatter.format(value) : priceFormatter.format(value)
}

export function formatCount(value: number): string {
  return countFormatter.format(value)
}
