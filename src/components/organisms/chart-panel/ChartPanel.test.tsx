import { createRef, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { ChartPanel, type ChartPanelProps } from './ChartPanel'

/** The global stub in `src/test/setup.ts` never calls back, which is exactly what every other
 *  test in this file relies on (Recharts renders nothing at a zero-size container -- see the
 *  comments below on the legend-swatch and role="application" tests). The y-axis tests need the
 *  opposite: a `ResizeObserver` that reports a real size, so Recharts actually lays the axis out
 *  and its own tick text reaches the DOM. Installed and restored around one `render` at a time,
 *  never left in place for the rest of the file. */
class SizedResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {
    // A real ResizeObserver's first notification also arrives after the current task, never
    // synchronously inside `observe()` itself -- queued the same way so this stub cannot mask a
    // component that assumes the callback already ran by the time `observe` returns.
    Promise.resolve().then(() => {
      this.callback([{ contentRect: { width: 400, height: 240 } } as ResizeObserverEntry], this as unknown as ResizeObserver)
    })
  }
  unobserve() {}
  disconnect() {}
}

async function renderSized(element: ReactElement, ready = '.recharts-yAxis') {
  const original = globalThis.ResizeObserver
  globalThis.ResizeObserver = SizedResizeObserver as unknown as typeof ResizeObserver
  try {
    const result = render(element)
    await waitFor(() => expect(result.container.querySelectorAll(ready).length).toBeGreaterThan(0))
    return result
  } finally {
    globalThis.ResizeObserver = original
  }
}

type Week = { week: string; online: number; store: number }

const WEEKS: Week[] = [
  { week: 'W1', online: 120, store: 160 },
  { week: 'W2', online: 131, store: 158 },
  { week: 'W3', online: 142, store: 163 },
  { week: 'W4', online: 150, store: 155 },
  { week: 'W5', online: 171, store: 162 },
  { week: 'W6', online: 188, store: 159 },
  { week: 'W7', online: 197, store: 166 },
  { week: 'W8', online: 214, store: 161 },
]
const SUMMARY = 'Online orders rose from 120 to 214 over eight weeks and passed in-store orders in week 5.'

function Weekly(props: Partial<ChartPanelProps<Week>>) {
  return (
    <ChartPanel<Week>
      title="Weekly orders"
      summary={SUMMARY}
      kind="line"
      data={WEEKS}
      xKey="week"
      xLabel="Week"
      series={[
        { key: 'online', label: 'Online' },
        { key: 'store', label: 'In store' },
      ]}
      {...props}
    />
  )
}

describe('ChartPanel', () => {
  // Mutation: drop aria-labelledby from the figure; jsdom names it nothing and getByRole fails.
  it('is a region named by its title, with the summary as the figure caption', () => {
    render(<Weekly />)
    expect(screen.getByRole('region', { name: 'Weekly orders' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: SUMMARY })).toBeInTheDocument()
  })

  // Mutation: drop aria-hidden from the chart wrapper. The role="application" line cannot fail here
  // (jsdom renders no SVG at zero size); e2e proves it in a real browser.
  it('hides the chart itself from assistive tech', () => {
    const { container } = render(<Weekly />)
    const chart = container.querySelector('.recharts-responsive-container')
    expect(chart).not.toBeNull()
    expect(chart?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(container.querySelector('[role="application"]')).toBeNull()
  })

  // Mutation: render the legend for any series count; the second assertion finds a legend.
  it('names both series in a legend, and shows no legend for one series', () => {
    const { unmount } = render(<Weekly />)
    const legend = screen.getByRole('list', { name: 'Series' })
    expect(within(legend).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Online', 'In store'])
    unmount()
    render(<Weekly series={[{ key: 'online', label: 'Online' }]} />)
    expect(screen.queryByRole('list', { name: 'Series' })).toBeNull()
  })

  // A line-chart legend can't rely on colour alone to tell two series apart (SC 1.4.1), so series
  // 2's swatch is dashed rather than a solid block, matching the second Line's own strokeDasharray
  // (recharts renders no path at all under jsdom -- see ChartPanel.tsx's dashed-line comment -- so
  // this checks the one part of the distinction jsdom can see: the legend swatch itself).
  // Mutation: index the legend swatch's style by `kind === 'line'` alone, dropping SERIES_DASH[index].
  it('draws the second series in a line legend as a dashed swatch, not a solid one', () => {
    render(<Weekly />)
    const legend = screen.getByRole('list', { name: 'Series' })
    const swatches = within(legend)
      .getAllByRole('listitem')
      .map(item => item.querySelector('[aria-hidden="true"]') as HTMLElement)
    expect(swatches[0].style.backgroundImage).toBe('')
    // Not only "some dash": the swatch is built from the same "6 3" SERIES_DASH hands the SVG Line
    // (ChartPanel.tsx's dashSwatch), so this also proves the two can't drift apart from each other.
    expect(swatches[1].style.backgroundImage).toContain('repeating-linear-gradient')
    expect(swatches[1].style.backgroundImage).toContain('0 6px')
    expect(swatches[1].style.backgroundImage).toContain('6px 9px')
  })

  // Mutations: drop `hidden` from the table's wrapper (the table is there before the click); format
  // cells with String() instead of formatValue (the cells read '171' and '162').
  it('keeps the table collapsed until asked, then shows the same rows, formatted', async () => {
    render(<Weekly formatValue={value => `${value} orders`} />)
    const toggle = screen.getByRole('button', { name: 'Show as table' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).toBeNull()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table', { name: 'Weekly orders, as a table' })
    expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')).toContainElement(table)
    expect(within(table).getAllByRole('row')).toHaveLength(WEEKS.length + 1)
    const week5 = within(table).getByRole('rowheader', { name: 'W5' }).closest('tr')
    expect(within(week5 as HTMLElement).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      '171 orders',
      '162 orders',
    ])
  })

  // The bug this guards: the y-axis previously always ran `formatValue` (a full "€1,234.00" for
  // SpendChart's own euro amounts) into a hard-coded 48px axis, clipping it. `formatAxisValue`
  // decouples the axis from the tooltip/table's own formatter; `axisWidth` decouples its reserved
  // space from Recharts' own YAxis default.
  // Mutation: revert the tickFormatter call to plain `formatValue` and the YAxis `width` back to
  // the literal `48` (ChartPanel.tsx before this fix) -> the "AX" tick assertion below finds
  // "0"/"340" instead of "AX0"/"AX340", and the offset assertion finds 48 instead of 96.
  it('formats the y-axis with its own formatter and reserves its own width, independent of formatValue', async () => {
    const { container } = await renderSized(
      <Weekly
        data={[{ week: 'W1', online: 0, store: 0 }, { week: 'W2', online: 340, store: 0 }]}
        formatValue={value => `${value} orders`}
        formatAxisValue={value => `AX${value}`}
        axisWidth={96}
      />
    )
    const allText = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(allText).toContain('AX0')
    expect(allText).toContain('AX340')
    expect(allText.some(text => text?.includes('orders'))).toBe(false)
    const line = container.querySelector('.recharts-xAxis .recharts-cartesian-axis-line')
    expect(line).toHaveAttribute('x1', '96')
  })

  // Mutation: drop the `formatAxisValue = formatValue` default (default it to `formatNumber`
  // instead, ChartPanel's own module-level default) -> the assertion below finds "340", the plain
  // Intl.NumberFormat('en-IE') reading, instead of "340 orders".
  it('defaults the y-axis formatter to formatValue when none of its own is given', async () => {
    const { container } = await renderSized(
      <Weekly
        data={[{ week: 'W1', online: 0, store: 0 }, { week: 'W2', online: 340, store: 0 }]}
        formatValue={value => `${value} orders`}
      />
    )
    const allText = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(allText).toContain('340 orders')
  })

  it('is axe clean with the table shown', async () => {
    const { container } = render(<Weekly />)
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: drop ref={ref} from the Card.
  it('forwards a ref to the panel', () => {
    const ref = createRef<HTMLElement>()
    render(<Weekly ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('region', { name: 'Weekly orders' }))
  })

  // --- Round 2 (2026-10-14): area, curve, grid, size, donut, radar ---

  // Mutation: render <Line> instead of <Area> when `area` is set, or drop the gradient's stops.
  it('fills under a line with a fading gradient of the series colour when area is set', async () => {
    const { container } = await renderSized(<Weekly area />, '.recharts-area')
    expect(container.querySelectorAll('.recharts-area')).toHaveLength(2)
    const gradient = container.querySelector('linearGradient')
    expect(gradient).not.toBeNull()
    const stops = Array.from(gradient?.querySelectorAll('stop') ?? [])
    expect(stops[0].getAttribute('stop-color')).toBe('var(--color-chart-series-1)')
    expect(Number(stops[0].getAttribute('stop-opacity'))).toBeGreaterThan(0)
    expect(stops[stops.length - 1].getAttribute('stop-opacity')).toBe('0')
    const fill = container.querySelector('.recharts-area-area')?.getAttribute('fill')
    expect(fill).toBe(`url(#${gradient?.id})`)
  })

  // Mutation: map curve="smooth" to type="linear"; the path holds no cubic segment.
  it('draws a smooth (monotone) curve when asked, straight segments otherwise', async () => {
    const curveOf = (root: HTMLElement) => root.querySelector('.recharts-line-curve')?.getAttribute('d') ?? ''
    const straight = await renderSized(<Weekly />, '.recharts-line-curve')
    expect(curveOf(straight.container)).not.toMatch(/C/)
    straight.unmount()
    const smooth = await renderSized(<Weekly curve="smooth" />, '.recharts-line-curve')
    expect(curveOf(smooth.container)).toMatch(/C/)
  })

  // Mutation: ignore `grid`; the no-grid render still has the grid group.
  it('hides the horizontal grid lines when grid is false', async () => {
    const withGrid = await renderSized(<Weekly />)
    expect(withGrid.container.querySelector('.recharts-cartesian-grid')).not.toBeNull()
    withGrid.unmount()
    const without = await renderSized(<Weekly grid={false} />)
    expect(without.container.querySelector('.recharts-cartesian-grid')).toBeNull()
  })

  // Mutation: render the axes at size sm; the y-axis appears.
  it('at size sm, shows the headline and a bare sparkline with no axes', async () => {
    const { container } = await renderSized(<Weekly size="sm" headline="1.4K" />, '.recharts-line')
    expect(screen.getByText('1.4K')).toBeInTheDocument()
    expect(container.querySelector('.recharts-yAxis')).toBeNull()
    expect(container.querySelector('.recharts-xAxis')).toBeNull()
    expect(container.querySelector('.recharts-cartesian-grid')).toBeNull()
    // Still a figure with its caption, and still the table: size never removes the alternative.
    expect(screen.getByRole('figure', { name: SUMMARY })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show as table' })).toBeInTheDocument()
  })

  it('renders no headline unless given one', () => {
    const { container } = render(<Weekly />)
    expect(container.querySelector('[data-part="headline"]')).toBeNull()
  })
})

type Slice = { category: string; orders: number }
const SLICES: Slice[] = [
  { category: 'Replicas', orders: 120 },
  { category: 'Optics', orders: 40 },
  { category: 'Parts', orders: 30 },
  { category: 'Ammo', orders: 10 },
]
const DONUT_SUMMARY = 'Replicas are 60% of the 200 orders this week.'

function Donut(props: Partial<ChartPanelProps<Slice>>) {
  return (
    <ChartPanel<Slice>
      title="Orders by category"
      summary={DONUT_SUMMARY}
      kind="donut"
      data={SLICES}
      xKey="category"
      xLabel="Category"
      series={[{ key: 'orders', label: 'Orders' }]}
      centerLabel="Orders"
      {...props}
    />
  )
}

describe('ChartPanel, kind donut', () => {
  // Mutation: drop the share from the legend; the text check fails.
  it('lists every slice with its value and share in a legend', () => {
    render(<Donut />)
    const legend = screen.getByRole('list', { name: 'Slices' })
    expect(within(legend).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Replicas12060%',
      'Optics4020%',
      'Parts3015%',
      'Ammo105%',
    ])
  })

  // Mutation: sum the wrong column, or skip formatValue on the total.
  it('prints the total and the centre label in the middle of the ring', () => {
    render(<Donut formatValue={value => `${value} pcs`} />)
    const centre = document.querySelector('[data-part="centre"]') as HTMLElement
    expect(centre).toHaveTextContent('200 pcs')
    expect(centre).toHaveTextContent('Orders')
  })

  // Mutation: drop the Share column from the donut table.
  it('adds a Share column to the table', async () => {
    render(<Donut />)
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }))
    const table = screen.getByRole('table', { name: 'Orders by category, as a table' })
    expect(within(table).getByRole('columnheader', { name: 'Share' })).toBeInTheDocument()
    const parts = within(table).getByRole('rowheader', { name: 'Parts' }).closest('tr') as HTMLElement
    expect(within(parts).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['30', '15%'])
  })

  // The third slice and on reuse the two series colours as a stripe, then a dot, pattern: two
  // colours, six distinguishable fills, and the pattern is the non-colour cue between neighbours.
  // Mutation: fill every slice with a solid colour.
  it('fills slices solid, then striped, so neighbours differ by more than colour', async () => {
    const { container } = await renderSized(<Donut />, '.recharts-pie-sector')
    const fills = Array.from(container.querySelectorAll('.recharts-pie-sector path')).map(path => path.getAttribute('fill'))
    expect(fills).toHaveLength(4)
    expect(fills[0]).toBe('var(--color-chart-series-1)')
    expect(fills[1]).toBe('var(--color-chart-series-2)')
    expect(fills[2]).toMatch(/^url\(#/)
    const legend = screen.getByRole('list', { name: 'Slices' })
    const swatch = within(legend).getAllByRole('listitem')[2].querySelector('[aria-hidden="true"]') as HTMLElement
    expect(swatch.style.backgroundImage).toContain('repeating-linear-gradient')
  })

  it('is axe clean with the table shown', async () => {
    const { container } = render(<Donut />)
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

type Axis = { skill: string; alpha: number; bravo: number }
const AXES: Axis[] = [
  { skill: 'Range', alpha: 80, bravo: 60 },
  { skill: 'Accuracy', alpha: 70, bravo: 85 },
  { skill: 'Weight', alpha: 40, bravo: 70 },
  { skill: 'Rate of fire', alpha: 90, bravo: 50 },
  { skill: 'Reliability', alpha: 75, bravo: 80 },
]

function Radar(props: Partial<ChartPanelProps<Axis>>) {
  return (
    <ChartPanel<Axis>
      title="Replica profiles"
      summary="Alpha is faster and longer-ranged; Bravo is lighter and more accurate."
      kind="radar"
      data={AXES}
      xKey="skill"
      xLabel="Measure"
      series={[
        { key: 'alpha', label: 'Alpha' },
        { key: 'bravo', label: 'Bravo' },
      ]}
      {...props}
    />
  )
}

describe('ChartPanel, kind radar', () => {
  // Mutation: drop the strokeDasharray on series 2's Radar.
  it('draws one shape per series, the second dashed', async () => {
    const { container } = await renderSized(<Radar />, '.recharts-radar')
    const shapes = container.querySelectorAll('.recharts-radar-polygon path')
    expect(shapes).toHaveLength(2)
    expect(shapes[0].getAttribute('stroke-dasharray')).toBeNull()
    expect(shapes[1].getAttribute('stroke-dasharray')).toBe('6 3')
  })

  it('keeps the legend and the table', async () => {
    render(<Radar />)
    expect(within(screen.getByRole('list', { name: 'Series' })).getAllByRole('listitem')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(AXES.length + 1)
  })

  it('is axe clean', async () => {
    const { container } = render(<Radar />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('ChartPanel, type checks', () => {
  // Type-only, never runs. Mutation: widen `series` to ChartSeries<Row>[]; `npx tsc -b` then fails
  // with TS2578, an unused @ts-expect-error.
  it.skip('rejects a third series at the type level', () => {
    // @ts-expect-error at most two series: a third would need a status hue or a grey
    ;<Weekly series={[{ key: 'online', label: 'Online' }, { key: 'store', label: 'In store' }, { key: 'online', label: 'Again' }]} />
  })

  // Type-only, never runs, and discriminates from the third-series case above: this one is a
  // valid-shaped, single-entry series array rejected for its key's VALUE, not its length.
  // Mutation: widen ChartSeries<Row>'s `key` back to `keyof Row & string`; `npx tsc -b` then fails
  // with TS2578, an unused @ts-expect-error.
  it.skip('rejects a series keyed to a string column at the type level', () => {
    // @ts-expect-error a series measures a number; "week" is the x-axis category, a string column
    ;<Weekly series={[{ key: 'week', label: 'Week' }]} />
  })
})
