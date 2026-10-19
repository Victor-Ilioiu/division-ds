/** `RootOptions['onCaughtError']`'s own second-argument type (`@types/react-dom/client.d.ts`) --
 *  an inline anonymous type there, never `ErrorInfo` from `'react'` (that one has no
 *  `errorBoundary` field at all, and is the type `onRecoverableError` and `componentDidCatch`
 *  use instead). Named here so this module, and its test, can spell it once. */
export type CaughtErrorInfo = {
  componentStack?: string
  errorBoundary?: unknown
}

/**
 * React's own default (`defaultOnCaughtError`) routes every error a boundary catches through
 * console.error, which would fail e2e/fixtures.ts's fixture (it fails any test where
 * console.error fires) the moment DemoErrorBoundary is exercised on purpose, from
 * /demo/status/error's "Show the full-page error" button. `DemonstrationError` is that one
 * intentional throw's own name (see StatusError.tsx). `DemoErrorBoundary`'s own
 * `componentDidCatch` already logs every caught error (including this one) through
 * console.warn -- this stays silent for a `DemonstrationError` specifically, rather than also
 * logging it, so the demonstration crash produces exactly one console message, not two. Any
 * other error a boundary catches (a real bug, not a demonstration) still gets this one too,
 * which is what actually fails the fixture on a real bug.
 *
 * Logs `error` and `info.componentStack` only, never `info.errorBoundary`: that third argument
 * is a React component instance (refs, internal fiber state), and dumping it turns one crash
 * into a wall of object noise in e2e's own console-log capture, on top of what the component
 * stack already names.
 *
 * Its own module, apart from `main.tsx`: `main.tsx` calls `createRoot(...).render(...)` as an
 * import-time side effect (it needs a real `#root` element in the document), which would make
 * this function untestable in isolation if it lived there -- importing it here to test never
 * mounts the app.
 */
export function onCaughtError(error: unknown, info: CaughtErrorInfo) {
  if (error instanceof Error && error.name === 'DemonstrationError') return
  console.error(error, info.componentStack)
}
