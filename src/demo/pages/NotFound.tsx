import { Link as RouterLink, useLocation } from 'react-router-dom'
import { linkVariants } from '../../components/atoms'
import { ErrorState } from '../states/ErrorState'

/**
 * The demo shell's own /store/* fallthrough (see App.tsx's route table). The outer app's
 * catch-all is a separate page, DocsNotFound.tsx, styled to match the docs shell instead -- this
 * one reuses `ErrorState` so a bad link inside /store lands on something styled like the rest of
 * this shell, rather than a bare, unstyled heading.
 */
export function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="px-gutter py-16">
      <ErrorState title="Page not found" headingLevel={1}>
        Nothing lives at <code className="break-all">{pathname}</code>.
      </ErrorState>
      <p className="text-center">
        <RouterLink to="/store" className={linkVariants()}>
          Back to the Hexline home
        </RouterLink>
      </p>
      <p className="text-center">
        <RouterLink to="/components" className={linkVariants()}>
          Open the design system docs
        </RouterLink>
      </p>
    </div>
  )
}
