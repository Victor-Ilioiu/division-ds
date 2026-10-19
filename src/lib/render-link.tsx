import type { ReactNode } from 'react'

/** What an organism hands to its `renderLink` prop for each link it draws. */
export type LinkRenderProps = {
  href: string
  className: string
  children: ReactNode
  'aria-current'?: 'page'
  onClick?: () => void
}

/**
 * The default `renderLink`: a plain anchor. An app with a router passes its own link component
 * instead, mapping `href` to that component's prop, e.g. for React Router:
 * `renderLink={({ href, ...rest }) => <RouterLink to={href} {...rest} />}`. Whatever replaces the
 * anchor must still pass `className`, `aria-current` and `onClick` through to the rendered
 * element: the organism computes each one (the resting/current styling, the current-page state,
 * and, inside a menu sheet, the close-on-choose handler) and relies on it landing on the DOM node.
 */
export function renderAnchor(props: LinkRenderProps): ReactNode {
  return <a {...props} />
}
