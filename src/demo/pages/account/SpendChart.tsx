import { ChartPanel } from '../../../components/organisms/chart-panel/ChartPanel'
import { formatMoney, formatMoneyCompact } from '../../../lib/money'
import type { MonthSpend } from '../../store/orders'

/**
 * A concrete, non-generic wrapper around `ChartPanel<MonthSpend>`. `lazy()` erases a generic
 * component's own type parameter -- the module it resolves types as a plain
 * `ComponentType<unknown>`, which is why `ChartPanel<Row>` itself is never the thing passed to
 * `lazy()` anywhere in this codebase (`ChartPanelDocs`, a concrete, non-generic page, is what
 * App.tsx lazy-loads instead). This file exists so Overview.tsx's own lazy import has the same
 * shape: something concrete to resolve to, with `ChartPanel`'s own generic already applied here,
 * inside a module Recharts still only reaches once this chunk loads.
 */
export function SpendChart({ data }: { data: MonthSpend[] }) {
  return (
    <ChartPanel<MonthSpend>
      title="Spend per month"
      // Overview's own outline has nothing between AccountLayout's h1 ("Your account") and this
      // panel: ChartPanel's own default (3) would skip straight from 1 to 3, an outline gap SC
      // 1.3.1/2.4.6 both catch. 2 sits it alongside "Recent orders", this page's other h2.
      headingLevel={2}
      summary="Total spent on Hexline orders each month with an order in 2026."
      kind="bar"
      data={data}
      xKey="month"
      xLabel="Month"
      series={[{ key: 'totalCents', label: 'Spent' }]}
      formatValue={value => formatMoney(value)}
      // Recharts' own tick values are round numbers over the raw cents domain (0, 10000, 20000,
      // ...), and `formatValue` above renders one of those in full ("€500.00") for the tooltip and
      // the table -- too wide for ChartPanel's default 48px axis, which is sized for a short
      // integer, not a decimal currency string. The axis gets its own, shorter formatter instead.
      formatAxisValue={value => formatMoneyCompact(value)}
      axisWidth={56}
    />
  )
}
