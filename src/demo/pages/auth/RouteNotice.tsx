import { useLocation } from 'react-router-dom'
import { Alert } from '../../../components/molecules'

function noticeFrom(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  const value = (state as Record<string, unknown>).notice
  return typeof value === 'string' ? value : undefined
}

/**
 * A one-line notice a redirect left in router state -- a verify page bounced back to sign-in
 * with nothing pending, say -- shown above the form it lands on. Static content, read in order
 * on load rather than announced as a change, so it takes no live role (SignIn, CreateAccount, Cart
 * and Shop all read the same shape, rather than each rolling its own bounce message).
 */
export function RouteNotice() {
  const location = useLocation()
  const notice = noticeFrom(location.state)
  if (!notice) return null
  return <Alert tone="info" title={notice} />
}
