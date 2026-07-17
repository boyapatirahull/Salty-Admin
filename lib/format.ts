/** Format a ticket price. Returns '—' when no price is recorded. */
export function formatPrice(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—'
  const code = (currency ?? 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(amount))
  } catch {
    // Unknown currency code — fall back to a plain number with the code appended.
    return `${Number(amount).toFixed(2)} ${code}`
  }
}
