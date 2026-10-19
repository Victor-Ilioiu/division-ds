import type { ReactNode } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { SessionProvider, useSession } from './session'

const STORAGE_KEY = 'hexline-session'

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

function renderSession() {
  return renderHook(() => useSession(), { wrapper })
}

afterEach(() => {
  sessionStorage.clear()
})

describe('useSession', () => {
  it('starts signed out with no pending email', () => {
    const { result } = renderSession()
    expect(result.current.user).toBeNull()
    expect(result.current.pendingEmail).toBeNull()
  })

  it('signInAs sets the user and clears pendingEmail in the same update', () => {
    const { result } = renderSession()
    act(() => result.current.setPendingEmail('rae@hexline.test'))
    expect(result.current.pendingEmail).toBe('rae@hexline.test')
    act(() => result.current.signInAs({ name: 'Rae', email: 'rae@hexline.test' }))
    expect(result.current.user).toEqual({ name: 'Rae', email: 'rae@hexline.test' })
    expect(result.current.pendingEmail).toBeNull()
  })

  it('signOut clears the user', () => {
    const { result } = renderSession()
    act(() => result.current.signInAs({ name: 'Rae', email: 'rae@hexline.test' }))
    act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
  })

  it('round-trips through storage: a fresh provider picks up what an earlier one wrote, including a pending email set on its own', () => {
    const first = renderSession()
    act(() => first.result.current.signInAs({ name: 'Rae', email: 'rae@hexline.test' }))
    act(() => first.result.current.setPendingEmail('someone@hexline.test'))
    first.unmount()

    const second = renderSession()
    expect(second.result.current.user).toEqual({ name: 'Rae', email: 'rae@hexline.test' })
    expect(second.result.current.pendingEmail).toBe('someone@hexline.test')
  })

  it.each([
    ['null', 'null'],
    ['an object with a malformed user', '{"user":"x"}'],
  ])('renders signed out (the fallback) when storage holds %s', (_label, raw) => {
    sessionStorage.setItem(STORAGE_KEY, raw)
    const { result } = renderSession()
    expect(result.current.user).toBeNull()
    expect(result.current.pendingEmail).toBeNull()
  })

  it('updateName renames the signed-in user, keeping their email', () => {
    const { result } = renderSession()
    act(() => result.current.signInAs({ name: 'Rae', email: 'rae@hexline.test' }))
    act(() => result.current.updateName('Rae Fielding'))
    expect(result.current.user).toEqual({ name: 'Rae Fielding', email: 'rae@hexline.test' })
  })

  it('updateName does nothing with no one signed in', () => {
    const { result } = renderSession()
    act(() => result.current.updateName('Nobody'))
    expect(result.current.user).toBeNull()
  })

  it('keeps a stable signOut identity across a re-render', () => {
    const { result, rerender } = renderSession()
    const firstSignOut = result.current.signOut
    rerender()
    expect(result.current.signOut).toBe(firstSignOut)
  })
})
