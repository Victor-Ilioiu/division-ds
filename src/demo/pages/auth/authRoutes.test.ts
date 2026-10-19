import { describe, expect, it } from 'vitest'
import { returnToFrom, safeReturnTo } from './authRoutes'

describe('safeReturnTo', () => {
  // Mutation: drop the `.startsWith('/demo/')` check (accept any string) -> the absolute-URL and
  // protocol-relative cases below both return their input instead of undefined, an open redirect
  // out of the app through a value that started life as router state, not a URL bar.
  it('accepts only a same-app path under /demo/', () => {
    expect(safeReturnTo('/demo/account/orders')).toBe('/demo/account/orders')
    expect(safeReturnTo('/demo/account?tab=orders')).toBe('/demo/account?tab=orders')
  })

  it('rejects an absolute URL, a protocol-relative one, a bare path and non-strings', () => {
    expect(safeReturnTo('https://evil.example/demo/')).toBeUndefined()
    expect(safeReturnTo('//evil.example/demo/')).toBeUndefined()
    expect(safeReturnTo('/')).toBeUndefined()
    expect(safeReturnTo('/shop')).toBeUndefined()
    expect(safeReturnTo(undefined)).toBeUndefined()
    expect(safeReturnTo(null)).toBeUndefined()
    expect(safeReturnTo(42)).toBeUndefined()
  })
})

describe('returnToFrom', () => {
  // Mutation: read `state.from` without the `typeof state !== 'object'` guard -> this throws
  // (`Cannot convert undefined or null to object`) instead of returning undefined.
  it('reads a validated `from` off router state, and nothing off state that has none', () => {
    expect(returnToFrom({ from: '/demo/account/orders' })).toBe('/demo/account/orders')
    expect(returnToFrom({ from: 'https://evil.example' })).toBeUndefined()
    expect(returnToFrom({ notice: 'Sign in to see your account.' })).toBeUndefined()
    expect(returnToFrom(null)).toBeUndefined()
    expect(returnToFrom(undefined)).toBeUndefined()
  })
})
