/** Corvane's money: the system's `formatMoney` conversion, in whole euros. A CRM reads deal sizes
 *  and totals, not prices, and "€344,680.00" makes every figure on a page two characters longer
 *  for cents nobody negotiates. Amounts are still held in cents, like everywhere else. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100)
}
