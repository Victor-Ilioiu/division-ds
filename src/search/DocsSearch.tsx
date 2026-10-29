import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CommandPalette, type Command } from '../components/organisms/command-palette/CommandPalette'
import { Kbd } from '../components/atoms/kbd/Kbd'
import { useToast } from '../components/molecules/toast/Toast'
import { NAV } from '../components/shell/Sidebar'
import { publicPath } from '../base-path'
import { scorer } from '../../scripts/lib/search-score.mjs'
import { GUIDELINE_SEARCH } from './guidelines'

/** public/search-index.json, written by scripts/build-agent-docs.mjs. */
export type SearchIndex = {
  components: { name: string; slug: string; tier: string; summary: string; useWhen: string; also: string[]; props: { name: string; description: string }[] }[]
  tokens: { name: string; layer: string; use: string }[]
}

/** One searchable thing: the command the palette draws, and the text the scorer ranks it on. */
export type SearchEntry = { command: Command; title: string; body: string; props?: string; propNames?: string; rank: number }

const PER_GROUP = 6

/** Every entry, ranked by the same scorer the MCP `search` tool uses. With no query: the pages. */
export function rankEntries(entries: readonly SearchEntry[], query: string): Command[] {
  if (!query.trim()) return entries.filter(entry => entry.rank === 0).map(entry => entry.command)
  const score = scorer(query)
  const scored = entries
    .map(entry => ({ entry, score: score(entry.title, entry.body, entry.props, entry.propNames) }))
    .filter(hit => hit.score > 0)
    // Higher score first; on a tie, pages before components before props before tokens.
    .sort((a, b) => b.score - a.score || a.entry.rank - b.entry.rank || a.entry.command.label.localeCompare(b.entry.command.label))
  const perGroup = new Map<string, number>()
  return scored
    .filter(({ entry }) => {
      const group = entry.command.group ?? ''
      const seen = perGroup.get(group) ?? 0
      perGroup.set(group, seen + 1)
      return seen < PER_GROUP
    })
    .map(({ entry }) => entry.command)
}

type Actions = { go: (path: string, hash?: string) => void; copyToken: (name: string) => void }

/** The pages from the sidebar, plus every component, prop and token from the index once loaded. */
export function buildEntries(index: SearchIndex | null, { go, copyToken }: Actions): SearchEntry[] {
  const pages: SearchEntry[] = NAV.filter(group => group.title === 'Guidelines').flatMap(group =>
    group.items.map(item => {
      const about = GUIDELINE_SEARCH[item.to]
      return {
        command: { id: `page:${item.to}`, label: item.label, description: about?.description, group: 'Guidelines', onSelect: () => go(item.to) },
        title: item.label,
        body: `${about?.description ?? ''} ${about?.keywords ?? ''}`,
        rank: 0,
      }
    })
  )
  if (!index) return pages
  const components: SearchEntry[] = index.components.map(c => ({
    command: { id: `component:${c.slug}`, label: c.name, description: c.summary, group: 'Components', onSelect: () => go(`/components/${c.slug}`) },
    title: `${c.name} ${c.also.join(' ')}`,
    body: `${c.summary} ${c.useWhen}`,
    props: c.props.map(p => `${p.name} ${p.description}`).join(' '),
    propNames: c.props.map(p => p.name).join(' '),
    rank: 1,
  }))
  const props: SearchEntry[] = index.components.flatMap(c =>
    c.props.map(p => ({
      command: { id: `prop:${c.slug}:${p.name}`, label: `${c.name} › ${p.name}`, description: p.description, group: 'Props', onSelect: () => go(`/components/${c.slug}`, 'props') },
      title: `${c.name} ${p.name}`,
      body: p.description,
      rank: 2,
    }))
  )
  const tokens: SearchEntry[] = index.tokens.map(t => ({
    command: { id: `token:${t.name}`, label: t.name, description: t.use, group: 'Tokens', onSelect: () => copyToken(t.name) },
    title: t.name,
    body: t.use,
    rank: 3,
  }))
  return [...pages, ...components, ...props, ...tokens]
}

let loaded: Promise<SearchIndex> | null = null
const loadIndex = () => (loaded ??= fetch(publicPath('/search-index.json')).then(response => {
  if (!response.ok) throw new Error(`search index: ${response.status}`)
  return response.json() as Promise<SearchIndex>
}).catch(error => {
  loaded = null
  throw error
}))

/** True when a keystroke lands in something the user is typing into. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** The docs top bar's search: a button that opens the CommandPalette over pages, components, props
 *  and tokens. Ctrl+K (Cmd+K) or / opens it. The index is fetched the first time it opens. */
export function DocsSearch() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const navigate = useNavigate()
  // The CommandPalette page's live example owns Ctrl+K, the shortcut it documents; / still opens this.
  const ctrlK = !useLocation().pathname.endsWith('/components/command-palette')
  const { toast } = useToast()
  const trigger = useRef<HTMLButtonElement>(null)

  const go = useCallback(
    (path: string, hash?: string) => {
      // The page being left can have the same section (every component page has #props), so the
      // jump waits for one that is not it.
      const old = hash ? document.getElementById(hash) : null
      navigate(path)
      if (!hash) return
      // The page is a lazy chunk: wait for the section to exist, then bring it into view.
      const started = performance.now()
      const find = () => {
        const target = document.getElementById(hash)
        if (target && target !== old) target.scrollIntoView({ block: 'start' })
        else if (performance.now() - started < 3000) requestAnimationFrame(find)
      }
      requestAnimationFrame(find)
    },
    [navigate]
  )
  const copyToken = useCallback(
    (name: string) => {
      const text = `var(${name})`
      navigator.clipboard.writeText(text).then(
        () => toast({ title: `Copied ${text}`, tone: 'ok' }),
        () => toast({ title: `Could not copy ${text}`, description: 'Your browser blocked the clipboard. Select the name and copy it by hand.', tone: 'warning' })
      )
    },
    [toast]
  )

  // Fetched in the background once the page is idle, and again on hover or focus of the button if
  // that has not happened yet, so the index is normally there before the first word is typed.
  const prefetch = useCallback(() => {
    loadIndex().then(setIndex, () => {})
  }, [])
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(prefetch)
    return () => cancel(handle)
  }, [prefetch])

  useEffect(() => {
    if (!open || index) return
    let live = true
    loadIndex().then(
      result => live && setIndex(result),
      () => live && toast({ title: 'Search could only load the guideline pages', description: 'The component index did not load. Try again in a moment.', tone: 'warning' })
    )
    return () => {
      live = false
    }
  }, [open, index, toast])

  // "/" opens search from anywhere that is not a text field. Ctrl+K is the palette's own shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || typing(event.target)) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const entries = useMemo(() => buildEntries(index, { go, copyToken }), [index, go, copyToken])
  const commands = useMemo(() => entries.map(entry => entry.command), [entries])
  const filter = useCallback((_: readonly Command[], query: string) => rankEntries(entries, query), [entries])
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-keyshortcuts={ctrlK ? 'Control+K Meta+K /' : '/'}
        className="group flex min-h-[36px] min-w-[36px] items-center gap-2 border border-[var(--color-border-control)] bg-[var(--color-surface-base)] px-2 text-[var(--color-text-secondary)] transition-control hover:border-[var(--component-control-border-hover)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] sm:w-72 sm:px-3"
      >
        <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-left sm:font-body sm:text-sm">Search the docs</span>
        <Kbd aria-hidden="true" className="hidden sm:inline-flex">
          {ctrlK ? (mac ? '⌘K' : 'Ctrl K') : '/'}
        </Kbd>
      </button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        filter={filter}
        shortcut={ctrlK}
        label="Search the docs"
        searchLabel="Search components, guidelines, props and tokens"
        placeholder="Search components, guidelines, props, tokens…"
        emptyMessage={index ? 'Nothing matches. Try a broader word, like “form” or “background”.' : 'Loading the component index…'}
      />
    </>
  )
}
