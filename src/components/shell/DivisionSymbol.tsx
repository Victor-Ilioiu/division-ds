/**
 * The Division DS symbol: four corner brackets around a centre square, drawn on a 24 grid. It sits
 * before the "Division" wordmark in every header (docs, showcase, Hexline, Corvane) and is the
 * favicon (public/favicon.svg, the same path). Decorative beside the wordmark, so it is hidden from
 * assistive technology; the link around it carries the name.
 */
export function DivisionSymbol({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M2 2h7v3H5v4H2zM22 2v7h-3V5h-4V2zM2 22v-7h3v4h4v3zM19 15h3v2.5L17.5 22H15v-3h1.24L19 16.24zM10 10h4v4h-4z" />
    </svg>
  )
}
