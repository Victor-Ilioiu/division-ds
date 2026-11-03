import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { Terminal as XTerm, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { cn } from '../../../lib/cn'
import { Badge, type BadgeProps } from '../../atoms/badge/Badge'
import { Kbd } from '../../atoms/kbd/Kbd'
import { Panel } from '../../atoms/panel/Panel'

export type TerminalStatus = 'connecting' | 'live' | 'reconnecting' | 'exited' | 'error'

export type TerminalHandle = {
  /** Sends output to the terminal, without a React render. The callback runs once it is parsed: use it for flow control. */
  write(data: string | Uint8Array, callback?: () => void): void
  /** Clears the screen and the scrollback, keeping the cursor's line. */
  clear(): void
  /** Moves keyboard focus into the terminal. */
  focus(): void
  /** Fits the grid to the container now. Resizing already does this; use it after a change no resize reports. */
  fit(): void
}

export type TerminalProps = {
  /** What this session is ("Build agent"). Names the terminal and its status announcements. */
  label: string
  /** The connection's state, shown as a word and a tone, and announced. */
  status: TerminalStatus
  /** With status exited: 0 reads neutral, anything else hostile. The code is shown. */
  exitCode?: number
  /** Detail beside the status: the reason for an error, the attempt while reconnecting. */
  statusMessage?: string
  /** Blocks input and never fires onData. Selection and copying keep working. */
  readOnly?: boolean
  /** What Shift+Enter sends. xterm sends Enter's CR for both; newline sends ESC CR instead, which chat programs such as Claude Code read as a new line. */
  shiftEnter?: 'newline' | 'default'
  /** Reads output aloud through xterm's live region. Off by default: only the status is announced. */
  announceOutput?: boolean
  /** Text the person typed or pasted, and terminal replies, for the app to send to the process. */
  onData?: (data: string) => void
  /** The grid's new size. Debounced by 100ms, and only when cols or rows changed. */
  onResize?: (size: { cols: number; rows: number }) => void
  /** Lines kept above the screen. */
  scrollback?: number
  /** Merged onto the frame. Set the height here. */
  className?: string
  ref?: Ref<TerminalHandle>
}

const RESIZE_DEBOUNCE_MS = 100
const FONT_SIZE = 14
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const THEME_TOKENS: Record<string, string> = {
  background: '--color-surface-base',
  foreground: '--color-text-primary',
  cursor: '--color-text-primary',
  cursorAccent: '--color-surface-base',
  selectionBackground: '--color-terminal-selection',
  scrollbarSliderBackground: '--color-border-hairline-strong',
  scrollbarSliderHoverBackground: '--color-border-control',
  scrollbarSliderActiveBackground: '--color-border-selection',
  black: '--color-terminal-black',
  red: '--color-terminal-red',
  green: '--color-terminal-green',
  yellow: '--color-terminal-yellow',
  blue: '--color-terminal-blue',
  magenta: '--color-terminal-magenta',
  cyan: '--color-terminal-cyan',
  white: '--color-terminal-white',
  brightBlack: '--color-terminal-bright-black',
  brightRed: '--color-terminal-bright-red',
  brightGreen: '--color-terminal-bright-green',
  brightYellow: '--color-terminal-bright-yellow',
  brightBlue: '--color-terminal-bright-blue',
  brightMagenta: '--color-terminal-bright-magenta',
  brightCyan: '--color-terminal-bright-cyan',
  brightWhite: '--color-terminal-bright-white',
}

/** xterm paints with resolved values, so tokens are read from the page. */
function readTheme(element: Element): ITheme {
  const style = getComputedStyle(element)
  const theme: Record<string, string> = {}
  for (const [key, token] of Object.entries(THEME_TOKENS)) {
    const value = style.getPropertyValue(token).trim()
    if (value) theme[key] = value
  }
  return theme
}

function openLink(uri: string) {
  if (/^https?:\/\//i.test(uri)) window.open(uri, '_blank', 'noopener,noreferrer')
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The way out of a terminal that keeps Tab for itself: the next tab stop in its dialog or page. */
function moveFocusOut(from: HTMLElement) {
  const scope = from.closest('[role="dialog"], [role="alertdialog"]') ?? document
  const stops = [...scope.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    element => element === from || (element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'))
  )
  const next = stops[stops.indexOf(from) + 1] ?? stops.find(element => element !== from)
  if (next && next !== from) next.focus()
  else from.blur()
}

function describeStatus(status: TerminalStatus, exitCode?: number): { word: string; tone: BadgeProps['tone'] } {
  switch (status) {
    case 'connecting':
      return { word: 'Connecting', tone: 'info' }
    case 'reconnecting':
      return { word: 'Reconnecting', tone: 'info' }
    case 'live':
      return { word: 'Live', tone: 'ok' }
    case 'error':
      return { word: 'Error', tone: 'hostile' }
    case 'exited':
      return { word: exitCode === undefined ? 'Exited' : `Exited, code ${exitCode}`, tone: exitCode ? 'hostile' : 'neutral' }
  }
}

/**
 * A live terminal session: xterm.js in the system's frame. It renders output and reports input,
 * and knows nothing about what is on the other end; the app owns the connection.
 *
 * Output goes through the ref's write(), so a fast stream never renders React. xterm itself keeps
 * a scrolled-up reader in place and follows the end otherwise, and keeps its buffer through every
 * status and theme change.
 *
 * Screen reader mode is always on, for the navigable rows it builds, but its live region is set to
 * off unless announceOutput asks for it: at its default it reads every line assertively. The
 * status has its own quiet region.
 *
 * Not in the organisms barrel: xterm is a few hundred kB, and this file imports it statically.
 */
export function Terminal({
  label,
  status,
  exitCode,
  statusMessage,
  readOnly = false,
  shiftEnter = 'default',
  announceOutput = false,
  onData,
  onResize,
  scrollback = 5000,
  className,
  ref,
}: TerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<() => void>(() => {})
  const latest = useRef({ onData, onResize, readOnly, shiftEnter })

  // Before the mount effect below, so the terminal's first events see the current callbacks.
  useLayoutEffect(() => {
    latest.current = { onData, onResize, readOnly, shiftEnter }
    if (termRef.current) termRef.current.options.disableStdin = readOnly
  })

  // A layout effect so a parent's own effects can write() on their first run. StrictMode runs this
  // twice with a full dispose between, and the parent's effects re-run with it, so nothing doubles.
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    let alive = true
    const fontFamily = getComputedStyle(host).fontFamily || 'monospace'
    const motion = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null

    const term = new XTerm({
      allowProposedApi: true, // the unicode 11 width tables
      cursorBlink: !motion?.matches,
      disableStdin: latest.current.readOnly,
      fontFamily,
      fontSize: FONT_SIZE,
      linkHandler: { activate: (_event, uri) => openLink(uri) },
      minimumContrastRatio: 4.5, // colours an app sends as RGB are not tokens, and may not be readable
      screenReaderMode: true,
      scrollback,
      theme: readTheme(host),
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'
    term.loadAddon(new WebLinksAddon((_event, uri) => openLink(uri)))

    term.attachCustomKeyEventHandler(event => {
      // xterm sees keypress and keyup too: all three are held back, or it would still send a CR.
      if (
        latest.current.shiftEnter === 'newline' &&
        !latest.current.readOnly &&
        event.key === 'Enter' &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.isComposing &&
        event.keyCode !== 229
      ) {
        if (event.type === 'keydown') {
          event.preventDefault()
          latest.current.onData?.('\x1b\r')
        }
        return false
      }
      if (event.type !== 'keydown') return true
      const ctrl = event.ctrlKey && !event.altKey && !event.metaKey
      const key = event.key.toLowerCase()
      if (ctrl && event.shiftKey && key === 'l') {
        event.preventDefault()
        if (term.textarea) moveFocusOut(term.textarea)
        return false
      }
      if (ctrl && key === 'c' && term.hasSelection()) {
        event.preventDefault()
        const clear = !event.shiftKey // a second Ctrl+C is an interrupt again
        navigator.clipboard?.writeText(term.getSelection()).then(() => { if (clear) term.clearSelection() }, () => {})
        return false
      }
      if (ctrl && event.shiftKey && key === 'c') {
        event.preventDefault() // nothing selected: still not the browser's inspector
        return false
      }
      // Left to the browser, which fires the paste event xterm reads.
      if (ctrl && key === 'v') return false
      // Nothing is listening for these in read only, so they keep their browser meaning.
      if (latest.current.readOnly && (event.key === 'Tab' || event.key === 'Escape')) return false
      return true
    })

    let lastSize: { cols: number; rows: number } | null = null
    let resizeTimer: number | undefined
    const scheduleReport = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (lastSize?.cols === term.cols && lastSize.rows === term.rows) return
        lastSize = { cols: term.cols, rows: term.rows }
        latest.current.onResize?.(lastSize)
      }, RESIZE_DEBOUNCE_MS)
    }
    // A hidden container measures 0, and fitting to that would collapse the grid.
    const fit = () => {
      if (!alive || !host.clientWidth || !host.clientHeight) return
      fitAddon.fit()
      scheduleReport()
    }
    fitRef.current = fit

    term.onData(data => {
      if (!latest.current.readOnly) latest.current.onData?.(data)
    })

    term.open(host)
    termRef.current = term
    fit()

    // Measured before the font arrived, the grid is the fallback font's. Changing the option is
    // what makes xterm measure again, and it ignores a change to the same value.
    const remeasure = () => {
      if (!alive) return
      term.options.fontFamily = 'monospace'
      term.options.fontFamily = fontFamily
      fit()
    }
    document.fonts?.load(`${FONT_SIZE}px ${fontFamily}`).then(remeasure, () => {})

    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(host)

    const themeObserver = new MutationObserver(() => {
      term.options.theme = readTheme(host)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] })

    const onMotion = (event: MediaQueryListEvent) => {
      term.options.cursorBlink = !event.matches
    }
    motion?.addEventListener?.('change', onMotion)

    return () => {
      alive = false
      window.clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      motion?.removeEventListener?.('change', onMotion)
      fitRef.current = () => {}
      termRef.current = null
      term.dispose() // and the addons it loaded
    }
    // Created once; the effects below carry every prop that can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    if (termRef.current) termRef.current.options.scrollback = scrollback
  }, [scrollback])

  useLayoutEffect(() => {
    const term = termRef.current
    term?.textarea?.setAttribute('aria-label', `${label}: terminal input`)
    hostRef.current?.querySelector('.live-region')?.setAttribute('aria-live', announceOutput ? 'polite' : 'off')
  }, [label, announceOutput])

  useImperativeHandle(
    ref,
    () => ({
      write: (data, callback) => termRef.current?.write(data, callback),
      clear: () => termRef.current?.clear(),
      focus: () => termRef.current?.focus(),
      fit: () => fitRef.current(),
    }),
    []
  )

  const { word, tone } = describeStatus(status, exitCode)

  return (
    <Panel
      padding="none"
      tone="base"
      role="group"
      aria-label={label}
      className={cn(
        'flex h-96 min-h-0 min-w-0 flex-col',
        'has-[.xterm-helper-textarea:focus]:outline-2 has-[.xterm-helper-textarea:focus]:outline-offset-2 has-[.xterm-helper-textarea:focus]:outline-[var(--color-focus-ring)]',
        className
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--color-border-hairline)] px-4 py-1">
        <span className="min-w-0 truncate font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</span>
        <Badge tone={tone}>{word}</Badge>
        {readOnly ? <Badge tone="neutral">Read only</Badge> : null}
        {statusMessage ? (
          <span className={cn('min-w-0 text-sm', status === 'error' ? 'text-[var(--color-accent-hostile-text)]' : 'text-[var(--color-text-secondary)]')}>{statusMessage}</span>
        ) : null}
        {readOnly ? null : (
          <span className="ml-auto inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
            <Kbd size="sm">Ctrl</Kbd>
            <Kbd size="sm">Shift</Kbd>
            <Kbd size="sm">L</Kbd>
            <span className="ml-1">leaves the terminal</span>
          </span>
        )}
      </div>
      <span role="status" className="sr-only">{`${label}: ${word}${statusMessage ? `. ${statusMessage}` : ''}`}</span>
      <div className="min-h-0 flex-1 p-3">
        <div ref={hostRef} data-terminal-host className="h-full w-full font-mono" />
      </div>
    </Panel>
  )
}
