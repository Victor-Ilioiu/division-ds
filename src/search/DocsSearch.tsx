import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CommandPalette, type Command } from '../components/organisms/command-palette/CommandPalette'
import { Kbd } from '../components/atoms/kbd/Kbd'
import { Button } from '../components/atoms/button/Button'
import { useToast } from '../components/molecules/toast/Toast'
import { NAV } from '../components/shell/Sidebar'
import { publicPath } from '../base-path'
import { scorer } from '../../scripts/lib/search-score.mjs'
import { GUIDELINE_SEARCH } from './guidelines'
import type { SiteEntry } from './sites'

/** public/search-index.json, written by scripts/build-agent-docs.mjs. */
export type SearchIndex = {
  components: { name: string; slug: string; tier: string; summary: string; useWhen: string; also: string[]; props: { name: string; description: string }[] }[]
  tokens: { name: string; layer: string; use: string }[]
}

/** One searchable thing: the command the palette draws, and the text the scorer ranks it on. */
export type SearchEntry = { command: Command; title: string; body: string; props?: string; propNames?: string; rank: number }

const PER_GROUP = 6

/** Every entry, ranked by the same scorer the MCP `search` tool uses. With no query: the pages. */
export function rankEntries(entries: readonly SearchEntry[], query: string, app: readonly Command[] = []): Command[] {
  if (!query.trim()) return [...app, ...entries.filter(entry => entry.rank === 0).map(entry => entry.command)]
  const score = scorer(query)
  // The current app's own commands (Corvane's deals, the console's actions) come first, every match.
  const own = app
    .map(command => ({ command, score: score(command.label, `${command.group ?? ''} ${(command.keywords ?? []).join(' ')}`) }))
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(hit => hit.command)
  const scored = entries
    .map(entry => ({ entry, score: score(entry.title, entry.body, entry.props, entry.propNames) }))
    .filter(hit => hit.score > 0)
    // Higher score first; on a tie, pages before components before props before tokens.
    .sort((a, b) => b.score - a.score || a.entry.rank - b.entry.rank || a.entry.command.label.localeCompare(b.entry.command.label))
  const perGroup = new Map<string, number>()
  const rest = scored
    .filter(({ entry }) => {
      const group = entry.command.group ?? ''
      const seen = perGroup.get(group) ?? 0
      perGroup.set(group, seen + 1)
      return seen < PER_GROUP
    })
    .map(({ entry }) => entry.command)
  return [...own, ...rest]
}

type Actions = { go: (path: string, hash?: string) => void; copyToken: (name: string) => void }

/** The pages from the sidebar, plus every component, prop and token from the index once loaded,
 *  plus the Hexline store and Corvane CRM entries (`sites.ts`) once those are loaded. */
export function buildEntries(index: SearchIndex | null, { go, copyToken }: Actions, sites: readonly SiteEntry[] | null = null): SearchEntry[] {
  // The Theme Builder is reached from the site header, not the docs sidebar, so it is listed here.
  const guidelineItems = [...NAV.filter(group => group.title === 'Guidelines').flatMap(group => group.items), { to: '/themes', label: 'Theme Builder' }]
  const pages: SearchEntry[] = [guidelineItems].flatMap(items =>
    items.map(item => {
      const about = GUIDELINE_SEARCH[item.to]
      return {
        command: { id: `page:${item.to}`, label: item.label, description: about?.description, group: 'Guidelines', onSelect: () => go(item.to) },
        title: item.label,
        body: `${about?.description ?? ''} ${about?.keywords ?? ''}`,
        rank: 0,
      }
    })
  )
  // Store and CRM pages rank with components on a tie; their records (products, deals, people)
  // with props.
  const site: SearchEntry[] = (sites ?? []).map(entry => ({
    command: { id: entry.id, label: entry.label, description: entry.description, group: entry.group, onSelect: () => go(entry.path) },
    title: entry.label,
    body: `${entry.description ?? ''} ${entry.keywords}`,
    rank: entry.kind === 'page' ? 1 : 2,
  }))
  if (!index) return [...pages, ...site]
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
  return [...pages, ...components, ...site, ...props, ...tokens]
}

let sitesLoaded: Promise<SiteEntry[]> | null = null
const loadSites = () => (sitesLoaded ??= import('./sites').then(module => module.siteEntries()).catch(error => {
  sitesLoaded = null
  throw error
}))

let loaded: Promise<SearchIndex> | null = null
export const loadSearchIndex = () => (loaded ??= fetch(publicPath('/search-index.json')).then(response => {
  if (!response.ok) throw new Error(`search index: ${response.status}`)
  return response.json() as Promise<SearchIndex>
}).catch(error => {
  loaded = null
  throw error
}))

/** True when a keystroke lands in something the user is typing into. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** The one search in every header (docs, homepage, Hexline store, Corvane, Halden Console): a
 *  button that opens the CommandPalette over guideline pages, components, props, tokens, and the
 *  store's and the CRM's pages and records. Ctrl+K (Cmd+K) or / opens it. The index is fetched the
 *  first time it opens. `compact` keeps the button icon-only at every width, for a
 *  header with no room for the word. `commands` are the current app's own (Corvane's deals and
 *  accounts, the console's sites, alerts and actions): listed first, so one button and one Ctrl+K
 *  replace the palette each of those shells used to have. The trigger is a Button `sm`, the
 *  height of the other header controls. */
/** `open`/`onOpenChange` make it controlled: a shell that needs a second way in (Hexline's menu
 *  sheet, where the header has no room for the button) lifts the state and opens this same
 *  instance, so there is still one palette and one owner of Ctrl+K and /. */
export function DocsSearch({
  compact = false,
  labelClassName,
  commands: appCommands = [],
  open: openProp,
  onOpenChange,
}: {
  compact?: boolean
  labelClassName?: string
  commands?: readonly Command[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  // Where the word and the shortcut show: from `sm` by default; a header with a container query
  // (Hexline's) can pass its own breakpoint, e.g. 'hidden @4xl:inline-flex'.
  const shown = compact ? 'hidden' : (labelClassName ?? 'hidden sm:inline-flex')
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [sites, setSites] = useState<SiteEntry[] | null>(null)
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
    loadSearchIndex().then(setIndex, () => {})
    loadSites().then(setSites, () => {})
  }, [])
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(prefetch)
    return () => cancel(handle)
  }, [prefetch])

  useEffect(() => {
    if (open && !sites) loadSites().then(setSites, () => {})
  }, [open, sites])

  useEffect(() => {
    if (!open || index) return
    let live = true
    loadSearchIndex().then(
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
  }, [setOpen])

  const entries = useMemo(() => buildEntries(index, { go, copyToken }, sites), [index, go, copyToken, sites])
  const commands = useMemo(() => [...appCommands, ...entries.map(entry => entry.command)], [appCommands, entries])
  const filter = useCallback((_: readonly Command[], query: string) => rankEntries(entries, query, appCommands), [entries, appCommands])
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <Button
        ref={trigger}
        variant="secondary"
        size="sm"
        iconStart={<Search />}
        onClick={() => setOpen(true)}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-label="Search the site"
        aria-keyshortcuts={ctrlK ? 'Control+K Meta+K /' : '/'}
      >
        <span className={shown}>Search</span>
        {/* Small and cut, pulled 6px toward the button's corner so it sits 6px from the right and
            bottom edges and its diagonal runs parallel to the button's cut. The translate undoes
            the button's optical cap shift, which would otherwise push the cap 1.5px low. */}
        <Kbd aria-hidden="true" size="sm" cut className={`${shown} ml-2 -mr-1.5 -translate-y-[var(--cap-shift,0px)]`}>
          {ctrlK ? (mac ? '⌘K' : 'Ctrl K') : '/'}
        </Kbd>
      </Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        filter={filter}
        shortcut={ctrlK}
        label="Search the site"
        searchLabel="Search components, guidelines, tokens, the store and the CRM"
        placeholder="Search components, tokens, products, deals…"
        emptyMessage={index ? 'Nothing matches. Try a broader word, like “form” or “background”.' : 'Loading the component index…'}
      />
    </>
  )
}
