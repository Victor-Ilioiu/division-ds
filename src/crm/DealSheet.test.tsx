import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../test/axe'
import { renderCrm } from './testing'

async function sheet(name = 'Rotterdam hub rollout') {
  return screen.findByRole('dialog', { name })
}

describe('Corvane deal sheet', () => {
  it('opens from ?deal= over any page, with the stage path, probability, line items and activity', async () => {
    renderCrm('/crm/accounts?deal=d-01')
    const dialog = await sheet()
    expect(within(dialog).getByRole('link', { name: 'Vellmark Logistics' })).toHaveAttribute('href', '/crm/accounts/acc-vellmark')
    expect(within(dialog).getByRole('list', { name: 'Deal stage' })).toBeInTheDocument()
    expect(within(dialog).getByRole('progressbar', { name: 'Win probability' })).toHaveAttribute('aria-valuenow', '75')
    expect(within(dialog).getByText('€41,600', { selector: 'p' })).toBeInTheDocument()
    expect(within(dialog).getByRole('spinbutton', { name: 'Quantity of Halden Gateway' })).toHaveValue('6')
    expect(within(dialog).getByRole('list', { name: 'Activity on Rotterdam hub rollout' })).toBeInTheDocument()
    // The page behind it is still the accounts page.
    expect(await screen.findByRole('heading', { level: 1, name: 'Accounts', hidden: true })).toBeInTheDocument()
  })

  it('says so for an unknown deal id', async () => {
    renderCrm('/crm?deal=nope')
    expect(await sheet('Deal not found')).toHaveTextContent('No deal has the id “nope”')
  })

  it('changes a quantity and the total follows', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?deal=d-04')
    const dialog = await sheet('Leeds cross-dock sensors')
    await user.click(within(dialog).getByRole('button', { name: 'Increase Quantity of Sensor kit (12)' }))
    expect(within(dialog).getByText('Total').parentElement).toHaveTextContent('€9,790')
  })

  it('logs a note into the deal timeline, after an error on an empty one', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?deal=d-01')
    const dialog = await sheet()
    await user.click(within(dialog).getByRole('button', { name: 'Log note' }))
    expect(within(dialog).getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Note' }), 'Legal want a 30-day exit clause.')
    await user.click(within(dialog).getByRole('button', { name: 'Log note' }))
    const timeline = within(dialog).getByRole('list', { name: 'Activity on Rotterdam hub rollout' })
    expect(within(timeline).getByText('Legal want a 30-day exit clause.')).toBeInTheDocument()
    expect(await screen.findByText('Note logged')).toBeInTheDocument()
  })

  it('marks a deal lost with a reason chosen inline, never in a dialog on top', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?deal=d-02')
    const dialog = await sheet('Freezer aisle monitoring')
    await user.click(within(dialog).getByRole('button', { name: 'Mark lost' }))
    const form = within(dialog).getByRole('group', { name: 'Mark this deal lost' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(within(form).getByRole('button', { name: 'Confirm lost' }))
    expect(within(form).getByText('Choose why the deal was lost.')).toBeInTheDocument()
    await user.click(within(form).getByRole('combobox', { name: /Reason/ }))
    await user.click(await screen.findByRole('option', { name: 'Chose a competitor' }))
    await user.click(within(form).getByRole('button', { name: 'Confirm lost' }))
    expect(within(dialog).getByText('Reason: Chose a competitor')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Reopen' })).toHaveFocus()
    expect(await screen.findByText('Freezer aisle monitoring marked lost')).toBeInTheDocument()
  })

  it('marks a deal won, and Undo in the toast reopens it', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?deal=d-01')
    const dialog = await sheet()
    await user.click(within(dialog).getByRole('button', { name: 'Mark won' }))
    expect(within(dialog).getByRole('progressbar', { name: 'Win probability' })).toHaveAttribute('aria-valuenow', '100')
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(within(dialog).getByRole('progressbar', { name: 'Win probability' })).toHaveAttribute('aria-valuenow', '75')
  })

  it('ticks a task', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?deal=d-01')
    const dialog = await sheet()
    const task = within(dialog).getByRole('checkbox', { name: /Legal review of the MSA/ })
    await user.click(task)
    expect(task).toHaveAttribute('aria-checked', 'true')
  })

  it('closes, and the URL loses ?deal=', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?view=table&deal=d-01')
    const dialog = await sheet()
    await user.click(within(dialog).getByRole('button', { name: 'Close deal' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/crm\?view=table$/)
  })

  it('is axe clean', async () => {
    renderCrm('/crm?deal=d-01')
    const dialog = await sheet()
    expect(await axeClean(dialog)).toHaveNoViolations()
  })
})
