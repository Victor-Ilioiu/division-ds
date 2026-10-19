import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { assignRef, useMergedRefs } from './refs'

describe('assignRef', () => {
  it('writes an object ref and calls a callback ref', () => {
    const object = createRef<HTMLDivElement>()
    const callback = vi.fn()
    const node = document.createElement('div')
    assignRef(object, node)
    assignRef(callback, node)
    expect(object.current).toBe(node)
    expect(callback).toHaveBeenCalledWith(node)
  })

  it('ignores a missing ref', () => {
    expect(() => assignRef(undefined, document.createElement('div'))).not.toThrow()
  })
})

describe('useMergedRefs', () => {
  it('feeds one node to every ref it merges, and null on unmount', () => {
    const object = createRef<HTMLButtonElement>()
    const callback = vi.fn()
    function Probe() {
      const ref = useMergedRefs(object, callback)
      return <button ref={ref}>Probe</button>
    }
    const { unmount } = render(<Probe />)
    const button = screen.getByRole('button')
    expect(object.current).toBe(button)
    expect(callback).toHaveBeenLastCalledWith(button)
    unmount()
    expect(object.current).toBeNull()
    expect(callback).toHaveBeenLastCalledWith(null)
  })

  it('keeps one identity while its refs do, so React does not reattach it every render', () => {
    const object = createRef<HTMLElement>()
    const { result, rerender } = renderHook(({ target }) => useMergedRefs(target), {
      initialProps: { target: object },
    })
    const first = result.current
    rerender({ target: object })
    expect(result.current).toBe(first)
    rerender({ target: createRef<HTMLElement>() })
    expect(result.current).not.toBe(first)
  })

  it("runs a callback ref's own returned cleanup on unmount, instead of calling it with null", () => {
    const cleanup = vi.fn()
    const callback = vi.fn(() => cleanup)
    function Probe() {
      const ref = useMergedRefs(callback)
      return <button ref={ref}>Probe</button>
    }
    const { unmount } = render(<Probe />)
    expect(cleanup).not.toHaveBeenCalled()
    unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(callback).not.toHaveBeenCalledWith(null)
  })

  it('does not detach and reattach a stable callback ref on re-render', () => {
    const callback = vi.fn()
    function Probe({ label }: { label: string }) {
      const ref = useMergedRefs(callback)
      return <button ref={ref}>{label}</button>
    }
    const { rerender } = render(<Probe label="one" />)
    rerender(<Probe label="two" />)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
