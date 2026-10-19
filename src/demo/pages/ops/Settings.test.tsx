import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '../../../components/atoms/tooltip/Tooltip'
import { Toaster } from '../../../components/molecules/toast/Toast'
import { axeClean } from '../../../test/axe'
import { setOpsLatency, STORE_HANDLE, TEAM } from './data'
import { Settings } from './Settings'

function renderSettings(path = '/demo/ops/settings') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Toaster>
          <Routes>
            <Route path="/demo/ops/settings" element={<Settings />} />
          </Routes>
        </Toaster>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => setOpsLatency(0))
afterEach(() => setOpsLatency(600))

describe('Ops settings', () => {
  // jsdom has no matchMedia, so the page takes its wide layout: tabs down the side.
  it('opens on the store profile, with vertical tabs', () => {
    renderSettings()
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    const tabs = screen.getByRole('tablist', { name: 'Settings sections' })
    expect(tabs).toHaveAttribute('aria-orientation', 'vertical')
    expect(within(tabs).getAllByRole('tab')).toHaveLength(5)
    expect(screen.getByRole('tab', { name: 'Store profile' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Store profile' })).toBeInTheDocument()
  })

  // Mutation: drop the `attempt` bump in StoreProfile's submit -> the summary never renders.
  it('stops a save with an empty name and says why, then saves once it is fixed', async () => {
    const user = userEvent.setup()
    renderSettings()
    const name = screen.getByRole('textbox', { name: /Store name/ })
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    const summary = screen.getByRole('heading', { name: 'There is a problem' })
    expect(summary).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    await user.type(name, 'Hexline Brasov')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Store profile saved')).toBeInTheDocument()
  })

  it('switches sections with the arrow keys and saves a notification as it flips', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole('tab', { name: 'Store profile' }))
    await user.keyboard('{ArrowDown}')
    // Radix's roving focus moves focus on a timeout, and activation follows the focus.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('aria-selected', 'true'),
    )
    const digest = screen.getByRole('switch', { name: 'Weekly digest' })
    expect(digest).not.toBeChecked()
    await user.click(digest)
    expect(digest).toBeChecked()
    expect(screen.getByText('Weekly digest turned on. Saved.')).toBeInTheDocument()
  })

  it('opens the section named in the URL, and gives each member a named role control', async () => {
    const user = userEvent.setup()
    renderSettings('/demo/ops/settings?tab=team')
    expect(screen.getByRole('tab', { name: 'Team' })).toHaveAttribute('aria-selected', 'true')
    const list = screen.getByRole('list', { name: 'Team members' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(TEAM.length)
    expect(within(list).getByText('Owner')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Role for Tomas Reyes' }))
    await user.click(await screen.findByRole('option', { name: 'Support' }))
    expect(await screen.findByText('Tomas Reyes is now support')).toBeInTheDocument()
  })

  it('signs out of one session', async () => {
    const user = userEvent.setup()
    renderSettings('/demo/ops/settings?tab=sessions')
    await user.click(screen.getByRole('button', { name: 'Sign out of Safari on iPhone' }))
    expect(await screen.findByText('Signed out of Safari on iPhone')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out of Safari on iPhone' })).toBeNull()
  })

  // Mutation: drop `disabled={!matches}` from the dialog's action -> the first assertion fails.
  it('closes the store only once its handle is typed', async () => {
    const user = userEvent.setup()
    renderSettings('/demo/ops/settings?tab=danger')
    await user.click(screen.getByRole('button', { name: 'Close store' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Close the Hexline store?',
    })
    const action = within(dialog).getByRole('button', { name: 'Close store' })
    expect(action).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox', { name: 'Store handle' }), STORE_HANDLE)
    expect(action).toBeEnabled()
    await user.click(action)
    expect(await screen.findByText('Store closed')).toBeInTheDocument()
    expect(screen.getByText('The store is closed')).toBeInTheDocument()
  })

  it('is axe clean on every section', async () => {
    const user = userEvent.setup()
    const { container } = renderSettings()
    for (const tab of ['Store profile', 'Notifications', 'Team', 'Sessions', 'Danger zone']) {
      await user.click(screen.getByRole('tab', { name: tab }))
      expect(await axeClean(container)).toHaveNoViolations()
    }
  })
})
