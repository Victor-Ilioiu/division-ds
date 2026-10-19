import { describe, it, expect, vi, afterEach } from 'vitest'
import { readJson, writeJson } from './storage'

const isString = (v: unknown): v is string => typeof v === 'string'
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('readJson', () => {
  it('round-trips a value written with writeJson', () => {
    writeJson('probe', { a: 1 })
    expect(readJson('probe', null, isRecord)).toEqual({ a: 1 })
  })

  it('returns the fallback when the key is absent', () => {
    expect(readJson('missing', 'fallback', isString)).toBe('fallback')
  })

  it('returns the fallback when the stored value will not parse', () => {
    sessionStorage.setItem('bad', 'not json')
    expect(readJson('bad', 'fallback', isString)).toBe('fallback')
  })

  it('returns the fallback when sessionStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readJson('probe', 'fallback', isString)).toBe('fallback')
  })

  it('returns the fallback when the parsed value fails the validator', () => {
    writeJson('probe', { a: 1 })
    expect(readJson('probe', 'fallback', isString)).toBe('fallback')
  })

  it('does not fall back to an invalid value just because it parses', () => {
    sessionStorage.setItem('probe', JSON.stringify(['not', 'a', 'record']))
    expect(readJson('probe', { a: 0 }, isRecord)).toEqual({ a: 0 })
  })
})

describe('writeJson', () => {
  it('does not throw when sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeJson('probe', { a: 1 })).not.toThrow()
  })
})
