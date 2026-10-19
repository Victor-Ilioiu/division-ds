import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, 'c')).toBe('a c')
  })

  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('resolves conflicts between arbitrary-value classes too', () => {
    expect(cn('bg-[var(--a)]', 'bg-[var(--b)]')).toBe('bg-[var(--b)]')
  })
})
