import { useCallback } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import type { LinkRenderProps } from '../lib/render-link'

/** Halden Console's `renderLink`: client-side links for every organism that takes one. Its own,
 *  so the console shares no code with the other demos. */
export function consoleLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}

type SheetState = { sheetFromApp?: true }

/**
 * Opens the alert sheet by putting its id in the URL (`?alert=a-01`), so a sheet is linkable and
 * the browser's Back closes it. The entry is pushed and marked as pushed from inside the app, so
 * `useCloseAlert` knows it can go back rather than leave the console.
 */
export function useOpenAlert() {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(
    (id: string) => {
      const params = new URLSearchParams(location.search)
      params.set('alert', id)
      navigate({ pathname: location.pathname, search: `?${params}` }, { state: { sheetFromApp: true } satisfies SheetState })
    },
    [navigate, location.pathname, location.search],
  )
}

/** The href that opens an alert's sheet over the alerts page. */
export function alertHref(id: string): string {
  return `/console/alerts?alert=${id}`
}

/** Closes the alert sheet: Back when the app opened it, otherwise the same URL without `alert`
 *  (a sheet loaded directly from a shared link). */
export function useCloseAlert() {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    const state = location.state as SheetState | null
    if (state?.sheetFromApp) {
      navigate(-1)
      return
    }
    const params = new URLSearchParams(location.search)
    params.delete('alert')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [navigate, location.pathname, location.search, location.state])
}
