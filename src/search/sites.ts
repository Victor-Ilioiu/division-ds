import { CATALOG, CATEGORIES } from '../demo/store/catalog'
import { JOURNAL_POSTS } from '../demo/content/journal'
import { ACCOUNTS, seedData } from '../crm/data'
import { STAGE_LABEL } from '../crm/model'

/**
 * What the site search finds outside the docs: the Hexline store (pages, categories, products,
 * field notes) and Corvane, the CRM demo (pages, deals, accounts, contacts). Plain data, read
 * from the demos' own catalogue and seed data so a renamed product cannot go stale here.
 *
 * DocsSearch loads this file with a dynamic `import()`, the first time it loads the component
 * index, so neither the catalogue nor the CRM's seed data lands in a chunk the docs pages load.
 * The page lists are written out rather than read from `src/demo/routes.ts` and
 * `src/crm/routes.ts`, because the store's route file imports its homepage eagerly.
 */
export type SiteEntry = {
  id: string
  label: string
  description?: string
  /** The palette group the result sits under. */
  group: 'Store' | 'CRM'
  /** Where selecting it goes (a path inside the router, query string included). */
  path: string
  /** Extra words it should be found by, beyond the label and description. */
  keywords: string
  /** Pages before records on a tied score. */
  kind: 'page' | 'record'
}

const STORE_PAGES: { path: string; label: string; description: string; keywords: string }[] = [
  { path: '/store', label: 'Hexline store home', description: 'The Hexline store: offers, new arrivals and the operator kit.', keywords: 'hexline store shop home demo ecommerce' },
  { path: '/store/shop', label: 'Shop', description: 'The whole Hexline catalogue, with filters and sorting.', keywords: 'shop catalogue catalog products filters browse' },
  { path: '/store/cart', label: 'Cart', description: 'Your Hexline cart.', keywords: 'cart basket bag' },
  { path: '/store/checkout', label: 'Checkout', description: 'The three-step checkout. It never takes payment.', keywords: 'checkout pay order steps' },
  { path: '/store/journal', label: 'Field notes', description: 'Hexline guides: care, batteries, choosing optics.', keywords: 'journal blog articles guides field notes' },
  { path: '/store/care', label: 'Care plans', description: 'Hexline care plans and their prices.', keywords: 'care pricing plans service repair' },
  { path: '/store/about', label: 'About Hexline', description: 'Who runs the store, and the house rules.', keywords: 'about company rules' },
  { path: '/store/sign-in', label: 'Sign in', description: 'Sign in to your Hexline account with a code.', keywords: 'sign in login log in account auth' },
  { path: '/store/create-account', label: 'Create an account', description: 'Make a Hexline account.', keywords: 'sign up register create account' },
  { path: '/store/account/orders', label: 'Your orders', description: 'Orders on your Hexline account.', keywords: 'orders history account' },
  { path: '/store/ops', label: 'Store back office', description: 'The dashboard that runs the store: sales and stock.', keywords: 'ops back office admin dashboard inventory stock' },
  { path: '/store/ops/inventory', label: 'Inventory', description: 'Stock levels for every product in the back office.', keywords: 'inventory stock ops admin table' },
  { path: '/store/status/error', label: 'Error states', description: 'How the store shows an error, a full-page failure and an offline state.', keywords: 'error status failure offline' },
]

const CRM_PAGES: { path: string; label: string; description: string; keywords: string }[] = [
  { path: '/crm', label: 'Pipeline', description: 'Corvane: every open deal, as a table or a board by stage.', keywords: 'corvane crm pipeline deals board kanban stages dashboard' },
  { path: '/crm/accounts', label: 'Accounts', description: 'Every company Corvane tracks, with its health and owner.', keywords: 'accounts companies customers' },
  { path: '/crm/contacts', label: 'Contacts', description: 'The people at each account.', keywords: 'contacts people' },
  { path: '/crm/activity', label: 'Activity', description: 'Calls, emails, meetings and notes, newest first.', keywords: 'activity feed timeline calls emails meetings notes' },
  { path: '/crm/forecast', label: 'Forecast', description: 'The quarter against its goal, with charts.', keywords: 'forecast quarter goal revenue charts' },
  { path: '/crm/about', label: 'About Corvane', description: 'What the CRM demo is and what it shows.', keywords: 'about corvane' },
]

/** Every store and CRM entry the site search ranks. */
export function siteEntries(): SiteEntry[] {
  const store: SiteEntry[] = [
    ...STORE_PAGES.map(page => ({ id: `store:${page.path}`, group: 'Store' as const, kind: 'page' as const, ...page })),
    ...CATEGORIES.map(category => ({
      id: `store-category:${category.id}`,
      label: category.label,
      description: `Hexline category: ${category.label.toLowerCase()}.`,
      group: 'Store' as const,
      path: `/store/shop?category=${category.id}`,
      keywords: `category ${category.id}`,
      kind: 'page' as const,
    })),
    ...CATALOG.map(product => ({
      id: `store-product:${product.id}`,
      label: product.name,
      description: product.description,
      group: 'Store' as const,
      path: `/store/shop/${product.id}`,
      keywords: `product ${CATEGORIES.find(c => c.id === product.category)?.label ?? ''}`,
      kind: 'record' as const,
    })),
    ...JOURNAL_POSTS.map(post => ({
      id: `store-journal:${post.slug}`,
      label: post.title,
      description: post.summary,
      group: 'Store' as const,
      path: `/store/journal/${post.slug}`,
      keywords: `field note guide ${post.tags.join(' ')}`,
      kind: 'record' as const,
    })),
  ]

  const { deals, contacts } = seedData()
  const accountName = (id: string) => ACCOUNTS.find(account => account.id === id)?.name ?? ''
  const crm: SiteEntry[] = [
    ...CRM_PAGES.map(page => ({ id: `crm:${page.path}`, group: 'CRM' as const, kind: 'page' as const, ...page })),
    ...deals.map(deal => ({
      id: `crm-deal:${deal.id}`,
      label: deal.name,
      description: `Deal with ${accountName(deal.accountId)}, ${STAGE_LABEL[deal.stage].toLowerCase()}.`,
      group: 'CRM' as const,
      path: `/crm?deal=${deal.id}`,
      keywords: `deal ${accountName(deal.accountId)} ${deal.stage}`,
      kind: 'record' as const,
    })),
    ...ACCOUNTS.map(account => ({
      id: `crm-account:${account.id}`,
      label: account.name,
      description: `Account: ${account.industry}, ${account.city}.`,
      group: 'CRM' as const,
      path: `/crm/accounts/${account.id}`,
      keywords: `account company ${account.industry} ${account.city}`,
      kind: 'record' as const,
    })),
    ...contacts.map(contact => ({
      id: `crm-contact:${contact.id}`,
      label: contact.name,
      description: `${contact.title} at ${accountName(contact.accountId)}.`,
      group: 'CRM' as const,
      path: `/crm/contacts?contact=${contact.id}`,
      keywords: `contact person ${contact.title} ${accountName(contact.accountId)}`,
      kind: 'record' as const,
    })),
  ]
  return [...store, ...crm]
}
