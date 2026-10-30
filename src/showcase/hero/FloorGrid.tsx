/**
 * The hero's floor: an isometric grid at the cabinet's own 2:1 slope, fading out from behind it,
 * with hairline corner brackets on a few squares. Lines take the cabinet's palette (see CabinetHero).
 */
const W = 1600, H = 900, S = 60, ARM = 0.3

// A fixed pseudo-random pick, so the bracketed squares are the same on every visit and in tests.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/** The vertex where the rising line y = x/2 + a meets the falling line y = -x/2 + b. */
const meet = (a: number, b: number): [number, number] => [b - a, (a + b) / 2]

const lines: string[] = []
// intercepts on whole multiples of S, the same lattice the bracketed squares snap to below
for (let c = -Math.ceil(W / 2 / S) * S; c <= H + W / 2; c += S) {
  lines.push(`M0 ${c}L${W} ${c + W / 2}`, `M0 ${c}L${W} ${c - W / 2}`)
}

const rand = seeded(7)
const corners: string[] = []
for (let n = 0; n < 14; n++) {
  // a square near a random point in the fade's bright half, between rising lines a, a + S and
  // falling lines b, b + S
  const x = W * (0.5 + rand() * 0.45), y = H * (0.15 + rand() * 0.75)
  const a = Math.floor((y - x / 2) / S) * S
  const b = Math.floor((y + x / 2) / S) * S
  const v = [meet(a, b), meet(a, b + S), meet(a + S, b + S), meet(a + S, b)]
  if (v.some(([x, y]) => x < 0 || x > W || y < 0 || y > H)) continue
  v.forEach((p, k) => {
    const prev = v[(k + 3) % 4], next = v[(k + 1) % 4]
    const at = (q: [number, number]) => `${p[0] + (q[0] - p[0]) * ARM} ${p[1] + (q[1] - p[1]) * ARM}`
    corners.push(`M${at(prev)}L${p[0]} ${p[1]}L${at(next)}`)
  })
}

export function FloorGrid({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className}>
      <defs>
        <radialGradient id="floor-fade" cx="74%" cy="55%" r="42%">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        {/* An alpha mask reads only the stops' opacity, so their colour does not matter. */}
        <mask id="floor-mask" style={{ maskType: 'alpha' }}>
          <rect width={W} height={H} fill="url(#floor-fade)" />
        </mask>
      </defs>
      <g mask="url(#floor-mask)" fill="none" vectorEffect="non-scaling-stroke">
        <path d={lines.join('')} stroke="var(--color-border-hairline-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={corners.join('')} stroke="var(--color-border-control)" strokeWidth={2.5} strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  )
}
