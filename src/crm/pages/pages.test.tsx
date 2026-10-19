import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { DEMO_NOTE } from '../CrmLayout'
import { seedData } from '../data'
import { renderCrm } from '../testing'
import { forecastRollup, hygiene, stageRollup } from './Forecast'

describe('Corvane shell', () => {
  it('names the product, the workspace and the signed-in rep, and says the data is a demo', async () => {
    renderCrm('/crm/accounts')
    await screen.findByRole('heading', { level: 1, name: 'Accounts' })
    const nav = screen.getAllByRole('navigation', { name: 'Corvane' })[0]
    expect(within(nav).getByRole('link', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByText('Halden Systems')).toBeInTheDocument()
    expect(within(nav).getByText('Maren Holt')).toBeInTheDocument()
    expect(screen.getByText(DEMO_NOTE)).toBeInTheDocument()
    expect(document.title).toBe('Corvane — accounts')
  })

  it('jumps to an account from the command palette', async () => {
    const user = userEvent.setup()
    renderCrm('/crm')
    await screen.findByRole('heading', { level: 1, name: 'Pipeline' })
    await user.click(screen.getByRole('button', { name: 'Search deals, accounts, contacts and pages' }))
    const field = await screen.findByRole('combobox', { name: 'Search deals, accounts, contacts and pages' })
    await user.type(field, 'Greyhaven')
    await user.click(screen.getByRole('option', { name: 'Greyhaven Cold Chain' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Greyhaven Cold Chain' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/crm/accounts/acc-greyhaven')
  })

  it('renders its own not-found for an unknown /crm path', async () => {
    renderCrm('/crm/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(document.title).toBe('Corvane — page not found')
  })
})

describe('Corvane accounts', () => {
  it('lists every account and filters by text and industry', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/accounts')
    await screen.findByRole('heading', { level: 1, name: 'Accounts' })
    expect(screen.getByText('18 accounts')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'Lyon')
    expect(screen.getByText('1 of 18 accounts match')).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox', { name: 'Search accounts' }))
    await user.click(screen.getByRole('combobox', { name: 'Industry' }))
    await user.click(await screen.findByRole('option', { name: 'Cold storage' }))
    expect(screen.getByText('3 of 18 accounts match')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Frostline Depots' })).toHaveAttribute('href', '/crm/accounts/acc-frostline')
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm/accounts')
    await screen.findByRole('heading', { level: 1, name: 'Accounts' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Corvane account detail', () => {
  it('shows the facts, the people, the deals (opening the sheet) and the activity by day', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/accounts/acc-vellmark')
    await screen.findByRole('heading', { level: 1, name: 'Vellmark Logistics' })
    expect(document.title).toBe('Corvane — Vellmark Logistics')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Accounts')
    expect(screen.getByRole('link', { name: 'Ines Marlow' })).toHaveAttribute('href', '/crm/contacts?contact=c-01')
    await user.click(screen.getByRole('tab', { name: /Deals/ }))
    await user.click(screen.getByRole('button', { name: 'Rotterdam hub rollout' }))
    expect(await screen.findByRole('dialog', { name: 'Rotterdam hub rollout' })).toBeInTheDocument()
  })

  it('groups the account activity by day', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/accounts/acc-vellmark')
    await screen.findByRole('heading', { level: 1, name: 'Vellmark Logistics' })
    await user.click(screen.getByRole('tab', { name: /Activity/ }))
    const timeline = screen.getByRole('list', { name: 'Activity with Vellmark Logistics' })
    expect(within(timeline).getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)
  })

  it('shows an in-shell not-found for an unknown id', async () => {
    renderCrm('/crm/accounts/acc-nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Account not found' })).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Corvane' }).length).toBeGreaterThan(0)
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm/accounts/acc-vellmark')
    await screen.findByRole('heading', { level: 1, name: 'Vellmark Logistics' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Corvane contacts', () => {
  it('opens a contact in a sheet from the row name, and logs a call there', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/contacts')
    await screen.findByRole('heading', { level: 1, name: 'Contacts' })
    expect(screen.getByText(/^45 contacts/)).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'Ines')
    await user.click(screen.getByRole('button', { name: 'Ines Marlow' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ines Marlow' })
    expect(screen.getByTestId('location')).toHaveTextContent('/crm/contacts?contact=c-01')
    await user.type(within(dialog).getByRole('textbox', { name: 'What was said' }), 'Pilot approved.')
    await user.click(within(dialog).getByRole('button', { name: 'Log call' }))
    expect(within(dialog).getByText('Pilot approved.')).toBeInTheDocument()
  })

  it('reassigns selected contacts in bulk', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/contacts')
    await screen.findByRole('heading', { level: 1, name: 'Contacts' })
    const table = screen.getByRole('table', { name: 'Contacts' })
    await user.click(within(table).getByRole('checkbox', { name: 'Select Ada Sorensen' }))
    await user.click(screen.getByRole('combobox', { name: 'Assign owner' }))
    await user.click(await screen.findByRole('option', { name: 'Jules Ferrand' }))
    expect(await screen.findByText('1 contact assigned to Jules Ferrand')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm/contacts')
    await screen.findByRole('heading', { level: 1, name: 'Contacts' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Corvane activity', () => {
  it('groups by Today, Yesterday, This week and Earlier, and filters by who', async () => {
    const user = userEvent.setup()
    renderCrm('/crm/activity')
    await screen.findByRole('heading', { level: 1, name: 'Activity' })
    const feed = screen.getByRole('list', { name: 'Team activity' })
    const groups = within(feed).getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    expect(groups).toEqual(expect.arrayContaining(['Today', 'Earlier']))
    const total = seedData().activities.length
    expect(screen.getByText(`${total} entries`)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Who' }))
    await user.click(await screen.findByRole('option', { name: 'Elias Brandt' }))
    expect(screen.getByText(new RegExp(`of ${total} entries match`))).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm/activity')
    await screen.findByRole('heading', { level: 1, name: 'Activity' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Corvane forecast', () => {
  it('rolls the quarter up by rep and counts the hygiene problems', () => {
    const { deals, activities } = seedData()
    const rollup = forecastRollup(deals)
    expect(rollup.reduce((sum, r) => sum + r.won, 0)).toBe(5_897_000)
    expect(hygiene(deals, activities)).toEqual({ slipped: 3, noNext: 5, stalled: 4 })
  })

  it('splits the open pipeline by stage, and the stages add up to the reps\' pipelines', () => {
    const { deals } = seedData()
    const stages = stageRollup(deals)
    expect(stages.map(s => s.stage)).toEqual(['qualified', 'discovery', 'proposal', 'negotiation'])
    const pipeline = forecastRollup(deals).reduce((sum, r) => sum + r.pipeline, 0)
    expect(stages.reduce((sum, s) => sum + s.value, 0)).toBe(pipeline)
    const commit = forecastRollup(deals).reduce((sum, r) => sum + r.commit, 0)
    expect(stages.find(s => s.stage === 'negotiation')!.weighted).toBe(commit)
  })

  it('names the goal track with a sentence, and is axe clean', async () => {
    const { container } = renderCrm('/crm/forecast')
    await screen.findByRole('heading', { level: 1, name: 'Forecast' })
    expect(screen.getByRole('img', { name: /% of the goal won and \d+% in commit, on day 15 of 92 of the quarter\.$/ })).toBeInTheDocument()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('shows the goal, the rollup table and links each hygiene count to the filtered pipeline', async () => {
    renderCrm('/crm/forecast')
    await screen.findByRole('heading', { level: 1, name: 'Forecast' })
    expect(screen.getByRole('table', { name: 'Forecast by rep' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Close date passed' })).toHaveAttribute('href', '/crm?view=table&slipped=1')
    expect(screen.getByRole('link', { name: 'No next step' })).toHaveAttribute('href', '/crm?view=table&nonext=1')
    expect(screen.getByRole('link', { name: 'Stalled' })).toHaveAttribute('href', '/crm?view=table&stalled=1')
  })
})

describe('Corvane about', () => {
  it('is listed in the nav, explains the demo and links to the case study', async () => {
    renderCrm('/crm/about')
    await screen.findByRole('heading', { level: 1, name: 'About this demo' })
    expect(document.title).toBe('Corvane — about')
    const nav = screen.getAllByRole('navigation', { name: 'Corvane' })[0]
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
    const link = screen.getByRole('link', { name: 'Division design system case study' })
    expect(link).toHaveAttribute('href', 'https://victor-ilioiu.vercel.app/work/division-ds')
    expect(link).not.toHaveAttribute('target')
    expect(screen.getByText('npm run verify')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderCrm('/crm/about')
    await screen.findByRole('heading', { level: 1, name: 'About this demo' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})