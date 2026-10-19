import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { seedData } from '../data'
import { renderCrm } from '../testing'
import { pipelineStats } from './Pipeline'

async function heading() {
  return screen.findByRole('heading', { level: 1, name: 'Pipeline' })
}

describe('Corvane pipeline', () => {
  it('shows the four figures and the board by default, with a column per stage', async () => {
    renderCrm('/crm')
    await heading()
    const stats = pipelineStats(seedData().deals)
    expect(stats.winRate).toBe(60)
    expect(stats.closingThisMonth).toBe(5)
    expect(screen.getByText('Win rate, Q4 2026')).toBeInTheDocument()
    const board = screen.getByRole('region', { name: 'Pipeline board' })
    for (const stage of ['Qualified', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost']) {
      expect(within(board).getByRole('heading', { name: new RegExp(`^${stage}`) })).toBeInTheDocument()
    }
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
    expect(document.title).toBe('Corvane — pipeline')
  })

  it('filters by search text, by the stalled switch, and clears to an empty state', async () => {
    const user = userEvent.setup()
    renderCrm('/crm')
    await heading()
    await user.type(screen.getByRole('searchbox', { name: 'Search deals' }), 'Rotterdam')
    expect(screen.getByText('1 of 32 deals match')).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox', { name: 'Search deals' }))
    await user.click(screen.getByRole('switch', { name: 'Only stalled' }))
    expect(screen.getByText('4 of 32 deals match')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/crm?stalled=1')
    await user.type(screen.getByRole('searchbox', { name: 'Search deals' }), 'zzz')
    expect(screen.getByRole('heading', { name: 'No deals match' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('32 deals')).toBeInTheDocument()
  })

  it('starts on the table from ?view=table, sorted by close date, and syncs the view back to the URL', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?view=table')
    await heading()
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-selected', 'true')
    const table = screen.getByRole('table', { name: 'Deals' })
    expect(within(table).getAllByRole('rowheader')).toHaveLength(10)
    expect(screen.getByRole('navigation', { name: 'Pagination, deals' })).toHaveTextContent('1–10 of 32')
    await user.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/crm$/)
  })

  it('applies the hygiene filters from the URL as removable tags', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?view=table&slipped=1')
    await heading()
    expect(screen.getByText('3 of 32 deals match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Close date passed' }))
    expect(await screen.findByText('32 deals')).toBeInTheDocument()
  })

  it('assigns an owner to the selected deals in bulk, with Undo', async () => {
    const user = userEvent.setup()
    renderCrm('/crm?view=table&nonext=1')
    await heading()
    const table = screen.getByRole('table', { name: 'Deals' })
    await user.click(within(table).getByRole('checkbox', { name: 'Select Leeds cross-dock sensors' }))
    await user.click(within(table).getByRole('checkbox', { name: 'Select Paint shop probes' }))
    expect(screen.getByText(/2 deals selected/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Assign owner' }))
    await user.click(await screen.findByRole('option', { name: 'Elias Brandt' }))
    expect(await screen.findByText('2 deals assigned to Elias Brandt')).toBeInTheDocument()
    const row = within(table).getByRole('rowheader', { name: 'Leeds cross-dock sensors' }).closest('tr')!
    expect(row).toHaveTextContent('Elias Brandt')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(within(table).getByRole('rowheader', { name: 'Leeds cross-dock sensors' }).closest('tr')).toHaveTextContent('Maren Holt')
  })

  it('moves a deal with the card Move menu, logs it, and Undo puts it back', async () => {
    const user = userEvent.setup()
    renderCrm('/crm')
    await heading()
    await user.click(screen.getByRole('button', { name: 'Move Leeds cross-dock sensors' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Proposal' }))
    expect(await screen.findByText('Leeds cross-dock sensors moved to Proposal')).toBeInTheDocument()
    const proposal = screen.getByRole('list', { name: /^Proposal/ })
    expect(within(proposal).getByRole('button', { name: 'Leeds cross-dock sensors' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    const qualified = screen.getByRole('list', { name: /^Qualified/ })
    expect(within(qualified).getByRole('button', { name: 'Leeds cross-dock sensors' })).toBeInTheDocument()
  })

  it('Cancel on a fresh New deal dialog closes it without checking the name it blurs', async () => {
    const user = userEvent.setup()
    renderCrm('/crm')
    await heading()
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    const dialog = await screen.findByRole('dialog', { name: 'New deal' })
    within(dialog).getByRole('textbox', { name: /Deal name/ }).focus()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'New deal' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    const again = await screen.findByRole('dialog', { name: 'New deal' })
    expect(within(again).queryByText('Give the deal a name.')).not.toBeInTheDocument()
    expect(within(again).queryByRole('heading', { name: 'There is a problem' })).not.toBeInTheDocument()
  })

  it('creates a deal from the New deal dialog, after an error summary on an empty submit', async () => {
    const user = userEvent.setup()
    renderCrm('/crm')
    await heading()
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    const dialog = await screen.findByRole('dialog', { name: 'New deal' })
    await user.click(within(dialog).getByRole('button', { name: 'Create deal' }))
    expect(within(dialog).getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: /Deal name/ }), 'Tampere pilot')
    await user.click(within(dialog).getByRole('combobox', { name: /Account/ }))
    await user.click(await screen.findByRole('option', { name: 'Wexmoor Components' }))
    await user.click(within(dialog).getByRole('combobox', { name: /Main product/ }))
    await user.click(await screen.findByRole('option', { name: 'Halden Gateway' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create deal' }))
    expect(screen.queryByRole('dialog', { name: 'New deal' })).not.toBeInTheDocument()
    const qualified = screen.getByRole('list', { name: /^Qualified/ })
    expect(within(qualified).getByRole('button', { name: 'Tampere pilot' })).toBeInTheDocument()
    expect(screen.getByText('33 deals')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm')
    await heading()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
