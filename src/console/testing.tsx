import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render } from '@testing-library/react'
import { ConsoleLayout } from './ConsoleLayout'
import { CONSOLE_PAGES, ConsoleNotFound } from './routes'

/** The current URL, printed into the DOM so a test can read where the app went. */
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

/** Renders the console at `path` the way App.tsx mounts it: the shell, every page, its own 404.
 *  Paused unless `live` is set, so no interval runs under a test that did not ask for one. */
export function renderConsole(path = '/console', { live = false }: { live?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ConsoleLayout live={live} />}>
          {CONSOLE_PAGES.map(({ path: pattern, Component }) => (
            <Route key={pattern} path={pattern} element={<Component />} />
          ))}
          <Route path="/console/*" element={<ConsoleNotFound />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}
