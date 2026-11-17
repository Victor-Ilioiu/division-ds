/**
 * The footer's backdrop: the hero's isometric floor again, seen from further off. A lattice at the
 * cabinet's 2:1 slope rises out of a signal-orange glow at the bottom edge and fades out towards
 * the small print, with a few lit squares picked out in the accent. It closes the page on the
 * image it opened with. Decoration only: the Footer renders it aria-hidden and inert.
 */
const W = 1600, H = 600, S = 48

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

const meet = (a: number, b: number): [number, number] => [b - a, (a + b) / 2]

const lines: string[] = []
for (let c = -Math.ceil(W / 2 / S) * S; c <= H + W / 2; c += S) {
  lines.push(`M0 ${c}L${W} ${c + W / 2}`, `M0 ${c}L${W} ${c - W / 2}`)
}

// Whole lit squares (a rhombus each), biased to the lower half where the glow is.
const rand = seeded(11)
const lit: string[] = []
const outline: string[] = []
for (let n = 0; n < 22; n++) {
  const x = W * (0.05 + rand() * 0.9), y = H * (0.4 + rand() * 0.55)
  const a = Math.floor((y - x / 2) / S) * S
  const b = Math.floor((y + x / 2) / S) * S
  const v = [meet(a, b), meet(a, b + S), meet(a + S, b + S), meet(a + S, b)]
  const d = `M${v.map(p => p.join(' ')).join('L')}Z`
  ;(n % 3 === 0 ? lit : outline).push(d)
}

// Corner brackets on a few more squares, as in the hero's FloorGrid: each vertex gets two short
// arms along its edges, ARM of the edge long.
const ARM = 0.3
const corners: string[] = []
for (let n = 0; n < 26; n++) {
  const x = W * (0.03 + rand() * 0.94), y = H * (0.3 + rand() * 0.65)
  const a = Math.floor((y - x / 2) / S) * S
  const b = Math.floor((y + x / 2) / S) * S
  const v = [meet(a, b), meet(a, b + S), meet(a + S, b + S), meet(a + S, b)]
  v.forEach((p, k) => {
    const prev = v[(k + 3) % 4], next = v[(k + 1) % 4]
    const at = (q: [number, number]) => `${p[0] + (q[0] - p[0]) * ARM} ${p[1] + (q[1] - p[1]) * ARM}`
    corners.push(`M${at(prev)}L${p[0]} ${p[1]}L${at(next)}`)
  })
}

export function FooterBackdrop({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className}>
      <defs>
        <radialGradient id="footer-glow" cx="50%" cy="100%" r="70%" fx="50%" fy="100%">
          <stop offset="0%" stopColor="var(--color-accent-signal-fill)" stopOpacity="0.28" />
          <stop offset="55%" stopColor="var(--color-accent-signal-fill)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--color-accent-signal-fill)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="footer-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="45%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <mask id="footer-mask" style={{ maskType: 'alpha' }}>
          <rect width={W} height={H} fill="url(#footer-fade)" />
        </mask>
      </defs>
      <rect width={W} height={H} fill="url(#footer-glow)" />
      <g mask="url(#footer-mask)" fill="none">
        <path d={lines.join('')} stroke="var(--color-border-hairline-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={outline.join('')} stroke="var(--color-border-control)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <path d={corners.join('')} stroke="var(--color-border-control)" strokeWidth={2.5} strokeLinecap="square" vectorEffect="non-scaling-stroke" />
        <path
          d={lit.join('')}
          fill="var(--color-accent-signal-fill)"
          fillOpacity={0.14}
          stroke="var(--color-accent-signal-fill)"
          strokeOpacity={0.7}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  )
}
