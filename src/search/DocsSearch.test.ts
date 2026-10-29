import { describe, expect, it, vi } from 'vitest'
import { NAV } from '../components/shell/Sidebar'
import { buildEntries, rankEntries, type SearchIndex } from './DocsSearch'
import { GUIDELINE_SEARCH } from './guidelines'
import rawIndex from '../../public/search-index.json'

const index = rawIndex as SearchIndex
const actions = () => ({ go: vi.fn(), copyToken: vi.fn() })
const ids = (query: string, entries = buildEntries(index, actions())) => rankEntries(entries, query).map(command => command.id)

describe('docs search', () => {
  it('has a description for every guideline page in the sidebar', () => {
    const pages = NAV.find(group => group.title === 'Guidelines')!.items.map(item => item.to)
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
    expect(ids('theme builder')[0]).toBe('page:/guidelines/theme')
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
