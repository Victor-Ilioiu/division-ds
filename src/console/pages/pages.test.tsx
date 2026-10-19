import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axeClean } from '../../test/axe'
import { HONEST_REPLY, SUGGESTIONS } from '../assistant'
import { DEMO_NOTE } from '../ConsoleLayout'
import { renderConsole } from '../testing'
import { SITES } from '../data'
import { triageOrder } from './ConsoleOverview'

describe('Halden Console shell', () => {
  it('names the product and the operator, marks the current page, and says the data is a demo', async () => {
    renderConsole('/console/sites')
    await screen.findByRole('heading', { level: 1, name: 'Sites' })
    const nav = screen.getAllByRole('navigation', { name: 'Halden Console' })[0]
    expect(within(nav).getByRole('link', { name: /^Sites/ })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByText('Noor Aziz')).toBeInTheDocument()
    expect(screen.getByText(DEMO_NOTE)).toBeInTheDocument()
    expect(document.title).toBe('Halden Console — sites')
  })

  it('renders its own not-found for an unknown /console path', async () => {
    renderConsole('/console/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(document.title).toBe('Halden Console — page not found')
  })

  it('jumps to a site from the command palette', async () => {
    const user = userEvent.setup()
    renderConsole('/console')
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    await user.click(screen.getByRole('button', { name: 'Search sites, alerts and pages' }))
    const field = await screen.findByRole('combobox', { name: 'Search sites, alerts and pages' })
    await user.type(field, 'Gdańsk')
    await user.click(screen.getByRole('option', { name: 'Greyhaven Cold Chain, Gdańsk' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Greyhaven Cold Chain, Gdańsk' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/console/sites/greyhaven')
  })
})

describe('Halden Console overview', () => {
  it('shows the readouts, the open alerts newest first, and a card per site', async () => {
    renderConsole('/console')
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    expect(document.title).toBe('Halden Console — overview')
    const now = screen.getByRole('region', { name: 'Now' })
    expect(within(now).getByText('Sites online').nextSibling).toHaveTextContent('7of 8')
    expect(within(now).getByText('2 critical')).toBeInTheDocument()
    const attention = screen.getByRole('region', { name: 'Needs attention' })
    const items = within(attention).getAllByRole('button')
    expect(items[0]).toHaveTextContent('Dock door 1 open 18 min')
    expect(items[1]).toHaveTextContent('Freezer aisle B above -18 °C')
    expect(screen.getAllByRole('img', { name: /last 6 hours/ }).length).toBeGreaterThanOrEqual(8)
  })

  it('orders the sites for triage: offline and in alarm first, the seed order kept among equals', () => {
    const renderOrder = triageOrder(SITES, [])
    // With no alerts, only the offline site is hostile; everything else keeps the seed order.
    expect(renderOrder[0].site.id).toBe('ostwind')
    expect(renderOrder.slice(1).map(r => r.site.id)).toEqual(SITES.filter(s => s.id !== 'ostwind').map(s => s.id))
  })

  it('reads the fleet matrix and the severity bar as sentences', async () => {
    renderConsole('/console')
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    const fleet = screen.getByRole('list', { name: 'Sensors by site' })
    expect(within(fleet).getByText('Ostwind Fulfilment, Leipzig: Offline, 0 of 7 sensors reporting.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Open alerts by severity: 2 critical, 4 warning, 1 info.' })).toBeInTheDocument()
  })

  it('opens an alert in a sheet from the list', async () => {
    const user = userEvent.setup()
    renderConsole('/console')
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    await user.click(screen.getByRole('button', { name: 'Cold room 2 above 8 °C' }))
    expect(await screen.findByRole('dialog', { name: 'Cold room 2 above 8 °C' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/console?alert=a-01')
  })

  it('is axe clean', async () => {
    const { container } = renderConsole('/console')
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Halden Console alert sheet', () => {
  it('opens from ?alert=, acknowledges with a note, and Undo puts it back', async () => {
    const user = userEvent.setup()
    renderConsole('/console/alerts?alert=a-01')
    const sheet = await screen.findByRole('dialog', { name: 'Cold room 2 above 8 °C' })
    expect(within(sheet).getByRole('img', { name: /Cold room 2, .*°C/ })).toBeInTheDocument()
    expect(within(sheet).getByRole('list', { name: 'History of Cold room 2 above 8 °C' })).toBeInTheDocument()
    await user.type(within(sheet).getByRole('textbox', { name: /Note/ }), 'Calling the site.')
    await user.click(within(sheet).getByRole('button', { name: 'Acknowledge' }))
    expect(within(sheet).getByText(/^Acknowledged by Noor Aziz, Today/)).toHaveFocus()
    expect(within(sheet).getByText('Calling the site.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(within(sheet).getByText('Open: nobody has acknowledged it yet.')).toBeInTheDocument()
  })

  it('says so for an unknown id', async () => {
    renderConsole('/console/alerts?alert=nope')
    expect(await screen.findByRole('dialog', { name: 'Alert not found' })).toBeInTheDocument()
  })
})

describe('Halden Console alerts', () => {
  it('filters by status and severity, and acknowledges the selected alerts in bulk', async () => {
    const user = userEvent.setup()
    renderConsole('/console/alerts')
    await screen.findByRole('heading', { level: 1, name: 'Alerts' })
    expect(document.title).toBe('Halden Console — alerts')
    expect(screen.getByText('7 open alerts')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Alerts, open' })
    await user.click(within(table).getByRole('checkbox', { name: 'Select Gateway not reporting, Ostwind Fulfilment, Leipzig' }))
    await user.click(within(table).getByRole('checkbox', { name: 'Select Cold room 1 above 8 °C, Greyhaven Cold Chain, Gdańsk' }))
    await user.click(screen.getByRole('button', { name: 'Acknowledge 2 alerts' }))
    expect(await screen.findByText('2 alerts acknowledged')).toBeInTheDocument()
    expect(screen.getByText('5 open alerts')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Acknowledged' }))
    expect(screen.getByText('8 acknowledged alerts')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/console/alerts?status=acknowledged')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('6 acknowledged alerts')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderConsole('/console/alerts')
    await screen.findByRole('heading', { level: 1, name: 'Alerts' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('Halden Console site detail', () => {
  it('shows the facts, the sensors with sparklines, and the site alerts opening their sheet', async () => {
    const user = userEvent.setup()
    renderConsole('/console/sites/brennick')
    await screen.findByRole('heading', { level: 1, name: 'Brennick Pharma, Basel' })
    expect(document.title).toBe('Halden Console — Brennick Pharma, Basel')
    expect(screen.getByText('Mara Lindqvist, site manager')).toBeInTheDocument()
    const sensors = screen.getByRole('table', { name: 'Sensors at Brennick Pharma, Basel' })
    expect(within(sensors).getAllByRole('row')).toHaveLength(8)
    expect(within(sensors).getByRole('img', { name: /^Cold room 2, last 24 hours/ })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Chart range' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '7 d' }))
    expect(screen.getByTestId('location')).toHaveTextContent('range=7d')
    const timeline = screen.getByRole('list', { name: 'Alerts at Brennick Pharma, Basel' })
    await user.click(within(timeline).getByRole('button', { name: 'Cold room 2 above 8 °C' }))
    expect(await screen.findByRole('dialog', { name: 'Cold room 2 above 8 °C' })).toBeInTheDocument()
  })

  it('warns that an offline site has stopped reporting', async () => {
    renderConsole('/console/sites/ostwind')
    await screen.findByRole('heading', { level: 1, name: 'Ostwind Fulfilment, Leipzig' })
    expect(screen.getByText(/GW-LEJ-02 has sent nothing since 09:12/)).toBeInTheDocument()
  })

  it('shows an in-shell not-found for an unknown id', async () => {
    renderConsole('/console/sites/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Site not found' })).toBeInTheDocument()
    expect(document.title).toBe('Halden Console — site not found')
  })

  it('is axe clean', async () => {
    const { container } = renderConsole('/console/sites/brennick')
    await screen.findByRole('heading', { level: 1, name: 'Brennick Pharma, Basel' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

/** Moves the fake clock on in small steps, each in its own act, so every effect a step schedules
 *  (the store's next tick, the assistant's next step) is in place before the clock passes it. */
async function advance(ms: number, step = 50) {
  for (let t = 0; t < ms; t += step) {
    await act(async () => {
      vi.advanceTimersByTime(step)
    })
  }
}

describe('Halden Console, timed', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks every five seconds while live, and stops when paused', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderConsole('/console', { live: true })
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    const clock = screen.getByTestId('console-clock')
    expect(clock).toHaveTextContent('10:00:00')
    await advance(5000, 1000)
    expect(clock).toHaveTextContent('10:00:05')
    await user.click(screen.getByRole('radio', { name: 'Paused' }))
    await advance(20_000, 1000)
    expect(clock).toHaveTextContent('10:00:05')
  })

  it('announces a new live alert once, in a polite status', async () => {
    renderConsole('/console', { live: true })
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    await advance(30_000, 1000)
    expect(screen.getByText('New warning alert: Cold room 2 above 8 °C, Saltmere Foods, Aarhus.')).toHaveAttribute('role', 'status')
  })

  it('runs the investigation from a suggestion through Approve, acknowledging the alert', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderConsole('/console/assistant')
    await screen.findByRole('heading', { level: 1, name: 'Assistant' })
    expect(document.title).toBe('Halden Console — assistant')
    expect(screen.getByText('Scripted demo: no model is called.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: SUGGESTIONS[0] }))
    await advance(20_000)
    const approval = await screen.findByRole('region', { name: 'Acknowledge the alert and email Mara Lindqvist?' })
    expect(screen.getByRole('textbox', { name: 'Message the assistant' })).toBeDisabled()
    await user.click(within(approval).getByRole('button', { name: 'Approve and send' }))
    await advance(10_000)
    expect(await screen.findByText(/^Done\. The email is sent/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'The Cold room 2 alert' }))
    const sheet = await screen.findByRole('dialog', { name: 'Cold room 2 above 8 °C' })
    expect(within(sheet).getByText(/^Acknowledged by Noor Aziz, via the assistant, Today/)).toBeInTheDocument()
  })

  it('stops mid-reply, and Retry carries on', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderConsole('/console/assistant')
    await screen.findByRole('heading', { level: 1, name: 'Assistant' })
    const box = screen.getByRole('textbox', { name: 'Message the assistant' })
    await user.type(box, `${SUGGESTIONS[1]}{Enter}`)
    expect(box).toHaveFocus()
    await advance(250)
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('log', { name: 'Conversation with the assistant' })).toHaveTextContent('Stopped')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await advance(10_000)
    expect((await screen.findAllByText(/had the most/)).length).toBeGreaterThan(0)
    expect(screen.getByText('count_alerts')).toBeInTheDocument()
  })

  it('answers a free-typed prompt honestly', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderConsole('/console/assistant')
    await screen.findByRole('heading', { level: 1, name: 'Assistant' })
    await user.type(screen.getByRole('textbox', { name: 'Message the assistant' }), 'Is Basel cold today?{Enter}')
    await advance(5000, 1000)
    expect(await screen.findByText(HONEST_REPLY)).toBeInTheDocument()
  })
})

describe('Halden Console about', () => {
  it('is listed in the nav, explains the demo and links to the case study', async () => {
    renderConsole('/console/about')
    await screen.findByRole('heading', { level: 1, name: 'About this demo' })
    expect(document.title).toBe('Halden Console — about')
    const nav = screen.getAllByRole('navigation', { name: 'Halden Console' })[0]
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
    const link = screen.getByRole('link', { name: 'Division design system case study' })
    expect(link).toHaveAttribute('href', 'https://victor-ilioiu.vercel.app/work/division-ds')
    expect(link).not.toHaveAttribute('target')
    expect(screen.getByText('npm run verify')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderConsole('/console/about')
    await screen.findByRole('heading', { level: 1, name: 'About this demo' })
    expect(await axeClean(container)).toHaveNoViolations()
  })
})