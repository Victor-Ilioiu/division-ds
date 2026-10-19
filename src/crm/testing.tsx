import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render } from '@testing-library/react'
import { CrmLayout } from './CrmLayout'
import { CRM_PAGES, CrmNotFound } from './routes'

/** The current URL, printed into the DOM so a test can read where the app went. */
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

/** Renders Corvane at `path` the way App.tsx mounts it: the shell, every page, its own 404. Test-only. */
export function renderCrm(path = '/crm') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<CrmLayout />}>
          {CRM_PAGES.map(({ path: pattern, Component }) => (
            <Route key={pattern} path={pattern} element={<Component />} />
          ))}
          <Route path="/crm/*" element={<CrmNotFound />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}
