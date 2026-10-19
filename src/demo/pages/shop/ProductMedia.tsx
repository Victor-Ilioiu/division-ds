import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Home, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { IconButton, Spinner } from '../../../components/atoms'
import { motionAllowed, onReducedMotionChange, prefersReducedMotion } from '../../../fx/core/gate'
import { hasWebGL2 } from '../../../fx/core/webgl'
import { cn } from '../../../lib/cn'
import { PRODUCT_VIEWER } from '../../content'
import { productModel } from '../../scene/products.js'
import type { ViewerControls, ViewerState } from '../../scene/viewer.js'
import type { CatalogProduct } from '../../store/catalog'
import { ProductStage, cutoutPlacement } from './ProductStage'

const IDLE: ViewerState = { ready: false, progress: 0, error: null }

/** One key press or one toolbar press: degrees of turn, degrees of tilt, and the zoom ratio. */
export const VIEW_STEP = { az: 15, el: 10, zoom: 1.15 }

/** The keys the focused viewer answers to. Anything else, and anything with Ctrl, Alt or Cmd
 *  held, is left to the browser. */
const KEYS: Record<string, (controls: ViewerControls) => void> = {
  ArrowLeft: controls => controls.orbit(-VIEW_STEP.az, 0),
  ArrowRight: controls => controls.orbit(VIEW_STEP.az, 0),
  ArrowUp: controls => controls.orbit(0, VIEW_STEP.el),
  ArrowDown: controls => controls.orbit(0, -VIEW_STEP.el),
  '+': controls => controls.zoom(1 / VIEW_STEP.zoom),
  '=': controls => controls.zoom(1 / VIEW_STEP.zoom),
  '-': controls => controls.zoom(VIEW_STEP.zoom),
  _: controls => controls.zoom(VIEW_STEP.zoom),
  Home: controls => controls.reset(),
}

const SMALL = 'font-body text-xs text-[var(--color-text-secondary)]'

/** The box is half the content width from the `md` breakpoint (Product.tsx's two columns), the
 *  whole of it below. The cutout inside is drawn smaller than the box, so this errs sharp. */
const SIZES = '(min-width: 48rem) 50vw, 100vw'

/** Runs `begin` once the page has painted and the main thread is free, or after `timeout` ms at
 *  the latest. Returns the cancel. */
function whenIdle(begin: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(begin, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(begin, 1)
  return () => window.clearTimeout(id)
}

/**
 * The picture on a product page: the product's cutout on the shop's plinth stage (ProductStage,
 * the same picture as its card), and, where it can work, the live model over it, which the
 * visitor can turn and zoom.
 *
 * **Live by default, where it can work.** The viewer starts by itself on page load when
 * `motionAllowed()` is true (so not under reduced motion or save-data, unless a reviewer forces
 * effects with `?fx=force`), a WebGL2 context is available, the product has a row in
 * `scene/products.js`, and the viewer has not already failed for this product. Otherwise the
 * page shows the cutout on its stage, still, and nothing of the viewer exists.
 *
 * **The cutout first, three.js after.** `../../scene/viewer.js` (three.js, the model, the
 * shaders) comes through `import()`, so it stays out of the page's chunk, and the import starts
 * only once the browser is idle after the first paint (`whenIdle`): the cutout, the page's
 * largest picture, is fetched eagerly and never waits on it.
 *
 * **One picture, then the other, without a jump.** The canvas is transparent, so the stage
 * behind it is the page's own, in either theme, and the model is framed by the cutout's own
 * placement (`cutoutPlacement`, passed as `place`): it floats where the cutout floats, at the
 * angle the cutout was shot from. The cutout stays up until the model's first frames are drawn;
 * the canvas fades in over it, and only then is the cutout hidden, so the two never show at half
 * strength each and a turned model never has its own picture behind it. Once it has landed the
 * model turns slowly by itself (one revolution in about 45 seconds) until the visitor first
 * touches it; under reduced motion the viewer is not offered at all, and with `?fx=force` it
 * holds still.
 *
 * **The box never changes size.** It is the stage's 4:3 block; the canvas is absolutely
 * positioned inside it, and so is the loading chip in its corner. The toolbar and the
 * instructions under it render with the page, not when the model lands, and the toolbar's
 * buttons stay disabled, with the chip saying why, until it has.
 *
 * **Accessible as a control, not as a picture.** The canvas is `aria-hidden`. Its wrapper is one
 * focusable element with `role="application"` (it handles arrow keys itself), named with the
 * product's name and what can be done, described by the instructions under it. Everything the
 * pointer can do the keyboard and the toolbar's buttons can do: turn, zoom, reset.
 *
 * **Focus.** The viewer opens by itself, so it never takes focus: page load leaves focus where
 * the page puts it, and the viewer is reached by Tab like any other control, before its toolbar
 * in reading order. Becoming ready does not move focus. When the viewer fails while focus is on
 * it or its toolbar (both about to leave the DOM), focus moves to the message that says so; when
 * focus is anywhere else, it stays there. There is nothing to return focus to on a close,
 * because there is no close.
 *
 * **Failure is a state.** A chunk that will not load, a scene that throws and a lost WebGL
 * context all end the same way: the canvas goes, the cutout on its stage is what the box shows,
 * one line says the 3D view is unavailable, and the viewer is not started again for this
 * product.
 *
 * Product.tsx renders this with `key={product.id}`, so going from one product to another
 * unmounts it: the viewer is disposed and its WebGL context given back before the next product
 * starts one.
 */
export function ProductMedia({ product }: { product: CatalogProduct }) {
  const instructionsId = useId()
  const region = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const notice = useRef<HTMLParagraphElement>(null)
  const controls = useRef<ViewerControls | null>(null)
  /** Set when the viewer fails while it, or its toolbar, holds focus. */
  const refocus = useRef(false)

  const [allowed, setAllowed] = useState(() => motionAllowed())
  useEffect(() => onReducedMotionChange(reduced => setAllowed(motionAllowed(reduced))), [])
  const [supported] = useState(() => hasWebGL2())
  const [failed, setFailed] = useState(false)
  const [scene, setScene] = useState<ViewerState>(IDLE)

  const viewing = allowed && supported && !failed && productModel(product.id) !== undefined

  const fail = () => {
    // Focus inside the viewer or its toolbar is about to lose its element.
    if (region.current?.contains(document.activeElement)) refocus.current = true
    setFailed(true)
  }

  useEffect(() => {
    const host = mount.current
    if (!viewing || !host) return
    const abort = new AbortController()
    const cancel = whenIdle(() => {
      if (abort.signal.aborted) return
      import('../../scene/viewer.js')
        .then(({ startViewer }) =>
          startViewer(host, product.id, next => !abort.signal.aborted && setScene(next), abort.signal, {
            // The slow idle turn, as before the viewer opened by itself (Victor, 2026-10-15). It
            // stops for good at the first thing the visitor does. `?fx=force` can open the viewer
            // for a visitor who asked for reduced motion: they get the model, still.
            idle: !prefersReducedMotion(),
            place: cutoutPlacement(product.id),
          })
        )
        .then(started => {
          // A start that finished after its own cleanup ran gives its context back straight away.
          if (abort.signal.aborted) return started.dispose()
          controls.current = started
        })
        .catch(() => {
          if (!abort.signal.aborted) fail()
        })
    })
    return () => {
      cancel()
      abort.abort()
      controls.current?.dispose()
      controls.current = null
      // Forgotten with the scene it described. Left behind, a restart (reduced motion switched
      // off again) would read "ready" from the last one for one render: the toolbar live and the
      // cutout hidden, over no canvas.
      setScene(IDLE)
    }
  }, [viewing, product.id])

  useEffect(() => {
    if (scene.error) fail()
  }, [scene.error])

  useEffect(() => {
    if (!failed || !refocus.current) return
    refocus.current = false
    notice.current?.focus()
  }, [failed])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const act = KEYS[event.key]
    // Until the model is ready the keys keep their page meaning: an arrow scrolls.
    if (!act || !controls.current) return
    event.preventDefault()
    act(controls.current)
  }

  const ready = viewing && scene.ready
  const copy = PRODUCT_VIEWER

  return (
    <div ref={region} data-product-view={viewing ? (ready ? 'viewer' : 'loading') : 'cutout'} className="flex min-w-0 flex-col gap-3">
      {/* The box. Its focus ring is drawn here, outside the picture and on the page's own
          surface, when the viewer inside holds keyboard focus: an inset ring would sit on the
          model. */}
      <div
        data-product-stage
        className="relative has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-focus-ring)]"
      >
        {/* The card's picture: the cutout on its plinth. Decorative (alt=""): the h1 beside it
            names the product, the policy ProductCard states for its own image. It stays under
            the live model until the model has been drawn and faded in, then hides: after the
            fade, not during it. */}
        <ProductStage
          id={product.id}
          eager
          sizes={SIZES}
          imgClassName={cn(
            'transition-opacity duration-0 motion-reduce:transition-none',
            ready ? 'opacity-0 [transition-delay:var(--duration-base)]' : 'opacity-100'
          )}
        />

        {viewing ? (
          <div
            role="application"
            tabIndex={0}
            aria-label={copy.label(product.name)}
            aria-describedby={instructionsId}
            onKeyDown={onKeyDown}
            className="absolute inset-0 outline-none"
          >
            <div
              ref={mount}
              aria-hidden="true"
              className={cn(
                // `touch-pan-y`: a vertical swipe over the model is still the page scrolling.
                'absolute inset-0 cursor-grab touch-pan-y [&.dragging]:cursor-grabbing [&>canvas]:block [&>canvas]:size-full',
                'transition-opacity [transition-duration:var(--duration-base)] motion-reduce:transition-none',
                ready ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>
        ) : null}

        {/* Why the toolbar's buttons are disabled, while they are. In the box's corner, on the
            floor and clear of the product, and out of the page's flow: in the toolbar's row it
            wrapped on a phone, and its going moved everything under it. */}
        {viewing && !ready ? (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] px-3 py-2">
            <Spinner size="sm" label={copy.loading} />
            <span aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              {copy.loading}
            </span>
          </div>
        ) : null}
      </div>

      {viewing ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label={copy.controls} className="flex items-center gap-1">
              <IconButton variant="ghost" size="sm" label={copy.rotateLeft} disabled={!ready} onClick={() => controls.current?.orbit(-VIEW_STEP.az, 0)}>
                <RotateCcw aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton variant="ghost" size="sm" label={copy.rotateRight} disabled={!ready} onClick={() => controls.current?.orbit(VIEW_STEP.az, 0)}>
                <RotateCw aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton variant="ghost" size="sm" label={copy.zoomIn} disabled={!ready} onClick={() => controls.current?.zoom(1 / VIEW_STEP.zoom)}>
                <ZoomIn aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton variant="ghost" size="sm" label={copy.zoomOut} disabled={!ready} onClick={() => controls.current?.zoom(VIEW_STEP.zoom)}>
                <ZoomOut aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton variant="ghost" size="sm" label={copy.reset} disabled={!ready} onClick={() => controls.current?.reset()}>
                <Home aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          </div>
          <p id={instructionsId} className={SMALL}>
            {copy.instructions}
            {product.colours.length > 0 ? ` ${copy.oneFinish}` : null}
          </p>
        </>
      ) : null}

      {failed ? (
        // role="status": said aloud when it appears. tabIndex -1: it can take the focus the
        // viewer was holding when it went.
        <p ref={notice} role="status" tabIndex={-1} className={SMALL}>
          {copy.unavailable}
        </p>
      ) : null}
    </div>
  )
}
