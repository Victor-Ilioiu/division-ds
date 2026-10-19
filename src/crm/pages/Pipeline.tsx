import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Columns3, SearchX, Table2 } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { Select } from '../../components/atoms/select/Select'
import { Switch } from '../../components/atoms/switch/Switch'
import { Tag } from '../../components/atoms/tag/Tag'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../components/molecules/form-field/FormField'
import { MultiSelect } from '../../components/molecules/multi-select/MultiSelect'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { Pagination } from '../../components/molecules/pagination/Pagination'
import { Search } from '../../components/molecules/search/Search'
import { Stat } from '../../components/molecules/stat/Stat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/molecules/tabs/Tabs'
import { useToast } from '../../components/molecules/toast/Toast'
import { DataTable, sortRows, type DataTableColumn, type DataTableSort } from '../../components/organisms/data-table/DataTable'
import { formatEuros } from '../money'
import { accountById, REPS, repById, WORKSPACE } from '../data'
import { inRange, quarterOf, TODAY } from '../dates'
import { CloseDate, DealFlags, DealName, Owner, StageBadge } from '../DealBits'
import {
  dealValue,
  hasSlipped,
  isOpen,
  isStage,
  isStalled,
  STAGE_LABEL,
  STAGES,
  weightedValue,
  type Activity,
  type Deal,
} from '../model'
import { useOpenSheet } from '../navigation'
import { NewDealDialog } from '../NewDealDialog'
import { useCrm } from '../store'
import { PipelineBoard } from './PipelineBoard'

const OWNER_OPTIONS = REPS.map(rep => ({ value: rep.id, label: rep.name }))
const BULK_STAGE_OPTIONS = STAGES.filter(stage => stage !== 'lost').map(stage => ({
  value: stage,
  label: STAGE_LABEL[stage],
}))
const PAGE_SIZE = 10

/** The pipeline's figures, from the deals as they are now. */
export function pipelineStats(deals: readonly Deal[], today = TODAY) {
  const open = deals.filter(isOpen)
  const quarter = quarterOf(today)
  const closedThisQuarter = deals.filter(d => !isOpen(d) && inRange(d.closeDate, quarter.start, quarter.end))
  const won = closedThisQuarter.filter(d => d.stage === 'won').length
  const month = today.slice(0, 7)
  return {
    openValue: open.reduce((sum, d) => sum + dealValue(d), 0),
    weighted: open.reduce((sum, d) => sum + weightedValue(d), 0),
    winRate: closedThisQuarter.length ? Math.round((won / closedThisQuarter.length) * 100) : 0,
    closedThisQuarter: closedThisQuarter.length,
    closingThisMonth: open.filter(d => d.closeDate.slice(0, 7) === month).length,
    quarterLabel: quarter.label,
  }
}

type Flags = { stalled: boolean; slipped: boolean; noNext: boolean }

export function filterDeals(
  deals: readonly Deal[],
  activities: readonly Activity[],
  query: string,
  owners: readonly string[],
  flags: Flags,
): Deal[] {
  const needle = query.trim().toLowerCase()
  return deals.filter(deal => {
    if (owners.length > 0 && !owners.includes(deal.ownerId)) return false
    if (flags.stalled && !isStalled(deal, activities)) return false
    if (flags.slipped && !hasSlipped(deal)) return false
    if (flags.noNext && !(isOpen(deal) && !deal.nextStep)) return false
    if (!needle) return true
    const account = accountById(deal.accountId)?.name ?? ''
    return deal.name.toLowerCase().includes(needle) || account.toLowerCase().includes(needle)
  })
}

function columnsFor(activities: readonly Activity[], openDeal: (id: string) => void): DataTableColumn<Deal>[] {
  return [
    { key: 'name', header: 'Deal', sortValue: d => d.name, cell: d => <DealName deal={d} onOpen={openDeal} /> },
    { key: 'account', header: 'Account', sortValue: d => accountById(d.accountId)?.name ?? '', cell: d => accountById(d.accountId)?.name },
    { key: 'stage', header: 'Stage', sortValue: d => STAGES.indexOf(d.stage), cell: d => <StageBadge stage={d.stage} /> },
    { key: 'value', header: 'Value', numeric: true, sortValue: d => dealValue(d), cell: d => formatEuros(dealValue(d)) },
    { key: 'close', header: 'Close date', sortValue: d => d.closeDate, cell: d => <CloseDate deal={d} /> },
    { key: 'owner', header: 'Owner', sortValue: d => repById(d.ownerId).name, cell: d => <Owner ownerId={d.ownerId} /> },
    { key: 'flags', header: 'Flags', cell: d => <DealFlags deal={d} activities={activities} /> },
  ]
}

function dealsLabel(n: number) {
  return `${n} ${n === 1 ? 'deal' : 'deals'}`
}

/**
 * The pipeline: the four figures a sales lead asks for first, the filters, and the deals as a board
 * (by stage, drag to move) or a table (sort, select, act in bulk). The view lives in `?view=` so a
 * link keeps it; the hygiene filters the forecast links to (`?stalled=1`, `?slipped=1`,
 * `?nonext=1`) live there too.
 */
export function Pipeline() {
  const { state, run } = useCrm()
  const { toast } = useToast()
  const openDeal = useOpenSheet('deal')
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'table' ? 'table' : 'board'
  const flags: Flags = {
    stalled: params.get('stalled') === '1',
    slipped: params.get('slipped') === '1',
    noNext: params.get('nonext') === '1',
  }
  const [query, setQuery] = useState('')
  const [owners, setOwners] = useState<string[]>([])
  const [sort, setSort] = useState<DataTableSort>({ key: 'close', direction: 'ascending' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOwner, setBulkOwner] = useState('')
  const [bulkStage, setBulkStage] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  function setParam(key: string, value: string | null) {
    setParams(
      current => {
        const next = new URLSearchParams(current)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
    setPage(1)
  }

  const stats = pipelineStats(state.deals)
  const filtered = filterDeals(state.deals, state.activities, query, owners, flags)
  const filtering = query.trim() !== '' || owners.length > 0 || flags.stalled || flags.slipped || flags.noNext
  const columns = columnsFor(state.activities, openDeal)
  const sorted = sortRows(filtered, columns.find(c => c.key === sort.key)?.sortValue, sort.direction)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const count = selected.size

  function clearFilters() {
    setQuery('')
    setOwners([])
    setParams(
      current => {
        const next = new URLSearchParams(current)
        for (const key of ['stalled', 'slipped', 'nonext']) next.delete(key)
        return next
      },
      { replace: true },
    )
    setPage(1)
    searchRef.current?.focus()
  }

  function bulkAssign(ownerId: string) {
    if (count === 0) return
    const ids = [...selected]
    const { undo } = run({ type: 'setOwner', dealIds: ids, ownerId })
    setBulkOwner('')
    toast({
      tone: 'ok',
      title: `${dealsLabel(ids.length)} assigned to ${repById(ownerId).name}`,
      action: { label: 'Undo', altText: 'Select the same deals and assign them back.', onAction: undo },
    })
  }

  function bulkMove(stage: string) {
    if (count === 0 || !isStage(stage)) return
    const ids = [...selected]
    const undos = ids.map(dealId => run({ type: 'moveStage', dealId, stage }).undo)
    setBulkStage('')
    toast({
      tone: 'ok',
      title: `${dealsLabel(ids.length)} moved to ${STAGE_LABEL[stage]}`,
      action: {
        label: 'Undo',
        altText: 'Select the same deals and move them back.',
        // Undone newest first, so each deal goes back to the place it held.
        onAction: () => [...undos].reverse().forEach(undo => undo()),
      },
    })
  }

  const empty = (
    <EmptyState
      level={2}
      size="sm"
      framed={false}
      icon={<SearchX />}
      title="No deals match"
      description="Nothing in the pipeline matches every filter. Remove one, or clear them all."
      actions={<Button onClick={clearFilters}>Clear filters</Button>}
    />
  )

  return (
    <div className="flex max-w-screen-2xl flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Pipeline" description="Every open deal by stage, and what closed this quarter." actions={<NewDealDialog />} />

      <section aria-label="Pipeline figures" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open pipeline" value={formatEuros(stats.openValue)} />
        <Stat label="Weighted forecast" value={formatEuros(stats.weighted)} />
        <Stat label={`Win rate, ${stats.quarterLabel}`} value={`${stats.winRate}%`} />
        <Stat label="Closing this month" value={stats.closingThisMonth} />
      </section>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Search
            ref={searchRef}
            label="Search deals"
            placeholder="Deal or account name"
            value={query}
            onValueChange={value => {
              setQuery(value)
              setPage(1)
            }}
          />
          <FormField label="Owners">
            <MultiSelect
              label="Owners"
              options={OWNER_OPTIONS}
              value={owners}
              placeholder="Everyone"
              onValueChange={value => {
                setOwners(value)
                setPage(1)
              }}
            />
          </FormField>
          <div className="flex min-h-10 items-center gap-3">
            <Switch id="only-stalled" checked={flags.stalled} onCheckedChange={on => setParam('stalled', on ? '1' : null)} />
            <label htmlFor="only-stalled" className="font-body text-sm">
              Only stalled
            </label>
          </div>
        </div>
        {flags.slipped || flags.noNext ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body text-sm text-[var(--color-text-secondary)]">Also showing only:</span>
            {flags.slipped ? <Tag onDismiss={() => setParam('slipped', null)}>Close date passed</Tag> : null}
            {flags.noNext ? <Tag onDismiss={() => setParam('nonext', null)}>No next step</Tag> : null}
          </div>
        ) : null}
        <p role="status" className="font-body text-sm font-semibold">
          {filtering ? `${filtered.length} of ${dealsLabel(state.deals.length)} match` : dealsLabel(state.deals.length)}
        </p>
      </div>

      <Tabs value={view} onValueChange={value => setParam('view', value === 'table' ? 'table' : null)} variant="line">
        <TabsList aria-label="Pipeline view">
          <TabsTrigger value="board" icon={<Columns3 />}>
            Board
          </TabsTrigger>
          <TabsTrigger value="table" icon={<Table2 />}>
            Table
          </TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="pt-4">
          {filtered.length === 0 ? (
            empty
          ) : (
            <PipelineBoard deals={filtered} activities={state.activities} onOpen={openDeal} />
          )}
        </TabsContent>
        <TabsContent value="table" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-end gap-4 border-y border-[var(--color-border-hairline)] py-3">
            <p className="basis-full font-body text-sm text-[var(--color-text-secondary)]">
              {count === 0
                ? 'Select deals to act on them.'
                : `${dealsLabel(count)} selected. Lost needs a reason, so it is set from each deal's sheet.`}
            </p>
            <FormField label="Assign owner" className="min-w-48">
              <Select
                id="bulk-owner"
                label="Assign owner"
                placeholder="Choose a rep"
                options={OWNER_OPTIONS}
                value={bulkOwner}
                disabled={count === 0}
                onValueChange={bulkAssign}
              />
            </FormField>
            <FormField label="Move to stage" className="min-w-48">
              <Select
                id="bulk-stage"
                label="Move to stage"
                placeholder="Choose a stage"
                options={BULK_STAGE_OPTIONS}
                value={bulkStage}
                disabled={count === 0}
                onValueChange={bulkMove}
              />
            </FormField>
          </div>
          <DataTable
            caption="Deals"
            hideCaption
            columns={columns}
            rows={visible}
            getRowId={d => d.id}
            rowHeader="name"
            sort={sort}
            onSortChange={next => {
              setSort(next)
              setPage(1)
            }}
            selectable
            rowLabel={d => d.name}
            selected={selected}
            onSelectedChange={setSelected}
            emptyMessage={empty}
          />
          {sorted.length > PAGE_SIZE ? (
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              totalItems={sorted.length}
              pageSize={PAGE_SIZE}
              label="Pagination, deals"
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
