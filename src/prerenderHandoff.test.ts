import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareRoot } from './prerenderHandoff'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('prepareRoot', () => {
  it('leaves an empty #root alone', () => {
    document.body.innerHTML = '<div id="root"></div>'
    const root = prepareRoot()
    expect(root.style.cssText).toBe('')
    expect(document.body.children).toHaveLength(1)
  })

  it('keeps the snapshot on screen until React draws a heading, then removes it', async () => {
    document.body.innerHTML = '<div id="root"><main><h1>Tabs</h1></main></div>'
    const root = prepareRoot()
    const snapshot = root.previousElementSibling as HTMLElement
    expect(snapshot.textContent).toBe('Tabs')
    expect(snapshot).toHaveAttribute('aria-hidden', 'true')
    expect(snapshot).toHaveAttribute('inert')
    expect(root.childNodes).toHaveLength(0)
    expect(root.style.visibility).toBe('hidden')

    root.innerHTML = '<main><h1>Tabs</h1></main>'
    await new Promise((r) => setTimeout(r, 0))
    expect(snapshot.isConnected).toBe(false)
    expect(root.style.cssText).toBe('')
  })

  it('reveals the app after a timeout when no heading ever appears', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="root"><p>Checkout</p></div>'
    const root = prepareRoot()
    const snapshot = root.previousElementSibling as HTMLElement
    vi.advanceTimersByTime(4000)
    expect(snapshot.isConnected).toBe(false)
    expect(root.style.cssText).toBe('')
  })
})
