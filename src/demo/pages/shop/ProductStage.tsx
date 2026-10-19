import { useId, type CSSProperties } from 'react'
import { cn } from '../../../lib/cn'
import FRAMES from './cutout-frames.json' with { type: 'json' }
import { publicPath } from '../../../base-path'

/** The cutout (the model alone, transparent) at 1280 x 960. `spike/tools/renders.mjs --cutout`
 *  writes it, a 640 x 480 copy beside it, and its framing into ./cutout-frames.json. */
export const cutoutSrc = (id: string) => publicPath(`/media/products/cutout/${id}.webp`)

export const cutoutSrcSet = (id: string) => `${publicPath(`/media/products/cutout/${id}-640.webp`)} 640w, ${cutoutSrc(id)} 1280w`

/** A card is about 17 to 20rem wide (four across on the homepage, three in the shop), half
 *  the viewport between two columns, the whole of it on one. The browser picks the 1280 file
 *  for any card over 320 CSS px on a 2x screen. */
const SIZES = '(min-width: 64rem) 20rem, (min-width: 36rem) 50vw, 100vw'

/**
 * The stage's colours, per theme. Each is a token; what differs between themes is which token
 * plays which role, because a stage is lit, and "the light" is near white in both themes while
 * the page's own surfaces invert. Dark: a near-black studio with a cool light pool, like a
 * product photographer's black sweep. Light: a pale studio, never a black box on a white page.
 * The opacities are numbers on purpose: the same light reads stronger on black than on white.
 */
const THEME = cn(
  '[--stage-wall:var(--color-surface-base)] [--stage-light:var(--color-text-primary)] [--stage-shade:var(--color-surface-base)]',
  '[--stage-top:var(--color-surface-sunken)] [--stage-side:var(--color-surface-base)]',
  '[--stage-glow:0.2] [--stage-pool:0.42] [--stage-sheen:0.13] [--stage-rim:0.6] [--stage-cast:0.9] [--stage-falloff:0.85]',
  'in-data-[theme=light]:[--stage-light:var(--color-surface-base)] in-data-[theme=light]:[--stage-shade:var(--color-text-muted)]',
  'in-data-[theme=light]:[--stage-wall:var(--color-surface-sunken)] in-data-[theme=light]:[--stage-top:var(--color-surface-base)]',
  'in-data-[theme=light]:[--stage-side:var(--color-surface-sunken)]',
  'in-data-[theme=light]:[--stage-glow:0.55] in-data-[theme=light]:[--stage-pool:0.9] in-data-[theme=light]:[--stage-sheen:0.5]',
  'in-data-[theme=light]:[--stage-rim:0.9] in-data-[theme=light]:[--stage-cast:0.35] in-data-[theme=light]:[--stage-falloff:0.22]'
)

type Frame = [left: number, top: number, right: number, bottom: number]

/** Where the product is in its cutout, as fractions of the frame. Each product's camera frames
 *  it differently (a sight fills its picture, a rifle runs edge to edge), so the stage refits
 *  every one: at most FIT_W wide and FIT_H tall, never enlarged past MAX_SCALE (an enlarged
 *  file stops being sharp), centred, its lowest point on FLOAT. */
export const cutoutFrame = (id: string): Frame => ((FRAMES as Record<string, number[]>)[id] as Frame | undefined) ?? [0.1, 0.2, 0.9, 0.8]
const FIT_W = 0.8
const FIT_H = 0.42
const MAX_SCALE = 1
/** The product's lowest point, as a fraction of the box's height: a clear gap above the
 *  plinth's far edge (TOP - RY), which is what reads as floating. */
const FLOAT = 0.655

/** Where the cutout's whole picture sits in the stage's box, as fractions of the box: its width
 *  and height (`scale`, the same for both, since the picture and the box are both 4:3) and its
 *  top-left corner. The product page's live model is framed by the same numbers (its camera's
 *  view offset, see `startViewer`'s `place`), so it lands where the cutout was. */
export function cutoutPlacement(id: string) {
  const [x0, y0, x1, y1] = cutoutFrame(id)
  const scale = Math.min(FIT_W / (x1 - x0), FIT_H / (y1 - y0), MAX_SCALE)
  return { scale, left: 0.5 - scale * ((x0 + x1) / 2), top: FLOAT - scale * y1 }
}

const stop = (color: string, opacity: string | number): CSSProperties => ({ stopColor: `var(${color})`, stopOpacity: opacity })

// The plinth, in the SVG's 400 x 300 box: a disc seen from about 14 degrees above, which is the
// cameras' elevation in scene/products.js, so the disc and the product agree on the horizon.
const CX = 200
const TOP = 230
const RX = 132
const RY = 22
const DEPTH = 18
const LEFT = CX - RX
const RIGHT = CX + RX
/** The visible side band: down the left edge, along the near half of the bottom rim, up the
 *  right edge, and back along the near half of the top rim. */
const SIDE = `M${LEFT} ${TOP} V${TOP + DEPTH} A${RX} ${RY} 0 0 0 ${RIGHT} ${TOP + DEPTH} V${TOP} A${RX} ${RY} 0 0 1 ${LEFT} ${TOP} Z`
/** The near half of the top rim, where the light catches the edge. */
const RIM = `M${LEFT} ${TOP} A${RX} ${RY} 0 0 0 ${RIGHT} ${TOP}`

/**
 * A product on a studio plinth: the shop's card picture (ProductCard's `renderMedia`).
 *
 * Why not the photo with the backdrop baked in: on a flat radial pool the replicas read as
 * drawings. A floor, a plinth and a shadow give them a place to be, and the shadow sitting on
 * the plinth below the product, not under its grip, is what makes it float. Why not WebGL: a
 * shop page shows up to twelve cards, and twelve contexts for a still picture is not a trade
 * worth making. The stage is one inline SVG, and the product is a transparent render of its own
 * 3D model (`spike/tools/renders.mjs --cutout`, the same camera as the product page's photo),
 * shot at 2x and offered at 640 and 1280 px wide, so a 2x screen gets a sharp picture.
 *
 * Decorative throughout: the SVG is aria-hidden and the image's alt is empty, the policy
 * ProductCard states (the card's name is the text). The 4:3 box is the card's own.
 *
 * The product page uses it too (ProductMedia.tsx), as the picture its live model floats over:
 * `eager` because there it is the page's largest image, not one card of twelve below the fold,
 * `sizes` for its wider box, and `imgClassName` to fade the cutout once the model covers it.
 */
export function ProductStage({
  id,
  className,
  eager = false,
  sizes = SIZES,
  imgClassName,
}: {
  id: string
  className?: string
  /** Load the cutout straight away, at high priority, instead of lazily. */
  eager?: boolean
  /** The `sizes` attribute for the cutout's `srcSet`: how wide the box is drawn. */
  sizes?: string
  /** Classes on the cutout image (the product page fades it out under its live model). */
  imgClassName?: string
}) {
  const uid = useId().replace(/:/g, '')
  const ref = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${ref(name)})`
  const [x0, , x1] = cutoutFrame(id)
  const { scale, left, top } = cutoutPlacement(id)
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`
  const place: CSSProperties = { width: pct(scale), height: pct(scale), left: pct(left), top: pct(top) }
  /** The product's shadow follows its footprint: a magazine casts a small one, a rifle a long
   *  one, in the SVG's units. */
  const shadowRx = Math.max(26, Math.min(RX * 0.8, scale * (x1 - x0) * 400 * 0.42))
  return (
    <div className={cn('relative isolate aspect-[4/3] w-full overflow-hidden', THEME, className)}>
      <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          {/* The wall: a little light behind the product, falling off toward the top. */}
          <radialGradient id={ref('glow')} cx="0.5" cy="0.55" r="0.6">
            <stop offset="0" style={stop('--stage-light', 'var(--stage-glow)')} />
            <stop offset="1" style={stop('--stage-light', 0)} />
          </radialGradient>
          <linearGradient id={ref('falloff')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('--stage-shade', 'var(--stage-falloff)')} />
            <stop offset="0.55" style={stop('--stage-shade', 0)} />
          </linearGradient>
          {/* The floor: a pool of light in front of the plinth, the way the reference studio
              lights its sweep. */}
          <radialGradient id={ref('pool')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" style={stop('--stage-light', 'var(--stage-pool)')} />
            <stop offset="0.6" style={stop('--stage-light', 'calc(var(--stage-pool) * 0.35)')} />
            <stop offset="1" style={stop('--stage-light', 0)} />
          </radialGradient>
          {/* The plinth's side: dark at both ends where it turns away, a soft sheen left of
              centre where the key light lands. */}
          <linearGradient id={ref('side')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={stop('--stage-shade', 0.7)} />
            <stop offset="0.38" style={stop('--stage-light', 'var(--stage-sheen)')} />
            <stop offset="0.62" style={stop('--stage-light', 'calc(var(--stage-sheen) * 0.4)')} />
            <stop offset="1" style={stop('--stage-shade', 0.75)} />
          </linearGradient>
          <linearGradient id={ref('top')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('--stage-light', 'calc(var(--stage-sheen) * 0.9)')} />
            <stop offset="1" style={stop('--stage-light', 'calc(var(--stage-sheen) * 0.25)')} />
          </linearGradient>
          <linearGradient id={ref('rim')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={stop('--stage-light', 0)} />
            <stop offset="0.4" style={stop('--stage-light', 'var(--stage-rim)')} />
            <stop offset="0.7" style={stop('--stage-light', 'calc(var(--stage-rim) * 0.6)')} />
            <stop offset="1" style={stop('--stage-light', 0)} />
          </linearGradient>
          <filter id={ref('soft')} x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={ref('softer')} x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <rect width="400" height="300" style={{ fill: 'var(--stage-wall)' }} />
        <rect width="400" height="300" fill={url('glow')} />
        <rect width="400" height="300" fill={url('falloff')} />
        <ellipse cx={CX} cy="292" rx="250" ry="70" fill={url('pool')} />

        {/* The plinth's shadow on the floor, then the plinth. */}
        <ellipse cx={CX} cy={TOP + DEPTH + 4} rx={RX + 12} ry={RY * 0.55} filter={url('soft')} style={{ fill: 'var(--stage-shade)', opacity: 'var(--stage-cast)' }} />
        <path d={SIDE} style={{ fill: 'var(--stage-side)' }} />
        <path d={SIDE} fill={url('side')} />
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} style={{ fill: 'var(--stage-top)' }} />
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} fill={url('top')} />
        <path d={RIM} fill="none" stroke={url('rim')} strokeWidth="1" />

        {/* The product's own shadow on the plinth: soft, narrower than the disc, and well below
            the product, so the gap between them is the float. */}
        <ellipse cx={CX} cy={TOP + 2} rx={shadowRx} ry={RY * 0.38} filter={url('softer')} style={{ fill: 'var(--stage-shade)', opacity: 'calc(var(--stage-cast) * 0.6)' }} />
      </svg>
      <img
        src={cutoutSrc(id)}
        srcSet={cutoutSrcSet(id)}
        sizes={sizes}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        style={place}
        className={cn('absolute max-w-none', imgClassName)}
      />
    </div>
  )
}

/** ProductCard's `renderMedia` for the store: every card in the shop and on the homepage. */
export const stagedMedia = (product: { id: string }) => <ProductStage id={product.id} />
