import { useCallback } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import type { LinkRenderProps } from '../lib/render-link'

/** Corvane's `renderLink`: client-side links for every organism that takes one. Its own, not the
 *  Hexline store's, so the two demos never share code. */
export function crmLink({ href, ...rest }: LinkRenderProps) {
  return <RouterLink to={href} {...rest} />
}

type SheetState = { sheetFromApp?: true }

/**
 * Opens a detail sheet by putting its id in the URL (`?deal=d-01`, `?contact=c-04`), so a sheet is
 * linkable and the browser's Back closes it. The entry is pushed, and marked as pushed from inside
 * the app, so `useCloseSheet` knows it can go back rather than leave the app.
 */
export function useOpenSheet(param: 'deal' | 'contact') {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(
    (id: string) => {
      const params = new URLSearchParams(location.search)
      params.set(param, id)
      navigate({ pathname: location.pathname, search: `?${params}` }, { state: { sheetFromApp: true } satisfies SheetState })
    },
    [navigate, location.pathname, location.search, param],
  )
}

/** Closes the sheet named by `param`: Back when the app opened it, otherwise the same URL without
 *  the parameter (a sheet that was loaded directly from a shared link). */
export function useCloseSheet(param: 'deal' | 'contact') {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    const state = location.state as SheetState | null
    if (state?.sheetFromApp) {
      navigate(-1)
      return
    }
    const params = new URLSearchParams(location.search)
    params.delete(param)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [navigate, location.pathname, location.search, location.state, param])
}
