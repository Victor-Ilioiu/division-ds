import { StrictMode, createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Terminal, type TerminalHandle } from './Terminal'

// The contract with xterm, in jsdom, which cannot lay out or draw a terminal. Real rendering, real
// keys, large bursts and themes in a browser are in e2e/terminal.spec.ts.
const h = vi.hoisted(() => ({
  terms: [] as FakeTerm[],
  fits: [] as { fit: ReturnType<typeof vi.fn> }[],
  resizeObservers: [] as { cb: () => void; disconnect: ReturnType<typeof vi.fn> }[],
  size: { cols: 80, rows: 24 },
}))

type FakeTerm = {
  options: Record<string, unknown>
  write: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  emitData(data: string): void
  key: (event: KeyboardEvent) => boolean
  addons: unknown[]
  cols: number
  rows: number
}

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown>
    unicode = { activeVersion: '6' }
    write = vi.fn()
    clear = vi.fn()
    focus = vi.fn()
    dispose = vi.fn()
    addons: unknown[] = []
    textarea = document.createElement('textarea')
    key: (event: KeyboardEvent) => boolean = () => true
    private listener: (data: string) => void = () => {}
    constructor(options: Record<string, unknown>) {
      this.options = { ...options }
      h.terms.push(this as unknown as FakeTerm)
    }
    get cols() { return h.size.cols }
    get rows() { return h.size.rows }
    loadAddon(addon: unknown) { this.addons.push(addon) }
    open(host: HTMLElement) { host.append(this.textarea) }
    onData(listener: (data: string) => void) { this.listener = listener }
    emitData(data: string) {
      // xterm drops input itself under disableStdin; this fake does not, so the guard is what is tested.
      this.listener(data)
    }
    attachCustomKeyEventHandler(key: (event: KeyboardEvent) => boolean) { this.key = key }
    hasSelection() { return false }
    getSelection() { return '' }
    clearSelection() {}
  },
}))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn()
    constructor() { h.fits.push(this) }
  },
}))
vi.mock('@xterm/addon-unicode11', () => ({ Unicode11Addon: class {} }))
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }))

const last = () => h.terms[h.terms.length - 1]

beforeEach(() => {
  h.terms.length = 0
  h.fits.length = 0
  h.resizeObservers.length = 0
  h.size = { cols: 80, rows: 24 }
  vi.stubGlobal('ResizeObserver', class {
    disconnect = vi.fn()
    cb: () => void
    constructor(cb: () => void) {
      this.cb = cb
      h.resizeObservers.push(this)
    }
    observe() {}
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-theme')
})

describe('input', () => {
  it('reports typed data, using the latest callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Terminal label="Agent" status="live" onData={first} />)
    rerender(<Terminal label="Agent" status="live" onData={second} />)
    last().emitData('a')
    expect(second).toHaveBeenCalledWith('a')
    expect(first).not.toHaveBeenCalled()
    expect(h.terms).toHaveLength(1)
  })

  it('readOnly blocks input and follows the prop', () => {
    const onData = vi.fn()
    const { rerender } = render(<Terminal label="Agent" status="live" readOnly onData={onData} />)
    expect(last().options.disableStdin).toBe(true)
    last().emitData('a')
    expect(onData).not.toHaveBeenCalled()
    expect(screen.getByText('Read only')).toBeInTheDocument()
    rerender(<Terminal label="Agent" status="live" onData={onData} />)
    expect(last().options.disableStdin).toBe(false)
    last().emitData('b')
    expect(onData).toHaveBeenCalledWith('b')
  })

  it('readOnly leaves Tab and Escape to the browser; live, the program gets them', () => {
    const tab = new KeyboardEvent('keydown', { key: 'Tab' })
    const { rerender } = render(<Terminal label="Agent" status="live" />)
    expect(last().key(tab)).toBe(true)
    rerender(<Terminal label="Agent" status="live" readOnly />)
    expect(last().key(tab)).toBe(false)
  })

  it('Ctrl+Shift+L moves focus to the next tab stop', () => {
    render(
      <>
        <Terminal label="Agent" status="live" />
        <button type="button">After</button>
      </>
    )
    const after = screen.getByRole('button', { name: 'After' })
    vi.spyOn(after, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    const handled = last().key(new KeyboardEvent('keydown', { key: 'L', ctrlKey: true, shiftKey: true, cancelable: true }))
    expect(handled).toBe(false)
    expect(after).toHaveFocus()
  })

  it('shows the way out with Kbd, except when Tab already works', () => {
    const { rerender, container } = render(<Terminal label="Agent" status="live" />)
    expect([...container.querySelectorAll('kbd')].map(k => k.textContent)).toEqual(['Ctrl', 'Shift', 'L'])
    rerender(<Terminal label="Agent" status="live" readOnly />)
    expect(container.querySelectorAll('kbd')).toHaveLength(0)
  })
})

describe('resize', () => {
  it('reports the first size once, debounced', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    render(<Terminal label="Agent" status="live" onResize={onResize} />)
    expect(onResize).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(100) })
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith({ cols: 80, rows: 24 })
  })

  it('collapses a burst to its last size, and stays quiet when the grid did not change', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    render(<Terminal label="Agent" status="live" onResize={onResize} />)
    act(() => { vi.advanceTimersByTime(100) })
    onResize.mockClear()

    const observer = h.resizeObservers[0]
    act(() => { observer.cb(); vi.advanceTimersByTime(100) })
    expect(onResize).not.toHaveBeenCalled()

    act(() => {
      for (const cols of [90, 100, 110]) {
        h.size = { cols, rows: 30 }
        observer.cb()
        vi.advanceTimersByTime(50)
      }
      vi.advanceTimersByTime(100)
    })
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith({ cols: 110, rows: 30 })
  })

  it('does not fit a hidden container, which would collapse the grid', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0)
    render(<Terminal label="Agent" status="live" />)
    expect(h.fits[0].fit).not.toHaveBeenCalled()
  })
})

describe('lifecycle', () => {
  it('disposes xterm and every observer on unmount, and a pending report never fires', () => {
    vi.useFakeTimers()
    const onResize = vi.fn()
    const disconnectTheme = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const { unmount } = render(<Terminal label="Agent" status="live" onResize={onResize} />)
    unmount()
    expect(last().dispose).toHaveBeenCalledTimes(1)
    expect(h.resizeObservers[0].disconnect).toHaveBeenCalled()
    expect(disconnectTheme).toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(500) })
    expect(onResize).not.toHaveBeenCalled()
  })

  it('in StrictMode leaves one live terminal, and input arrives once', () => {
    const onData = vi.fn()
    const { container } = render(
      <StrictMode>
        <Terminal label="Agent" status="live" onData={onData} />
      </StrictMode>
    )
    expect(h.terms).toHaveLength(2)
    expect(h.terms[0].dispose).toHaveBeenCalledTimes(1)
    expect(h.terms[1].dispose).not.toHaveBeenCalled()
    last().emitData('a')
    expect(onData).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('textarea').length).toBeGreaterThan(0)
  })

  it('writes through the handle to the live terminal, without rendering', () => {
    const ref = createRef<TerminalHandle>()
    render(<StrictMode><Terminal ref={ref} label="Agent" status="live" /></StrictMode>)
    const renderSpy = vi.spyOn(last(), 'write')
    const bytes = new Uint8Array([104, 105])
    ref.current!.write(bytes)
    expect(renderSpy).toHaveBeenCalledWith(bytes, undefined)
    expect(h.terms[0].write).not.toHaveBeenCalled()
  })
})

describe('status', () => {
  const cases = [
    [{ status: 'connecting' }, 'Connecting', 'info'],
    [{ status: 'reconnecting' }, 'Reconnecting', 'info'],
    [{ status: 'live' }, 'Live', 'ok'],
    [{ status: 'exited', exitCode: 0 }, 'Exited, code 0', 'text-secondary'],
    [{ status: 'exited', exitCode: 2 }, 'Exited, code 2', 'hostile'],
    [{ status: 'error', statusMessage: 'Refused' }, 'Error', 'hostile'],
  ] as const

  for (const [props, word, tone] of cases) {
    it(`${word} shows the word in the ${tone} tone`, () => {
      render(<Terminal label="Agent" {...props} />)
      expect(screen.getByText(word).className).toContain(tone)
    })
  }

  it('announces the status in its own region, with the message, and no output', () => {
    const ref = createRef<TerminalHandle>()
    const { rerender } = render(<Terminal ref={ref} label="Agent" status="connecting" />)
    expect(screen.getByRole('status')).toHaveTextContent('Agent: Connecting')
    ref.current!.write('secret output')
    expect(screen.getByRole('status')).not.toHaveTextContent('secret output')
    rerender(<Terminal ref={ref} label="Agent" status="error" statusMessage="Refused" />)
    expect(screen.getByRole('status')).toHaveTextContent('Agent: Error. Refused')
  })

  it('keeps the terminal, and so the buffer, when the process exits', () => {
    const { rerender } = render(<Terminal label="Agent" status="live" />)
    rerender(<Terminal label="Agent" status="exited" exitCode={1} />)
    expect(h.terms).toHaveLength(1)
    expect(last().dispose).not.toHaveBeenCalled()
  })
})

describe('theme', () => {
  it('reads tokens, and updates the same terminal when data-theme changes', async () => {
    document.documentElement.style.setProperty('--color-surface-base', 'rgb(1, 2, 3)')
    document.documentElement.style.setProperty('--color-terminal-red', 'rgb(4, 5, 6)')
    render(<Terminal label="Agent" status="live" />)
    expect(last().options.theme).toMatchObject({ background: 'rgb(1, 2, 3)', red: 'rgb(4, 5, 6)' })

    document.documentElement.style.setProperty('--color-surface-base', 'rgb(9, 9, 9)')
    document.documentElement.setAttribute('data-theme', 'light')
    await act(async () => { await Promise.resolve() })
    expect(last().options.theme).toMatchObject({ background: 'rgb(9, 9, 9)' })
    expect(h.terms).toHaveLength(1)
    expect(last().dispose).not.toHaveBeenCalled()
  })

  it('does not blink the cursor under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    render(<Terminal label="Agent" status="live" />)
    expect(last().options.cursorBlink).toBe(false)
  })
})

it('has no axe violations', async () => {
  const { container } = render(<Terminal label="Agent" status="live" statusMessage="Attempt 2" />)
  expect(await axe.run(container)).toHaveNoViolations()
})
