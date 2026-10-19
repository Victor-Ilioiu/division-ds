import { Link as RouterLink } from 'react-router-dom'
import type { LinkRenderProps } from '../lib/render-link'

/**
 * The demo shell's one `renderLink`: every organism that takes one (Navbar, Footer, Cart,
 * Breadcrumbs, ProductCard) gets the same client-side link instead of a full page load. Shared
 * rather than redefined per caller, so `DemoLayout` and `CartSheet` can never drift onto two
 * different link components.
 */
export function routerLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}
