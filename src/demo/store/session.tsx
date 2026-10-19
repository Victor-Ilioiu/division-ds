import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readJson, writeJson } from './storage'

const STORAGE_KEY = 'hexline-session'

type User = { name: string; email: string }

type SessionState = { user: User | null; pendingEmail: string | null }

const EMPTY_STATE: SessionState = { user: null, pendingEmail: null }

type SessionContextValue = {
  user: User | null
  pendingEmail: string | null
  setPendingEmail(email: string | null): void
  signInAs(user: User): void
  signOut(): void
  /** Renames the signed-in user in place, keeping their email. A no-op with no one signed in --
   *  Settings only ever calls this after `saveProfile` resolves, itself gated on `user` already
   *  being set, but the guard stays here too so this function makes the same promise on its own
   *  terms rather than only through a caller that happens to check first. */
  updateName(name: string): void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.name === 'string' && typeof v.email === 'string'
}

/** Guards `sessionStorage`'s own JSON before it reaches `useState`'s initialiser -- see
 *  `isCartItems` in `cart.tsx` for why this can't be skipped. */
export function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (v.user === null || isUser(v.user)) && (v.pendingEmail === null || typeof v.pendingEmail === 'string')
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => readJson<SessionState>(STORAGE_KEY, EMPTY_STATE, isSessionState))

  useEffect(() => {
    writeJson(STORAGE_KEY, state)
  }, [state])

  const setPendingEmail: SessionContextValue['setPendingEmail'] = useCallback(email => {
    setState(prev => ({ ...prev, pendingEmail: email }))
  }, [])

  // One state update, not two: a reader in between (a render, a storage write) must never see a
  // signed-in user next to the email they were still verifying.
  const signInAs: SessionContextValue['signInAs'] = useCallback(user => {
    setState({ user, pendingEmail: null })
  }, [])

  const signOut: SessionContextValue['signOut'] = useCallback(() => {
    setState({ user: null, pendingEmail: null })
  }, [])

  const updateName: SessionContextValue['updateName'] = useCallback(name => {
    setState(prev => (prev.user ? { ...prev, user: { ...prev.user, name } } : prev))
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({ user: state.user, pendingEmail: state.pendingEmail, setPendingEmail, signInAs, signOut, updateName }),
    [state.user, state.pendingEmail, setPendingEmail, signInAs, signOut, updateName]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within a SessionProvider')
  return value
}
