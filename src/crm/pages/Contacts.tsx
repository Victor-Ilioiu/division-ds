import { useId, useRef, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '../../components/atoms/button/Button'
import { linkVariants } from '../../components/atoms/link/Link'
import { Select } from '../../components/atoms/select/Select'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { FormField } from '../../components/molecules/form-field/FormField'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { Pagination } from '../../components/molecules/pagination/Pagination'
import { Search } from '../../components/molecules/search/Search'
import { useToast } from '../../components/molecules/toast/Toast'
import { DataTable, sortRows, type DataTableColumn, type DataTableSort } from '../../components/organisms/data-table/DataTable'
import { Sheet, SheetContent } from '../../components/organisms/sheet/Sheet'
import { ActivityTimeline } from '../ActivityTimeline'
import { Composer } from '../Composer'
import { accountById, REPS, repById, WORKSPACE } from '../data'
import { formatDate } from '../dates'
import { Owner } from '../DealBits'
import type { Contact } from '../model'
import { useCloseSheet, useOpenSheet } from '../navigation'
import { useCrm } from '../store'

const OWNER_OPTIONS = REPS.map(rep => ({ value: rep.id, label: rep.name }))
const PAGE_SIZE = 15
const LABEL = 'font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-label)]'

function contactsLabel(n: number) {
  return `${n} ${n === 1 ? 'contact' : 'contacts'}`
}

function ContactBody({ contact }: { contact: Contact }) {
  const { state } = useCrm()
  const ids = useId()
  const account = accountById(contact.accountId)
  const activities = state.activities.filter(a => a.contactId === contact.id).slice(0, 8)
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 font-body text-sm">
        <dt className="text-[var(--color-text-secondary)]">Account</dt>
        <dd>
          {account ? (
            <RouterLink to={`/crm/accounts/${account.id}`} className={linkVariants()}>
              {account.name}
            </RouterLink>
          ) : null}
        </dd>
        <dt className="text-[var(--color-text-secondary)]">Email</dt>
        <dd className="break-all">
          <a href={`mailto:${contact.email}`} className={linkVariants()}>
            {contact.email}
          </a>
        </dd>
        <dt className="text-[var(--color-text-secondary)]">Phone</dt>
        <dd className="font-mono">{contact.phone}</dd>
        <dt className="text-[var(--color-text-secondary)]">Owner</dt>
        <dd>{repById(contact.ownerId).name}</dd>
        <dt className="text-[var(--color-text-secondary)]">Last touch</dt>
        <dd>{formatDate(contact.lastTouch)}</dd>
      </dl>
      <section aria-labelledby={`${ids}-log`} className="flex flex-col gap-3">
        <h3 id={`${ids}-log`} className={LABEL}>
          Log a call
        </h3>
        <Composer kinds={['call']} target={{ accountId: contact.accountId, contactId: contact.id }} />
      </section>
      <section aria-labelledby={`${ids}-recent`} className="flex flex-col gap-3">
        <h3 id={`${ids}-recent`} className={LABEL}>
          Recent activity
        </h3>
        {activities.length === 0 ? (
          <p className="font-body text-sm text-[var(--color-text-secondary)]">Nothing logged with {contact.name} in the last three weeks.</p>
        ) : (
          <ActivityTimeline label={`Activity with ${contact.name}`} activities={activities} deals={state.deals} groupLevel={4} />
        )}
      </section>
    </div>
  )
}

/**
 * Everyone at every account. A row's name opens that person in a Sheet beside the list
 * (`?contact=`, so it is linkable and Back closes it), where a call can be logged. Select rows to
 * reassign their owner in one go.
 */
export function Contacts() {
  const { state, run } = useCrm()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const openContact = useOpenSheet('contact')
  const closeContact = useCloseSheet('contact')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<DataTableSort>({ key: 'name', direction: 'ascending' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOwner, setBulkOwner] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const contactId = params.get('contact')
  const open = contactId ? state.contacts.find(c => c.id === contactId) : undefined

  const needle = query.trim().toLowerCase()
  const filtered = state.contacts.filter(c => {
    if (!needle) return true
    const account = accountById(c.accountId)?.name ?? ''
    return [c.name, c.title, account].some(text => text.toLowerCase().includes(needle))
  })

  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: c => c.name,
      cell: c => (
        <Button variant="link" className="text-left" onClick={() => openContact(c.id)}>
          {c.name}
        </Button>
      ),
    },
    { key: 'title', header: 'Title', sortValue: c => c.title, cell: c => c.title },
    { key: 'account', header: 'Account', sortValue: c => accountById(c.accountId)?.name ?? '', cell: c => accountById(c.accountId)?.name },
    { key: 'owner', header: 'Owner', sortValue: c => repById(c.ownerId).name, cell: c => <Owner ownerId={c.ownerId} /> },
    { key: 'touch', header: 'Last touch', sortValue: c => c.lastTouch, cell: c => formatDate(c.lastTouch) },
  ]

  const sorted = sortRows(filtered, columns.find(c => c.key === sort.key)?.sortValue, sort.direction)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const count = selected.size

  function assign(ownerId: string) {
    if (count === 0) return
    const ids = [...selected]
    const { undo } = run({ type: 'setContactOwner', contactIds: ids, ownerId })
    setBulkOwner('')
    toast({
      tone: 'ok',
      title: `${contactsLabel(ids.length)} assigned to ${repById(ownerId).name}`,
      action: { label: 'Undo', altText: 'Select the same contacts and assign them back.', onAction: undo },
    })
  }

  return (
    <div className="flex max-w-screen-xl flex-col gap-8">
      <PageHeader eyebrow={WORKSPACE} title="Contacts" description="The people at every account, and who on the team owns each." />
      <Search
        ref={searchRef}
        label="Search contacts"
        placeholder="Name, title or account"
        value={query}
        onValueChange={value => {
          setQuery(value)
          setPage(1)
        }}
        className="max-w-xl"
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4 border-y border-[var(--color-border-hairline)] py-3">
          <p role="status" className="basis-full font-body text-sm font-semibold">
            {needle ? `${filtered.length} of ${contactsLabel(state.contacts.length)} match` : contactsLabel(state.contacts.length)}
            <span className="font-normal text-[var(--color-text-secondary)]">
              {count === 0 ? ' · Select contacts to reassign them.' : ` · ${count} selected`}
            </span>
          </p>
          <FormField label="Assign owner" className="min-w-48">
            <Select
              id="contacts-bulk-owner"
              label="Assign owner"
              placeholder="Choose a rep"
              options={OWNER_OPTIONS}
              value={bulkOwner}
              disabled={count === 0}
              onValueChange={assign}
            />
          </FormField>
        </div>
        <DataTable
          caption="Contacts"
          hideCaption
          columns={columns}
          rows={visible}
          getRowId={c => c.id}
          rowHeader="name"
          sort={sort}
          onSortChange={next => {
            setSort(next)
            setPage(1)
          }}
          selectable
          rowLabel={c => c.name}
          selected={selected}
          onSelectedChange={setSelected}
          emptyMessage={
            <EmptyState
              level={2}
              size="sm"
              framed={false}
              icon={<SearchX />}
              title="No contacts match"
              description="Try a shorter name, or clear the search."
              actions={
                <Button
                  onClick={() => {
                    setQuery('')
                    searchRef.current?.focus()
                  }}
                >
                  Clear search
                </Button>
              }
            />
          }
        />
        {sorted.length > PAGE_SIZE ? (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={sorted.length}
            pageSize={PAGE_SIZE}
            label="Pagination, contacts"
          />
        ) : null}
      </div>

      <Sheet
        open={contactId !== null}
        onOpenChange={next => {
          if (!next) closeContact()
        }}
      >
        {contactId !== null ? (
          <SheetContent
            title={open ? open.name : 'Contact not found'}
            description={open ? `${open.title}, ${accountById(open.accountId)?.name ?? ''}` : undefined}
            closeLabel="Close contact"
            className="w-[min(30rem,calc(100vw-1rem))]"
          >
            {open ? (
              <ContactBody key={open.id} contact={open} />
            ) : (
              <p className="font-body text-sm">No contact has the id “{contactId}”.</p>
            )}
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  )
}
