import { describe, expect, it, vi } from 'vitest'
import { NAV } from '../components/shell/Sidebar'
import { buildEntries, rankEntries, type SearchIndex } from './DocsSearch'
import { GUIDELINE_SEARCH } from './guidelines'
import rawIndex from '../../public/search-index.json'
import { siteEntries } from './sites'
import { CATALOG } from '../demo/store/catalog'
import { ACCOUNTS } from '../crm/data'

const index = rawIndex as SearchIndex
const actions = () => ({ go: vi.fn(), copyToken: vi.fn() })
const ids = (query: string, entries = buildEntries(index, actions())) => rankEntries(entries, query).map(command => command.id)

describe('docs search', () => {
  it('has a description for every guideline page in the sidebar, plus the Theme Builder', () => {
    const pages = NAV.find(group => group.title === 'Guidelines')!.items.map(item => item.to).concat('/themes')
    expect(pages.filter(path => !GUIDELINE_SEARCH[path])).toEqual([])
    expect(Object.keys(GUIDELINE_SEARCH).filter(path => !pages.includes(path))).toEqual([])
  })

  it('lists the guideline pages before anything is typed, and works before the index loads', () => {
    expect(ids('')).toEqual(ids('', buildEntries(null, actions())))
    expect(ids('').every(id => id.startsWith('page:'))).toBe(true)
  })

  it('ranks like the MCP search: every word of the query beats one word found often', () => {
    expect(ids('page background')[0]).toBe('token:--color-surface-base')
    expect(ids('confirm delete')[0]).toBe('component:alert-dialog')
    expect(ids('theme builder')[0]).toBe('page:/themes')
  })

  it('keeps at most six results per group', () => {
    const groups = rankEntries(buildEntries(index, actions()), 'variant').map(command => command.group)
    for (const group of new Set(groups)) expect(groups.filter(g => g === group).length).toBeLessThanOrEqual(6)
  })

  it('opens a page, jumps to a prop and copies a token', () => {
    const a = actions()
    const entries = buildEntries(index, a)
    const find = (id: string) => entries.find(entry => entry.command.id === id)!.command
    find('component:button').onSelect()
    find('prop:button:variant').onSelect()
    find('token:--color-surface-base').onSelect()
    expect(a.go.mock.calls).toEqual([['/components/button'], ['/components/button', 'props']])
    expect(a.copyToken).toHaveBeenCalledWith('--color-surface-base')
  })
})

describe('site search: the Hexline store and Corvane', () => {
  const sites = siteEntries()
  const all = (a = actions()) => buildEntries(index, a, sites)
  const groupOf = (query: string) => rankEntries(all(), query).map(command => [command.id, command.group])

  it('has one entry per product, with unique ids', () => {
    for (const product of CATALOG) expect(sites.some(entry => entry.id === `store-product:${product.id}`)).toBe(true)
    expect(new Set(sites.map(entry => entry.id)).size).toBe(sites.length)
  })

  it('finds a product, a category and a store page under "Store"', () => {
    expect(groupOf('bump helmet')).toContainEqual(['store-product:bump-helmet', 'Store'])
    expect(groupOf('optics')).toContainEqual(['store-category:optics', 'Store'])
    expect(groupOf('checkout')).toContainEqual(['store:/store/checkout', 'Store'])
  })

  it('finds CRM pages, accounts, deals and contacts under "CRM"', () => {
    expect(groupOf('pipeline')).toContainEqual(['crm:/crm', 'CRM'])
    expect(groupOf('Vellmark')).toContainEqual(['crm-account:acc-vellmark', 'CRM'])
    expect(sites.filter(entry => entry.id.startsWith('crm-deal:')).length).toBeGreaterThan(0)
    expect(sites.filter(entry => entry.id.startsWith('crm-contact:')).length).toBeGreaterThan(0)
    expect(sites.filter(entry => entry.id.startsWith('crm-account:')).length).toBe(ACCOUNTS.length)
  })

  it('navigates to the product page, the filtered shop, a deal sheet and an account', () => {
    const a = actions()
    const entries = all(a)
    const pick = (id: string) => entries.find(entry => entry.command.id === id)!.command.onSelect()
    const deal = sites.find(entry => entry.id.startsWith('crm-deal:'))!
    pick('store-product:bump-helmet')
    pick('store-category:optics')
    pick(deal.id)
    pick('crm-account:acc-vellmark')
    expect(a.go.mock.calls).toEqual([
      ['/store/shop/bump-helmet'],
      ['/store/shop?category=optics'],
      [`/crm?deal=${deal.id.slice('crm-deal:'.length)}`],
      ['/crm/accounts/acc-vellmark'],
    ])
  })

  it('keeps the empty-query list to the guideline pages, and still ranks components first for component words', () => {
    expect(rankEntries(all(), '').every(command => command.id.startsWith('page:'))).toBe(true)
    expect(rankEntries(all(), 'confirm delete')[0].id).toBe('component:alert-dialog')
  })
})

describe('docs search with an app\'s own commands (Corvane, Halden Console)', () => {
  const app = [
    { id: 'deal-1', label: 'Rotterdam hub rollout', group: 'Deals', keywords: ['Saltmere Foods'], onSelect: () => {} },
    { id: 'page-pipeline', label: 'Pipeline', group: 'Pages', onSelect: () => {} },
  ]
  const entries = buildEntries(index, actions())

  it('lists every app command before the guideline pages when nothing is typed', () => {
    const result = rankEntries(entries, '', app).map(command => command.id)
    expect(result.slice(0, 2)).toEqual(['deal-1', 'page-pipeline'])
    expect(result.slice(2).every(id => id.startsWith('page:'))).toBe(true)
  })

  it('puts matching app commands first, matched on label and keywords, then the site results', () => {
    expect(rankEntries(entries, 'saltmere', app)[0].id).toBe('deal-1')
    const button = rankEntries(entries, 'button', app).map(command => command.id)
    expect(button).not.toContain('deal-1')
    expect(button).toContain('component:button')
  })
})
