import type { AuthMode } from '../../../components/organisms/auth-form/AuthForm'

/**
 * Where each of AuthForm's own mode-switch links goes. One table, read by every auth page's
 * `onModeChange`, so a route can never drift from what AuthForm's SWITCHES actually offers --
 * adding a fifth mode there means adding it here too, in one place, rather than in four.
 */
export const AUTH_PATHS: Record<AuthMode, string> = {
  'sign-in': '/store/sign-in',
  'create-account': '/store/create-account',
  'reset-password': '/store/reset-password',
  'verify-code': '/store/sign-in/verify',
}

/**
 * The one place a return-to destination is trusted. `value` is router state a caller hands in
 * without having looked at it yet (RequireSession's own `from`, or a shape SignIn/Verify pass
 * along unchanged) -- unknown, not string, because state on a `Navigate`/`navigate` call is
 * untyped everywhere it's read in this app (see RouteNotice's own `noticeFrom`, the same shape).
 * Only a same-app path starting with `/store/` passes; anything else -- an absolute URL
 * (`https://…`), a protocol-relative one (`//host/…`, which a browser resolves against its own
 * scheme), a bare `/`, or nothing at all -- returns `undefined`, and every caller here falls back
 * to `/store/shop` rather than ever handing an unvalidated string to `navigate()`.
 */
export function safeReturnTo(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/store/') ? value : undefined
}

/** `from` out of a `Location.state` RequireSession or SignIn left behind -- the one field this
 *  return-to flow reads off it, validated by `safeReturnTo` before anything navigates there. */
export function returnToFrom(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  return safeReturnTo((state as Record<string, unknown>).from)
}
