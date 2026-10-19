import { ChartPanel } from '../../../components/organisms/chart-panel/ChartPanel'
import { formatMoney } from '../../../lib/money'
import { REVENUE_BY_DAY, UNITS_BY_CATEGORY, type CategoryUnits, type RevenueDay } from './data'

/**
 * The dashboard's two charts, in their own module so `Dashboard.tsx` can `lazy()` it: ChartPanel
 * is the one thing in the demo that pulls Recharts in, and the inventory and settings pages
 * should not pay for it. Concrete, non-generic exports for the reason `SpendChart.tsx` gives:
 * `lazy()` erases a generic component's own type parameter.
 *
 * Both sit at heading level 2, beside the dashboard's other sections, directly under the
 * PageHeader's h1.
 */
// The revenue axis runs €0 to about €3,000 in steps of €750. `formatMoneyCompact` rounds to whole
// thousands above €1,000, which printed "€2K" on two ticks; one decimal keeps each tick distinct.
const axisEuro = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function OpsCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ChartPanel<RevenueDay>
        title="Revenue, last 14 days"
        headingLevel={2}
        summary="Revenue per day this fortnight against the fortnight before. Weekends peak; today is still open."
        kind="line"
        area
        curve="smooth"
        data={[...REVENUE_BY_DAY]}
        xKey="day"
        xLabel="Day"
        series={[
          { key: 'current', label: 'This fortnight' },
          { key: 'previous', label: 'Fortnight before' },
        ]}
        formatValue={value => formatMoney(value)}
        formatAxisValue={value => axisEuro.format(value / 100)}
        axisWidth={56}
      />
      <ChartPanel<CategoryUnits>
        title="Units sold by category"
        headingLevel={2}
        summary="Units sold this month against last month, per category. Ammo moves the most units by far."
        kind="bar"
        data={[...UNITS_BY_CATEGORY]}
        xKey="category"
        xLabel="Category"
        series={[
          { key: 'thisMonth', label: 'This month' },
          { key: 'lastMonth', label: 'Last month' },
        ]}
      />
    </div>
  )
}
