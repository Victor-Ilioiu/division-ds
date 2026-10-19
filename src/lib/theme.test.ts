import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredTheme, setTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.clear()
  })

  it('defaults to dark when nothing is stored', () => {
    expect(getStoredTheme()).toBe('dark')
  })

  it('setTheme writes data-theme on the root element', () => {
    setTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('setTheme persists so getStoredTheme reflects it afterwards', () => {
    setTheme('light')
    expect(getStoredTheme()).toBe('light')
  })
})
