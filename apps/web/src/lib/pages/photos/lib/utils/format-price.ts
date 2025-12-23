/**
 * Formats a price value for display in Dutch locale with Euro symbol.
 */
export function formatPrice(price: number | undefined): string {
  if (price === undefined) return 'Price on request'
  return `€ ${price.toLocaleString('nl-NL')}`
}
