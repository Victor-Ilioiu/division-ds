import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '../../../components/molecules'
import { motionAllowed } from '../../../fx/core/gate'
import { hasWebGL2 } from '../../../fx/core/webgl'
import { axeClean } from '../../../test/axe'
import { PRODUCT_VIEWER } from '../../content'
import type { ViewerControls, ViewerState } from '../../scene/viewer.js'
import { CartProvider } from '../../store/cart'
import { findProduct, type CatalogProduct } from '../../store/catalog'
import { Product } from './Product'
import { ProductMedia, VIEW_STEP } from './ProductMedia'
import { cutoutPlacement } from './ProductStage'

/**
 * jsdom has no WebGL, so the scene itself (`scene/viewer.js`) is replaced here by a stand-in with
 * the same surface, and what is under test is everything around it: when the 3D view starts by
 * itself, what it does to the DOM and (not) to focus, which keys and buttons reach the viewer's
 * controls, and what a failure leaves behind. The real scene is proven in a real browser by
 * `e2e/product-viewer.spec.ts`.
 */
const viewer = vi.hoisted(() => ({ startViewer: vi.fn() }))
vi.mock('../../scene/viewer.js', () => viewer)
vi.mock('../../../fx/core/webgl', () => ({ hasWebGL2: vi.fn(() => true) }))
vi.mock('../../../fx/core/gate', async original => ({
  ...(await original<typeof import('../../../fx/core/gate')>()),
  motionAllowed: vi.fn(() => true),
}))

const READY: ViewerState = { ready: true, progress: 1, error: null }

/** A stand-in scene: records how it was started, and lets the test decide when it becomes ready,
 *  fails to start, or reports an error later. */
function fakeViewer() {
  const controls = { orbit: vi.fn(), zoom: vi.fn(), reset: vi.fn(), dispose: vi.fn() } satisfies ViewerControls
  let emit: (state: ViewerState) => void = () => {}
  let resolve: (controls: ViewerControls) => void = () => {}
  let reject: (error: Error) => void = () => {}
  viewer.startViewer.mockImplementation((_mount: HTMLElement, _id: string, onChange: (state: ViewerState) => void) => {
    emit = onChange
    return new Promise<ViewerControls>((res, rej) => {
      resolve = res
      reject = rej
    })
  })
  return {
    controls,
    ready: () =>
      act(async () => {
        emit(READY)
        resolve(controls)
      }),
    /** The module loaded and `startViewer` threw, or the chunk never loaded: a rejection. */
    reject: () => act(async () => reject(new Error('refused'))),
    /** The scene reported a failure through its state, as it does for a lost context. */
    error: () => act(async () => emit({ ready: false, progress: 0, error: 'The WebGL context was lost' })),
  }
}

const product = (id: string): CatalogProduct => findProduct(id)!

const frameOf = (name: string) => screen.getByRole('application', { name: PRODUCT_VIEWER.label(name) })
const view = (container: HTMLElement) => container.querySelector('[data-product-view]')!.getAttribute('data-product-view')
const cutout = (container: HTMLElement) => container.querySelector('[data-product-stage] img')!

/** Renders the media block and waits for the lazy module to have been asked to start. */
async function mounted(id = 'dummy-radio') {
  const result = render(<ProductMedia product={product(id)} />)
  await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
  return result
}

beforeEach(() => {
  viewer.startViewer.mockReset()
  vi.mocked(hasWebGL2).mockReturnValue(true)
  vi.mocked(motionAllowed).mockReturnValue(true)
})

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ProductMedia: the picture', () => {
  it('shows the card’s cutout on its plinth stage, decorative and loaded eagerly', () => {
    vi.mocked(motionAllowed).mockReturnValue(false)
    const { container } = render(<ProductMedia product={product('dummy-radio')} />)
    const img = cutout(container)
    expect(img).toHaveAttribute('src', '/media/products/cutout/dummy-radio.webp')
    expect(img).toHaveAttribute('alt', '')
    // The page's largest picture: never lazy, as the cards' are.
    expect(img).toHaveAttribute('loading', 'eager')
    expect(container.querySelector('[data-product-stage] svg')).toHaveAttribute('aria-hidden', 'true')
    // The old baked-backdrop photo is gone from the page.
    expect(container.querySelector('img[src="/media/products/dummy-radio.webp"]')).not.toBeInTheDocument()
  })
})

describe('ProductMedia: when the 3D view starts', () => {
  it('starts by itself where motion and WebGL2 allow it, with no button to press', async () => {
    fakeViewer()
    const { container } = await mounted()
    expect(screen.queryByRole('button', { name: /3D|photo/i })).not.toBeInTheDocument()
    const frame = frameOf('Dummy radio')
    expect(frame).toHaveAttribute('tabindex', '0')
    // Described by the instructions a sighted visitor reads under the box.
    expect(document.getElementById(frame.getAttribute('aria-describedby')!)).toHaveTextContent(PRODUCT_VIEWER.instructions)
    // The canvas's mount is decoration.
    expect(frame.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(view(container)).toBe('loading')
    expect(screen.getByRole('status')).toHaveTextContent(PRODUCT_VIEWER.loading)

    // Started for this product, on the mount inside the frame, turning, and framed on the cutout.
    const [mount, id, , signal, options] = viewer.startViewer.mock.calls[0]
    expect(frame.contains(mount)).toBe(true)
    expect(id).toBe('dummy-radio')
    expect(signal.aborted).toBe(false)
    expect(options).toEqual({ idle: true, place: cutoutPlacement('dummy-radio') })
  })

  // Mutation: call the import directly instead of through `whenIdle` -> it starts before the
  // idle callback has run.
  it('waits for the browser to be idle before it fetches the scene', async () => {
    const callbacks: Array<() => void> = []
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => callbacks.push(fn))
    vi.stubGlobal('cancelIdleCallback', () => {})
    fakeViewer()
    const { unmount } = render(<ProductMedia product={product('dummy-radio')} />)
    await new Promise(r => setTimeout(r, 20))
    expect(viewer.startViewer).not.toHaveBeenCalled()
    expect(callbacks).toHaveLength(1)
    act(() => callbacks[0]())
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
    // Unmounted here, while the stubs are still in place: the cleanup cancels through them.
    unmount()
  })

  // Mutation: drop `allowed &&` from `viewing` in ProductMedia.tsx -> the viewer starts.
  it('does not start under reduced motion or save-data: the cutout, still, and nothing else', async () => {
    vi.mocked(motionAllowed).mockReturnValue(false)
    const { container } = render(<ProductMedia product={product('dummy-radio')} />)
    await new Promise(r => setTimeout(r, 20))
    expect(viewer.startViewer).not.toHaveBeenCalled()
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: PRODUCT_VIEWER.controls })).not.toBeInTheDocument()
    expect(cutout(container)).toBeInTheDocument()
    expect(view(container)).toBe('cutout')
  })

  // Mutation: drop `supported &&` -> the viewer starts.
  it('does not start without WebGL2', async () => {
    vi.mocked(hasWebGL2).mockReturnValue(false)
    const { container } = render(<ProductMedia product={product('dummy-radio')} />)
    await new Promise(r => setTimeout(r, 20))
    expect(viewer.startViewer).not.toHaveBeenCalled()
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
    expect(view(container)).toBe('cutout')
  })

  // Mutation: drop the `productModel(product.id) !== undefined` term -> it starts for a product
  // the viewer has no model for.
  it('does not start for a product with no row in the model table', async () => {
    render(<ProductMedia product={{ ...product('dummy-radio'), id: 'not-in-the-table' }} />)
    await new Promise(r => setTimeout(r, 20))
    expect(viewer.startViewer).not.toHaveBeenCalled()
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
  })

  // It opened without being asked, so it must not take focus: not on load, not when ready.
  // Mutation: add `frame.current?.focus()` on start or on ready -> the first or second check fails.
  it('leaves focus where it was, on load and when the model lands', async () => {
    const fake = fakeViewer()
    render(
      <>
        <button type="button">Elsewhere</button>
        <ProductMedia product={product('dummy-radio')} />
      </>
    )
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
    expect(elsewhere).toHaveFocus()
    await fake.ready()
    expect(elsewhere).toHaveFocus()
  })

  it('holds the toolbar back until the model is ready, then drops the loading status and hides the cutout', async () => {
    const fake = fakeViewer()
    const { container } = await mounted()
    for (const name of [PRODUCT_VIEWER.rotateLeft, PRODUCT_VIEWER.rotateRight, PRODUCT_VIEWER.zoomIn, PRODUCT_VIEWER.zoomOut, PRODUCT_VIEWER.reset]) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(cutout(container)).toHaveClass('opacity-100')
    await fake.ready()
    expect(view(container)).toBe('viewer')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: PRODUCT_VIEWER.reset })).toBeEnabled()
    // Hidden only once the canvas has faded in over it (the transition's delay), never removed.
    expect(cutout(container)).toHaveClass('opacity-0')
  })

  // Unmounting while the scene is still loading: its start is cancelled through the signal, and
  // the controls that arrive afterwards are disposed straight away, so the context is not kept.
  // Mutation: remove `if (abort.signal.aborted) return started.dispose()` -> dispose is never called.
  it('unmounting before the model is ready aborts the start and disposes it when it arrives', async () => {
    const fake = fakeViewer()
    const { unmount } = await mounted()
    const signal: AbortSignal = viewer.startViewer.mock.calls[0][3]
    unmount()
    expect(signal.aborted).toBe(true)
    expect(fake.controls.dispose).not.toHaveBeenCalled()
    await fake.ready()
    expect(fake.controls.dispose).toHaveBeenCalledTimes(1)
  })

  it('unmounting with the model up disposes the scene', async () => {
    const fake = fakeViewer()
    const { unmount } = await mounted()
    await fake.ready()
    unmount()
    expect(fake.controls.dispose).toHaveBeenCalledTimes(1)
  })

  it('says the model has one finish only where the product is sold in more than one colour', async () => {
    fakeViewer()
    const finish = new RegExp(PRODUCT_VIEWER.oneFinish.replace(/[.]/g, '\\.'))
    const { unmount } = await mounted('kestrel-c')
    expect(screen.getByText(finish)).toBeInTheDocument()
    unmount()
    viewer.startViewer.mockClear()
    await mounted('dummy-radio')
    expect(screen.queryByText(finish)).not.toBeInTheDocument()
  })

  it('is axe clean while the model loads and once it is up', async () => {
    const fake = fakeViewer()
    await mounted('kestrel-c')
    expect(await axeClean(document.body)).toHaveNoViolations()
    await fake.ready()
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

describe('ProductMedia: keyboard and toolbar', () => {
  async function ready() {
    const fake = fakeViewer()
    await mounted()
    await fake.ready()
    // Reached the way a keyboard visitor reaches it: it never takes focus by itself.
    frameOf('Dummy radio').focus()
    return fake.controls
  }

  // Mutation: swap the ArrowLeft and ArrowRight rows in KEYS -> the first two assertions fail.
  it('arrow keys turn and tilt, plus and minus zoom, Home resets', async () => {
    const controls = await ready()
    await userEvent.keyboard('{ArrowRight}')
    expect(controls.orbit).toHaveBeenLastCalledWith(VIEW_STEP.az, 0)
    await userEvent.keyboard('{ArrowLeft}')
    expect(controls.orbit).toHaveBeenLastCalledWith(-VIEW_STEP.az, 0)
    await userEvent.keyboard('{ArrowUp}')
    expect(controls.orbit).toHaveBeenLastCalledWith(0, VIEW_STEP.el)
    await userEvent.keyboard('{ArrowDown}')
    expect(controls.orbit).toHaveBeenLastCalledWith(0, -VIEW_STEP.el)
    await userEvent.keyboard('+')
    expect(controls.zoom).toHaveBeenLastCalledWith(1 / VIEW_STEP.zoom)
    await userEvent.keyboard('=')
    expect(controls.zoom).toHaveBeenLastCalledWith(1 / VIEW_STEP.zoom)
    await userEvent.keyboard('-')
    expect(controls.zoom).toHaveBeenLastCalledWith(VIEW_STEP.zoom)
    expect(controls.zoom).toHaveBeenCalledTimes(3)
    await userEvent.keyboard('{Home}')
    expect(controls.reset).toHaveBeenCalledTimes(1)
  })

  // Ctrl and plus is the browser's own zoom, and the viewer leaves it alone.
  // Mutation: remove the modifier check from `onKeyDown` -> zoom is called.
  it('leaves a key alone when Ctrl, Alt or Cmd is held, and any key it has no use for', async () => {
    const controls = await ready()
    await userEvent.keyboard('{Control>}+{/Control}')
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}')
    await userEvent.keyboard('a{PageDown}{End}')
    expect(controls.zoom).not.toHaveBeenCalled()
    expect(controls.orbit).not.toHaveBeenCalled()
    expect(controls.reset).not.toHaveBeenCalled()
  })

  // An arrow key the viewer uses must not also scroll the page; one pressed before the model is
  // ready is not the viewer's yet and keeps its page meaning.
  it('prevents the default of a key it handles, and only once the model is ready', async () => {
    const fake = fakeViewer()
    await mounted()
    const frame = frameOf('Dummy radio')
    const press = () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      frame.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(press()).toBe(false)
    expect(fake.controls.orbit).not.toHaveBeenCalled()
    await fake.ready()
    expect(press()).toBe(true)
    expect(fake.controls.orbit).toHaveBeenCalledTimes(1)
  })

  it('the toolbar is a named group of five named buttons that do what the keys do', async () => {
    const controls = await ready()
    const group = screen.getByRole('group', { name: PRODUCT_VIEWER.controls })
    expect(group.querySelectorAll('button')).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: PRODUCT_VIEWER.rotateLeft }))
    expect(controls.orbit).toHaveBeenLastCalledWith(-VIEW_STEP.az, 0)
    await userEvent.click(screen.getByRole('button', { name: PRODUCT_VIEWER.rotateRight }))
    expect(controls.orbit).toHaveBeenLastCalledWith(VIEW_STEP.az, 0)
    await userEvent.click(screen.getByRole('button', { name: PRODUCT_VIEWER.zoomIn }))
    expect(controls.zoom).toHaveBeenLastCalledWith(1 / VIEW_STEP.zoom)
    await userEvent.click(screen.getByRole('button', { name: PRODUCT_VIEWER.zoomOut }))
    expect(controls.zoom).toHaveBeenLastCalledWith(VIEW_STEP.zoom)
    await userEvent.click(screen.getByRole('button', { name: PRODUCT_VIEWER.reset }))
    expect(controls.reset).toHaveBeenCalledTimes(1)
  })
})

describe('ProductMedia: failure', () => {
  // Three ways to fail, one result: the cutout, one line that says so, no viewer or toolbar, and
  // nothing on console.error (the e2e suite fails on any).
  const expectFallback = (container: HTMLElement) => {
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: PRODUCT_VIEWER.controls })).not.toBeInTheDocument()
    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    expect(cutout(container)).toHaveClass('opacity-100')
    expect(view(container)).toBe('cutout')
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(PRODUCT_VIEWER.unavailable)
    return notice
  }

  // Mutation: remove the `.catch` from the import chain in ProductMedia.tsx -> the viewer stays
  // up on an empty box and the rejection goes unhandled.
  it('a scene that refuses to start goes back to the cutout and says so, and focus held by the viewer moves to the message', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = fakeViewer()
    const { container } = await mounted()
    frameOf('Dummy radio').focus()
    await fake.reject()
    const notice = expectFallback(container)
    // Focus was on the viewer, which is gone: it lands on the explanation, not on the body.
    expect(notice).toHaveFocus()
    expect(errors).not.toHaveBeenCalled()
  })

  // Mutation: remove the `scene.error` effect -> the viewer stays up after the context is lost.
  it('an error reported by the running scene (a lost context) does the same, and disposes it', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = fakeViewer()
    const { container } = await mounted()
    await fake.ready()
    await fake.error()
    expectFallback(container)
    expect(fake.controls.dispose).toHaveBeenCalledTimes(1)
    expect(errors).not.toHaveBeenCalled()
  })

  // The viewer starts by itself, so most failures happen with focus nowhere near it; the message
  // is announced (role="status") and focus is left alone.
  // Mutation: focus the notice unconditionally on failure -> both checks fail.
  it('leaves focus where it is when the failure happens while focus is elsewhere, or nowhere', async () => {
    const fake = fakeViewer()
    const { container } = render(
      <>
        <button type="button">Elsewhere</button>
        <ProductMedia product={product('dummy-radio')} />
      </>
    )
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    await fake.reject()
    expectFallback(container)
    expect(elsewhere).toHaveFocus()
  })

  it('does not pull focus to the message on a failure during page load', async () => {
    const fake = fakeViewer()
    const { container } = await mounted()
    expect(document.body).toHaveFocus()
    await fake.reject()
    expectFallback(container)
    expect(document.body).toHaveFocus()
  })

  it('is axe clean after a failure', async () => {
    const fake = fakeViewer()
    await mounted()
    await fake.reject()
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})

describe('Product: the viewer across products', () => {
  function renderProduct(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Toaster>
          <CartProvider>
            <Routes>
              <Route path="/store/shop/:id" element={<Product />} />
            </Routes>
          </CartProvider>
        </Toaster>
      </MemoryRouter>
    )
  }

  // The related grid's link is a client-side navigation onto the same mounted <Product>. The
  // media block is keyed on the product id, so the old viewer is unmounted and disposed, and the
  // new product starts its own.
  it('going to another product disposes the viewer and starts that product’s own', async () => {
    const fake = fakeViewer()
    const { container } = renderProduct('/store/shop/bump-helmet')
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
    await fake.ready()
    expect(viewer.startViewer.mock.calls[0][1]).toBe('bump-helmet')

    await userEvent.click(screen.getByRole('link', { name: 'Knee pads, pair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee pads, pair' })).toBeInTheDocument()
    expect(fake.controls.dispose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-product-stage] img')).toHaveAttribute('src', '/media/products/cutout/knee-pads.webp')
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(2))
    expect(viewer.startViewer.mock.calls[1][1]).toBe('knee-pads')
    expect(view(container)).toBe('loading')
  })

  // A failure belongs to the product it happened on: the next product starts its own 3D view.
  // Mutation: remove `key={product.id}` from <ProductMedia> in Product.tsx -> the failure carries
  // over to the next product and its viewer never starts.
  it('a failure on one product does not withdraw the viewer on the next', async () => {
    const fake = fakeViewer()
    renderProduct('/store/shop/bump-helmet')
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(1))
    await fake.reject()
    expect(screen.getByText(PRODUCT_VIEWER.unavailable)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Knee pads, pair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee pads, pair' })).toBeInTheDocument()
    await waitFor(() => expect(viewer.startViewer).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.queryByText(PRODUCT_VIEWER.unavailable)).not.toBeInTheDocument()
  })
})
