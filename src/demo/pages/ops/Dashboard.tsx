import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { Badge } from '../../../components/atoms/badge/Badge'
import { Button } from '../../../components/atoms/button/Button'
import { linkVariants } from '../../../components/atoms/link/Link'
import { Skeleton, SkeletonGroup } from '../../../components/atoms/skeleton/Skeleton'
import { Alert } from '../../../components/molecules/alert/Alert'
import { AvatarGroup } from '../../../components/molecules/avatar-group/AvatarGroup'
import { List, ListItem } from '../../../components/molecules/list-item/ListItem'
import { PageHeader } from '../../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../../components/molecules/section-heading/SectionHeading'
import { Stat } from '../../../components/molecules/stat/Stat'
import { useToast } from '../../../components/molecules/toast/Toast'
import { DataTable, type DataTableColumn } from '../../../components/organisms/data-table/DataTable'
import { formatMoney } from '../../../lib/money'
import {
  inventoryFromCatalog,
  lowStock,
  opsLatency,
  opsRequest,
  RECENT_ORDERS,
  TEAM,
  type OpsOrder,
  type OpsOrderStatus,
} from './data'
import { OpsLayout } from './OpsLayout'

const OpsCharts = lazy(() => import('./OpsCharts').then(module => ({ default: module.OpsCharts })))

const STATUS_TONE: Record<OpsOrderStatus, 'warning' | 'info' | 'ok' | 'neutral'> = {
  // Paid is the one that needs a person: it is waiting to be packed.
  Paid: 'warning',
  Packed: 'info',
  Shipped: 'ok',
  Refunded: 'neutral',
}

// No sortValue on any column: six rows from this morning, newest first, are read top to bottom.
// Sorting belongs to a full order list, which the back office does not have yet.
const ORDER_COLUMNS: DataTableColumn<OpsOrder>[] = [
  // nowrap: in the narrower of the two columns the id broke at its hyphen. No item count either,
  // for the same width: the total says more on a dashboard, and the order says the rest.
  { key: 'id', header: 'Order', cell: order => <span className="whitespace-nowrap">{order.id}</span> },
  { key: 'customer', header: 'Customer', cell: order => order.customer },
  { key: 'time', header: 'Time', cell: order => order.time },
  { key: 'total', header: 'Total', numeric: true, cell: order => formatMoney(order.totalCents) },
  {
    key: 'status',
    header: 'Status',
    cell: order => (
      <Badge emphasis="subtle" tone={STATUS_TONE[order.status]}>
        {order.status}
      </Badge>
    ),
  },
]

/** The same hour last week, the fixed figures the deltas compare against. */
const LAST_WEEK = { revenueCents: 68400, orders: 4 }

function percentChange(now: number, before: number): string {
  return `${Math.round(Math.abs((now - before) / before) * 100)}%`
}

/** The loaded layout, drawn in placeholders: four stats, two chart panels, the orders table and
 *  the side column. Sized like the real thing so nothing jumps when it lands. */
function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading the dashboard" className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="w-2/3" />
            <Skeleton shape="block" className="h-10 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton shape="block" className="h-80 w-full" />
        <Skeleton shape="block" className="h-80 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="w-40" />
          <div className="flex flex-col divide-y divide-[var(--color-border-hairline)]">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 py-3">
                <Skeleton />
                <Skeleton className="w-4/5" />
                <Skeleton className="w-1/2 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="w-32" />
          <Skeleton lines={4} />
          <div className="flex items-center gap-2 pt-4">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} shape="avatar" size="md" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonGroup>
  )
}

function ChartsFallback() {
  return (
    <SkeletonGroup label="Loading the charts" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Skeleton shape="block" className="h-80 w-full" />
      <Skeleton shape="block" className="h-80 w-full" />
    </SkeletonGroup>
  )
}

function DashboardBody() {
  const { toast } = useToast()
  const [reordering, setReordering] = useState<string | null>(null)
  const [reordered, setReordered] = useState<ReadonlySet<string>>(new Set())
  const [courierNotice, setCourierNotice] = useState(true)

  const paid = RECENT_ORDERS.filter(order => order.status !== 'Refunded')
  const revenueCents = paid.reduce((sum, order) => sum + order.totalCents, 0)
  const averageCents = Math.round(revenueCents / paid.length)
  const low = lowStock(inventoryFromCatalog())
  const onShift = TEAM.filter(member => member.onShift)
  const online = onShift.filter(member => member.status === 'online').length

  async function reorder(id: string, name: string) {
    setReordering(id)
    await opsRequest()
    setReordering(null)
    setReordered(current => new Set(current).add(id))
    toast({
      tone: 'ok',
      title: 'Reorder sent',
      description: `${name}: 12 units, due in 3 working days.`,
    })
  }

  return (
    <div className="flex flex-col gap-10">
      {courierNotice ? (
        <Alert compact tone="info" title="Courier pickup moved" onDismiss={() => setCourierNotice(false)}>
          Today’s pickup is at 15:00, not 13:00. Pack paid orders by 14:30.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Stat
          label="Revenue today"
          value={formatMoney(revenueCents)}
          delta={{
            value: percentChange(revenueCents, LAST_WEEK.revenueCents),
            direction: revenueCents >= LAST_WEEK.revenueCents ? 'up' : 'down',
            sentiment: revenueCents >= LAST_WEEK.revenueCents ? 'positive' : 'negative',
            period: 'this time last week',
          }}
        />
        <Stat
          label="Orders today"
          value={RECENT_ORDERS.length}
          delta={{
            value: String(RECENT_ORDERS.length - LAST_WEEK.orders),
            direction: 'up',
            sentiment: 'positive',
            period: 'this time last week',
          }}
        />
        <Stat label="Average order" value={formatMoney(averageCents)} />
        <Stat label="Items to reorder" value={low.length} />
      </div>

      <Suspense fallback={<ChartsFallback />}>
        <OpsCharts />
      </Suspense>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="ops-recent-orders" className="flex min-w-0 flex-col gap-4">
            <SectionHeading
              level={2}
              id="ops-recent-orders"
              title="Recent orders"
              description="This morning’s orders, newest first. Paid orders are waiting to be packed."
            />
            <DataTable
              caption="Recent orders"
              hideCaption
              columns={ORDER_COLUMNS}
              rows={RECENT_ORDERS}
              getRowId={order => order.id}
              rowHeader="id"
            />
          </section>
          <section aria-labelledby="ops-on-shift" className="flex flex-col gap-3">
            <SectionHeading
              level={2}
              id="ops-on-shift"
              title="On shift"
              action={
                <RouterLink to="/store/ops/settings?tab=team" className={linkVariants()}>
                  Manage team
                </RouterLink>
              }
            />
            <div className="flex flex-wrap items-center gap-4">
              <AvatarGroup people={onShift} max={4} label="On shift" overflowTooltip />
              <p className="font-body text-sm text-[var(--color-text-secondary)]">
                {onShift.length} on shift, {online} online
              </p>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="ops-low-stock" className="flex flex-col gap-3">
            <SectionHeading
              level={2}
              id="ops-low-stock"
              title="Low on stock"
              action={
                <RouterLink to="/store/ops/inventory?status=low" className={linkVariants()}>
                  View in inventory
                </RouterLink>
              }
            />
            <List aria-labelledby="ops-low-stock">
              {low.map(item => (
                <ListItem
                  key={item.id}
                  title={item.name}
                  description={`${item.sku} · ${item.stock} left`}
                  actions={
                    reordered.has(item.id) ? (
                      <Badge tone="ok">Reordered</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Reorder ${item.name}`}
                        loading={reordering === item.id}
                        loadingLabel={`Reordering ${item.name}`}
                        onClick={() => {
                          if (reordering === null) void reorder(item.id, item.name)
                        }}
                      >
                        Reorder
                      </Button>
                    )
                  }
                />
              ))}
            </List>
          </section>
        </div>
      </div>
    </div>
  )
}

/**
 * The back office's front page: today in four numbers, two charts, this morning's orders, what to
 * reorder and who is working. The first load is simulated (`opsRequest`, 600ms) so the skeleton
 * is a real state and not a docs-only one: the page header renders at once, and the body below it
 * is placeholders until the "request" settles. Refresh runs the same load again, with the button
 * busy, and a hidden status line says when it is done, since the swap from placeholders to content
 * is silent on its own. With the latency at 0 (`setOpsLatency(0)`, the tests) the body renders on
 * the first pass and no placeholder ever shows.
 */
export function Dashboard() {
  const [loaded, setLoaded] = useState(() => opsLatency() === 0)
  const [refreshed, setRefreshed] = useState(false)
  const loads = useRef(0)

  function load(isRefresh: boolean) {
    const run = ++loads.current
    setLoaded(false)
    void opsRequest().then(() => {
      if (run !== loads.current) return
      setLoaded(true)
      setRefreshed(isRefresh)
    })
  }

  useEffect(() => {
    if (!loaded) load(false)
    return () => {
      // A load that lands after the page has gone is dropped by the run check.
      loads.current += 1
    }
    // The first load only: Refresh starts every later one itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <OpsLayout>
      <PageHeader
        eyebrow="Back office"
        title="Dashboard"
        description="Wednesday 14 October. Figures to 09:40."
        actions={
          <>
            <Button
              variant="secondary"
              iconStart={<RefreshCw />}
              loading={!loaded}
              loadingLabel="Refreshing the dashboard"
              onClick={() => {
                if (loaded) load(true)
              }}
            >
              Refresh
            </Button>
            {/* "Inventory", not "Open inventory": PageHeader's actions row is `shrink-0`, so it never
                wraps its own buttons, and the longer label pushed the pair past a 320px screen. */}
            <Button asChild>
              <RouterLink to="/store/ops/inventory">
                Inventory
                <ArrowRight aria-hidden="true" className="size-4" />
              </RouterLink>
            </Button>
          </>
        }
      />
      <p role="status" className="sr-only">
        {loaded && refreshed ? 'Dashboard refreshed.' : ''}
      </p>
      {loaded ? <DashboardBody /> : <DashboardSkeleton />}
    </OpsLayout>
  )
}
