import { useEffect, type ReactNode } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Building2, Mail } from 'lucide-react'
import { Avatar } from '../../components/atoms/avatar/Avatar'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { IconButton } from '../../components/atoms/icon-button/IconButton'
import { Breadcrumbs } from '../../components/molecules/breadcrumbs/Breadcrumbs'
import { EmptyState } from '../../components/molecules/empty-state/EmptyState'
import { List, ListItem } from '../../components/molecules/list-item/ListItem'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/molecules/tabs/Tabs'
import { formatEuros } from '../money'
import { ActivityTimeline } from '../ActivityTimeline'
import { accountById, repById } from '../data'
import { formatDate } from '../dates'
import { StageBadge } from '../DealBits'
import { dealValue } from '../model'
import { crmLink, useOpenSheet } from '../navigation'
import { useCrm } from '../store'
import { HEALTH, openPipeline } from './Accounts'

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-label)]">{term}</dt>
      <dd className="font-body text-base">{children}</dd>
    </div>
  )
}

/**
 * One account: its key facts, then its people, its deals and its activity under tabs. A deal row
 * opens the deal sheet over this page; an unknown id is a not-found state inside the shell.
 */
export function AccountDetail() {
  const { id = '' } = useParams()
  const { state } = useCrm()
  const openDeal = useOpenSheet('deal')
  const account = accountById(id)

  useEffect(() => {
    document.title = account ? `Corvane — ${account.name}` : 'Corvane — account not found'
  }, [account])

  if (!account) {
    return (
      <div className="flex max-w-screen-md flex-col gap-8">
        <Breadcrumbs items={[{ label: 'Accounts', href: '/crm/accounts' }, { label: 'Not found' }]} renderLink={crmLink} />
        <h1 className="font-display text-2xl font-semibold">Account not found</h1>
        <EmptyState
          level={2}
          icon={<Building2 />}
          title="No account has this id"
          description={`Nothing in Corvane is called “${id}”. It may have been mistyped.`}
          actions={
            <Button asChild>
              <RouterLink to="/crm/accounts">All accounts</RouterLink>
            </Button>
          }
        />
      </div>
    )
  }

  const contacts = state.contacts.filter(c => c.accountId === account.id)
  const deals = state.deals.filter(d => d.accountId === account.id)
  const activities = state.activities.filter(a => a.accountId === account.id)

  return (
    <div className="flex max-w-screen-lg flex-col gap-8">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Accounts', href: '/crm/accounts' }, { label: account.name }]} renderLink={crmLink} />}
        eyebrow={account.industry}
        title={account.name}
        description={`${account.city} · ${account.employees.toLocaleString('en-GB')} employees`}
      />
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Fact term="Owner">{repById(account.ownerId).name}</Fact>
        <Fact term="Health">
          <Badge emphasis="subtle" tone={HEALTH[account.health].tone}>
            {HEALTH[account.health].label}
          </Badge>
        </Fact>
        <Fact term="Open pipeline">
          <span className="font-mono tabular-nums">{formatEuros(openPipeline(account.id, state.deals))}</span>
        </Fact>
        <Fact term="Deals">{deals.length}</Fact>
      </dl>

      <Tabs defaultValue="contacts" variant="line">
        <TabsList aria-label={`${account.name} sections`}>
          <TabsTrigger value="contacts" count={contacts.length}>
            Contacts
          </TabsTrigger>
          <TabsTrigger value="deals" count={deals.length}>
            Deals
          </TabsTrigger>
          <TabsTrigger value="activity" count={activities.length}>
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contacts" className="pt-4">
          <List>
            {contacts.map(contact => (
              <ListItem
                key={contact.id}
                media={<Avatar name={contact.name} size="md" aria-hidden="true" />}
                title={contact.name}
                description={`${contact.title} · ${contact.phone}`}
                meta={`Last touch ${formatDate(contact.lastTouch)}`}
                href={`/crm/contacts?contact=${contact.id}`}
                renderLink={crmLink}
                actions={
                  <IconButton asChild label={`Email ${contact.name}`} variant="ghost" size="sm">
                    <a href={`mailto:${contact.email}`}>
                      <Mail aria-hidden="true" className="h-4 w-4" />
                    </a>
                  </IconButton>
                }
              />
            ))}
          </List>
        </TabsContent>
        <TabsContent value="deals" className="pt-4">
          {deals.length === 0 ? (
            <p className="font-body text-sm text-[var(--color-text-secondary)]">No deals with this account yet.</p>
          ) : (
            <List>
              {deals.map(deal => (
                <ListItem
                  key={deal.id}
                  title={deal.name}
                  description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <StageBadge stage={deal.stage} /> Closes {formatDate(deal.closeDate)} · {repById(deal.ownerId).name}
                    </span>
                  }
                  meta={formatEuros(dealValue(deal))}
                  onActivate={() => openDeal(deal.id)}
                />
              ))}
            </List>
          )}
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          {activities.length === 0 ? (
            <p className="font-body text-sm text-[var(--color-text-secondary)]">Nothing logged with this account yet.</p>
          ) : (
            <ActivityTimeline label={`Activity with ${account.name}`} activities={activities} deals={state.deals} groupLevel={2} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
