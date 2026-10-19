import { afterEach, describe, expect, it, vi } from 'vitest'
import { onCaughtError, type CaughtErrorInfo } from './onCaughtError'

const INFO: CaughtErrorInfo = {
  componentStack: '\n    at Boom\n    at DemoErrorBoundary',
  errorBoundary: { some: 'fiber-heavy instance', ref: {} },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('onCaughtError', () => {
  // Mutation: drop the `error.name === 'DemonstrationError'` check entirely -- the assertion
  // below finds `console.error` was called once instead of never, for the one throw this
  // suppression exists to keep out of e2e/fixtures.ts's console-log gate.
  it('stays silent for a DemonstrationError', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const demonstration = new Error('shown on purpose')
    demonstration.name = 'DemonstrationError'
    onCaughtError(demonstration, INFO)
    expect(error).not.toHaveBeenCalled()
  })

  // Mutation: check `error.message === 'DemonstrationError'` instead of `error.name` -- a real
  // bug whose message happens to read "DemonstrationError" would then also go silent, and this
  // assertion (a real bug, a different name) would still pass, but the one above (checking the
  // real DemonstrationError's own shape) is what actually distinguishes the two -- listed here so
  // both branches of the `error instanceof Error && error.name === …` check are exercised.
  it('logs a real Error whose name is not DemonstrationError', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    onCaughtError(new Error('a real bug'), INFO)
    expect(error).toHaveBeenCalledTimes(1)
  })

  // A thrown value is never guaranteed to be an Error (`throw 'a string'` is valid JS) -- the
  // `error instanceof Error` check must not itself throw on one, and must still log it.
  // Mutation: drop the `error instanceof Error` guard, reading `error.name` directly -- this
  // throws for a non-Error value instead of falling through to the log below.
  it('logs a thrown non-Error value without crashing on `.name`', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    onCaughtError('a thrown string, not an Error', INFO)
    expect(error).toHaveBeenCalledTimes(1)
  })

  // The bug this whole function exists to fix: `info.errorBoundary` is a React component
  // instance, not something a console-log capture (or a person reading e2e output) should have
  // to wade through on every real crash.
  // Mutation: revert to `console.error(error, info.componentStack, info.errorBoundary)` -- the
  // third argument in the call below is `info.errorBoundary` instead of `undefined`.
  it('logs the error and the component stack, never info.errorBoundary', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bug = new Error('a real bug')
    onCaughtError(bug, INFO)
    expect(error).toHaveBeenCalledWith(bug, INFO.componentStack)
    expect(error.mock.calls[0]).toHaveLength(2)
  })
})
