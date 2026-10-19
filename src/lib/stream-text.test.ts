import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStreamedText } from './stream-text'

const TEXT = 'Depot 4 holds 1,240 replicas.'

describe('useStreamedText', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reveals the text a word at a time, then reports done', () => {
    const { result } = renderHook(() => useStreamedText(TEXT, { speed: 10 }))
    expect(result.current).toMatchObject({ text: '', streaming: true, done: false })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.text).toBe('Depot ')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.text).toBe('Depot 4 holds ')
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toMatchObject({ text: TEXT, streaming: false, done: true, stopped: false })
  })

  it('freezes where it is on stop', () => {
    const { result } = renderHook(() => useStreamedText(TEXT, { speed: 10 }))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current.stop())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toMatchObject({ text: 'Depot 4 ', streaming: false, done: true, stopped: true })
  })

  it('is empty while inactive, and starts over when made active', () => {
    const { result, rerender } = renderHook(({ active }) => useStreamedText(TEXT, { speed: 10, active }), {
      initialProps: { active: false },
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toMatchObject({ text: '', streaming: false, done: false })
    rerender({ active: true })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.text).toBe('Depot ')
  })

  it('shows the whole text at once under reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    const { result } = renderHook(() => useStreamedText(TEXT))
    expect(result.current).toMatchObject({ text: TEXT, streaming: false, done: true })
  })
})
