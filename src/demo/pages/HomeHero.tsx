import { useEffect, useId, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Badge, Button, LoadingAnimation } from '../../components/atoms'
import { useToast } from '../../components/molecules'
import { motionAllowed, onReducedMotionChange } from '../../fx/core/gate'
import { hasWebGL2 } from '../../fx/core/webgl'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/money'
import { HOME } from '../content'
import { Disclaimer } from '../Disclaimer'
import type { SceneControls, SceneOptions, SceneState } from '../scene/hero.js'
import { useCart } from '../store/cart'
import { KIT, findProduct, kitSaving, kitSeparatePrice } from '../store/catalog'
import { quickAddToCart } from '../store/quickAdd'
import { publicPath } from '../../base-path'

/** How long the preloader stays up at the least, even when the scene is ready sooner, so it reads
 *  as a deliberate beat and not a flash. */
const MIN_LOADER_MS = 4000

/** The still shown wherever the live scene does not run: the assembled Kestrel C on the stage,
 *  shot from the scene itself by `npm run hero:poster`. Two framings, because the hero has two:
 *  the wide one (2400 x 1080, cropped to the section by `object-cover`) from `lg` up, the 960
 *  one is the stacked 4:3 block with the camera centred on the stage. */
const POSTER = { wide: publicPath('/media/hero-poster.webp'), stacked: publicPath('/media/hero-poster-960.webp') }

const IDLE: SceneState = { ready: false, progress: 0, phase: 'Building geometry', assembled: false, busy: false, error: null }

/**
 * The darkening laid over the scene from `lg` up, where the copy sits on top of it: a left-hand
 * band behind the text and a soft vignette. These two colours are the only raw values in the
 * hero, and they are the scene's own near-black background, not interface: no token describes
 * "the colour of the wall in the 3D set".
 */
const SHADE =
  'linear-gradient(90deg, rgb(7 8 11 / 0.9) 0%, rgb(7 8 11 / 0.66) 26%, rgb(7 8 11 / 0) 52%), ' + // token-discipline: allow, the 3D set's own wall colour (see above)
  'radial-gradient(120% 90% at 60% 45%, rgb(0 0 0 / 0) 55%, rgb(0 0 0 / 0.55) 100%)'

/** Screenshot switches, read off the URL once. A normal visit carries none of them.
 *  `?scene=assembled` starts with the kit mounted, `?scene-t=3` freezes the clock at that second,
 *  `?scene-p=0.55` pins the assemble sequence part-way and `?scene-yaw=40` turns the replica. */
function readSceneOptions(): SceneOptions {
  const params = new URLSearchParams(window.location.search)
  const number = (key: string) => {
    const value = params.get(key)
    return value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined
  }
  return {
    assembled: params.get('scene') === 'assembled',
    time: number('scene-t'),
    progress: number('scene-p'),
    yaw: number('scene-yaw'),
  }
}

/**
 * The `/demo` hero: the Kestrel C operator kit as an offer, over a live three.js scene.
 *
 * Everything a visitor reads or clicks is a design-system component or the system's own type and
 * colour classes. The canvas is decoration: `aria-hidden`, and nothing on the page depends on it.
 *
 * **The scene is lazy and optional.** `../scene/hero.js` is reached only through `import()`, so
 * three.js and every model are their own chunk and this file adds none of it to the main one. It
 * runs only where `motionAllowed()` says effects may run and a WebGL2 context exists. Under
 * reduced motion or save-data, without WebGL2, or when the scene fails to start or loses its
 * context, the same box holds a still of the assembled replica, there is no preloader, and
 * Assemble becomes a plain link to the kit's product page. Buy kit works either way.
 *
 * **The box never changes size.** From `lg` up the section is one screen under the Navbar and
 * the stage fills it; below `lg` the stage is a 4:3 block above the copy. Both are stated in CSS
 * before anything loads, and the canvas, the still and the preloader are all absolutely
 * positioned inside the stage, so the sections and the Footer below never move.
 *
 * **Dark, in both themes.** The 3D set is dark whatever the theme, and from `lg` up the copy
 * sits on top of it, so the section pins `data-theme="dark"` for its own subtree. The component
 * tokens re-resolve there (see `scripts/build-tokens.mjs`).
 */
export function HomeHero() {
  const headingId = useId()
  const mount = useRef<HTMLDivElement>(null)
  const controls = useRef<SceneControls | null>(null)
  const { add } = useCart()
  const { toast } = useToast()

  const [allowed, setAllowed] = useState(() => motionAllowed())
  useEffect(() => onReducedMotionChange(reduced => setAllowed(motionAllowed(reduced))), [])
  // No WebGL2 is known before the first render. A scene that throws, a chunk that fails to load
  // and a lost context are only known later, and all of them end here.
  const [failed, setFailed] = useState(() => !hasWebGL2())
  const live = allowed && !failed

  const [scene, setScene] = useState<SceneState>(IDLE)
  const [minElapsed, setMinElapsed] = useState(false)
  // The preloader stays mounted through its slide, then leaves the DOM, which also frees its
  // own WebGL context.
  const [loaderGone, setLoaderGone] = useState(false)

  useEffect(() => {
    const host = mount.current
    if (!live || !host) return
    const abort = new AbortController()
    setScene(IDLE)
    setMinElapsed(false)
    setLoaderGone(false)
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_LOADER_MS)
    import('../scene/hero.js')
      .then(({ startScene }) =>
        startScene(host, next => !abort.signal.aborted && setScene(next), abort.signal, readSceneOptions())
      )
      .then(started => {
        // Strict Mode mounts twice in dev: a start that finished after its own cleanup ran has
        // to give its context back straight away.
        if (abort.signal.aborted) return started.dispose()
        controls.current = started
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true)
      })
    return () => {
      abort.abort()
      window.clearTimeout(timer)
      controls.current?.dispose()
      controls.current = null
    }
  }, [live])

  useEffect(() => {
    if (scene.error) setFailed(true)
  }, [scene.error])

  const loading = live && !(scene.ready && minElapsed)
  // The slide-out normally ends with a transitionend. A timer removes the panel as well, for the
  // case where that event never arrives (a background tab, a transition cut short).
  useEffect(() => {
    if (!live || loading) return
    const id = window.setTimeout(() => setLoaderGone(true), 700)
    return () => window.clearTimeout(id)
  }, [live, loading])

  const replica = findProduct('kestrel-c')!
  const kit = findProduct(KIT.id)!
  const copy = HOME.hero

  return (
    <section
      aria-labelledby={headingId}
      data-theme="dark"
      data-hero={live ? 'live' : 'still'}
      className="relative flex flex-col overflow-hidden border-b border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] lg:block lg:h-[calc(100dvh-3.5rem)] lg:min-h-[600px]"
    >
      {/* The stage. A 4:3 block when stacked (the framing the camera needs to fit the replica
          without a band of empty floor under it), the whole section from lg up. */}
      <div
        data-hero-stage
        className="relative aspect-[4/3] max-h-[64dvh] w-full lg:absolute lg:inset-0 lg:aspect-auto lg:max-h-none"
      >
        {live ? (
          <div
            ref={mount}
            aria-hidden="true"
            className="absolute inset-0 cursor-grab touch-pan-y [&.dragging]:cursor-grabbing [&>canvas]:block [&>canvas]:size-full"
          />
        ) : (
          // alt="": the h1 beside it names the product, the same policy ProductCard states.
          <picture>
            <source media="(min-width: 1024px)" srcSet={POSTER.wide} />
            <img
              src={POSTER.stacked}
              alt=""
              className="absolute inset-0 size-full object-cover lg:object-[50%_60%]"
            />
          </picture>
        )}
        <div
          aria-hidden="true"
          data-hero-chrome
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{ background: SHADE }}
        />

        {live && !loaderGone ? (
          <div
            // Centred over the stage: the whole block when stacked, the right-hand part from lg
            // up, where the copy column does not reach.
            className={cn(
              'absolute inset-0 grid place-items-center bg-[var(--color-surface-base)] lg:pl-[38%]',
              // Leaves by sliding off to the right; the section's overflow-hidden clips it.
              'transition-transform [transition-duration:var(--duration-slow)] [transition-timing-function:var(--ease-snap)] motion-reduce:transition-none',
              loading ? 'translate-x-0' : 'pointer-events-none translate-x-full'
            )}
            data-loader={loading ? 'on' : 'leaving'}
            onTransitionEnd={() => !loading && setLoaderGone(true)}
          >
            <div className="flex flex-col items-center gap-4">
              {/* `label` is what makes the dial a live region. It goes the moment the wait is
                  over, so the status stops announcing before the panel has finished leaving. */}
              <LoadingAnimation variant="reticle" size="lg" label={loading ? copy.loading : undefined} />
              <p className="font-mono text-xs uppercase tracking-[0.12em] tabular-nums text-[var(--color-text-secondary)]">
                {scene.ready ? 'Ready' : `${scene.phase} · ${Math.round(scene.progress * 100)}%`}
              </p>
            </div>
          </div>
        ) : null}

        {live ? (
          // aria-hidden: it is an instruction for the canvas, which is itself hidden from
          // assistive technology.
          <p
            aria-hidden="true"
            data-hero-chrome
            className="pointer-events-none absolute right-[var(--page-gutter,1rem)] top-4 font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)] lg:bottom-6 lg:top-auto"
          >
            {copy.dragHint}
          </p>
        ) : null}
      </div>

      {/* The copy. `pointer-events-none` on the column so a drag that starts in its empty margins
          still reaches the scene; the text and controls opt back in.

          Padding. The page gutter (`px-gutter`), like everything else on the demo site: 16px
          when stacked, 64px from `lg`, where the copy sits ON the scene. For a short while the
          hero alone was inset to 64px and the rest of the page stayed at 16px; Victor then asked
          for the 64px everywhere (2026-10-02), so the h1 is flush with the Navbar brand again and
          e2e/pages.spec.ts holds that. */}
      <div
        data-hero-chrome
        className="pointer-events-none relative z-10 flex flex-col gap-4 px-gutter py-8 lg:h-full lg:max-w-[42rem] lg:justify-center lg:py-0 [&>*]:pointer-events-auto"
      >
        <p>
          <Badge tone="signal" emphasis="subtle" dot>
            {copy.offer}
          </Badge>
        </p>
        <h1 id={headingId} className="font-display text-3xl font-semibold uppercase text-[var(--color-text-primary)] md:text-5xl">
          {replica.name}
          <span className="block font-display text-base font-light tracking-wide text-[var(--color-text-secondary)] md:text-xl">
            {copy.kitLabel}
          </span>
        </h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)] md:text-base">
          {copy.savingLead}{' '}
          <strong className="font-semibold text-[var(--color-accent-signal-text)]">{kitSaving()}% cheaper</strong>{' '}
          {copy.savingTail}
        </p>
        <p className="font-mono text-xs text-[var(--color-text-secondary)]">{copy.specs}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-4xl tabular-nums text-[var(--color-text-primary)] md:text-5xl">
          <span>
            <span className="sr-only">Price: </span>
            {formatMoney(KIT.price)}{' '}
            <s className="ml-1 text-base text-[var(--color-text-secondary)] md:text-xl">
              <span className="sr-only">was </span>
              {formatMoney(kitSeparatePrice())}
            </s>
          </span>
          <Badge tone="signal" emphasis="solid" size="md">
            −{kitSaving()}%
          </Badge>
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {live ? (
            <Button
              size="lg"
              loading={scene.busy}
              loadingLabel={copy.working}
              disabled={loading || !scene.ready}
              onClick={() => controls.current?.toggle()}
            >
              {scene.assembled ? copy.disassemble : copy.assemble}
            </Button>
          ) : (
            <Button asChild size="lg">
              <RouterLink to={kit.href}>{copy.seeKit}</RouterLink>
            </Button>
          )}
          <Button size="lg" variant="secondary" onClick={() => quickAddToCart(add, toast, KIT.id)}>
            {copy.buy}
          </Button>
        </div>
        <Disclaimer />
      </div>
    </section>
  )
}
