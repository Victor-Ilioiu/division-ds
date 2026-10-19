/** The currency's own decimal count (JPY has none, KWD has three), read from a throwaway
 *  formatter rather than hard-coded, so `formatMoney` and `formatMoneyCompact` convert a minor
 *  unit to a major one the same way regardless of which currency this call happens to be for. */
function minorUnitDigits(currency: string, locale: string): number {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  // TypeScript's own lib types this optional (some Intl.ResolvedNumberFormatOptions fields are
  // style-dependent); for `style: 'currency'` it is always set, to the currency's own decimal
  // count, so `2` here is a type-only fallback, never a real one.
  return formatter.resolvedOptions().maximumFractionDigits ?? 2
}

/** Formats an amount held in the currency's own minor unit -- cents for EUR, fils for KWD, whole
 *  yen for JPY, which has none. Amounts are integers everywhere else in this system, so a sum of
 *  prices never picks up floating-point error; this is the one place they become text. A
 *  non-integer amount is rounded to the nearest whole minor unit rather than thrown on: a caller
 *  passing one is a bug upstream, not a reason to crash the page. */
export function formatMoney(
  minorUnits: number,
  { currency = 'EUR', locale = 'en-IE' }: { currency?: string; locale?: string } = {}
): string {
  const digits = minorUnitDigits(currency, locale)
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Math.round(minorUnits) / 10 ** digits)
}

/** The same conversion as `formatMoney`, abbreviated for a tight space -- a chart's y-axis tick,
 *  never a table cell or a total someone is meant to read exactly. Intl's own `notation:
 *  'compact'` only abbreviates once the value reaches four digits, so a typical monthly total
 *  under 1,000 reads as plain, un-rounded euros with no decimals ("€600"); above that it reads
 *  "€1.2K" rather than clipping the panel's fixed-width axis with "€1,200.00". */
export function formatMoneyCompact(
  minorUnits: number,
  { currency = 'EUR', locale = 'en-IE' }: { currency?: string; locale?: string } = {}
): string {
  const digits = minorUnitDigits(currency, locale)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(Math.round(minorUnits) / 10 ** digits)
}
