import { useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { linkVariants } from '../../components/atoms/link/Link'
import { Select } from '../../components/atoms/select/Select'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../components/molecules/form-field/FormField'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { Search } from '../../components/molecules/search/Search'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'
import { formatEuros } from '../money'
import { ACCOUNTS, repById, WORKSPACE } from '../data'
import { Owner } from '../DealBits'
import { dealValue, isOpen, type Account, type Deal, type Health, type Industry } from '../model'
import { useCrm } from '../store'

export const HEALTH: Record<Health, { label: string; tone: 'ok' | 'warning' | 'hostile' }> = {
  healthy: { label: 'Healthy', tone: 'ok' },
  watch: { label: 'Watch', tone: 'warning' },
  'at-risk': { label: 'At risk', tone: 'hostile' },
}
const HEALTH_ORDER: Health[] = ['healthy', 'watch', 'at-risk']

const INDUSTRIES: Industry[] = [...new Set(ACCOUNTS.map(a => a.industry))].sort()
const INDUSTRY_OPTIONS = [{ value: 'all', label: 'All industries' }, ...INDUSTRIES.map(i => ({ value: i, label: i }))]

export function openPipeline(accountId: string, deals: readonly Deal[]): number {
  return deals.filter(d => d.accountId === accountId && isOpen(d)).reduce((sum, d) => sum + dealValue(d), 0)
}

/** Every account with its open pipeline and health; search by name or city, filter by industry. */
export function Accounts() {
  const { state } = useCrm()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('all')
  const searchRef = useRef<HTMLInputElement>(null)
  const needle = query.trim().toLowerCase()
  const rows = ACCOUNTS.filter(
    a =>
      (industry === 'all' || a.industry === industry) &&
      (!needle || a.name.toLowerCase().includes(needle) || a.city.toLowerCase().includes(needle)),
  )

  const columns: DataTableColumn<Account>[] = [
    {
      key: 'name',
      header: 'Account',
      sortValue: a => a.name,
      cell: a => (
        <RouterLink to={`/crm/accounts/${a.id}`} className={linkVariants()}>
          {a.name}
        </RouterLink>
      ),
    },
    { key: 'industry', header: 'Industry', sortValue: a => a.industry, cell: a => a.industry },
    { key: 'city', header: 'City', sortValue: a => a.city, cell: a => a.city },
    { key: 'owner', header: 'Owner', sortValue: a => repById(a.ownerId).name, cell: a => <Owner ownerId={a.ownerId} /> },
    {
      key: 'pipeline',
      header: 'Open pipeline',
      numeric: true,
      sortValue: a => openPipeline(a.id, state.deals),
      cell: a => formatEuros(openPipeline(a.id, state.deals)),
    },
    {
      key: 'health',
      header: 'Health',
      sortValue: a => HEALTH_ORDER.indexOf(a.health),
      cell: a => (
        <Badge emphasis="subtle" tone={HEALTH[a.health].tone}>
          {HEALTH[a.health].label}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex max-w-screen-xl flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Accounts" description="The companies Halden Systems sells to, and what is open with each." />
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <Search
          ref={searchRef}
          label="Search accounts"
          placeholder="Name or city"
          value={query}
          onValueChange={setQuery}
        />
        <FormField label="Industry">
          <Select id="account-industry" label="Industry" options={INDUSTRY_OPTIONS} value={industry} onValueChange={setIndustry} />
        </FormField>
      </div>
      <p role="status" className="font-body text-sm font-semibold">
        {rows.length === ACCOUNTS.length ? `${ACCOUNTS.length} accounts` : `${rows.length} of ${ACCOUNTS.length} accounts match`}
      </p>
      <DataTable
        caption="Accounts"
        hideCaption
        columns={columns}
        rows={rows}
        getRowId={a => a.id}
        rowHeader="name"
        defaultSort={{ key: 'name', direction: 'ascending' }}
        emptyMessage={
          <EmptyState
            level={2}
            size="sm"
            framed={false}
            icon={<SearchX />}
            title="No accounts match"
            description="Try another name or city, or every industry."
            actions={
              <Button
                onClick={() => {
                  setQuery('')
                  setIndustry('all')
                  searchRef.current?.focus()
                }}
              >
                Clear filters
              </Button>
            }
          />
        }
      />
    </div>
  )
}
