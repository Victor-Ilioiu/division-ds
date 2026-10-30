import { useEffect, useState, type ReactNode, type Ref } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { IconButton } from '../../atoms/icon-button/IconButton'
import { useToast } from '../toast/Toast'

export type CodeBlockProps = {
  /** The text shown and copied, exactly. A trailing newline is dropped from the display only. */
  code: string
  /** What the code is, in a few words ("the theme CSS"). Names the scroll region and the copy button. */
  label: string
  /** Shown in the title bar: a file name ("index.css") or a language ("bash"). */
  title?: string
  /** css colours comments, at-rules, selectors and property names. text is plain. */
  language?: 'css' | 'text'
  /** Line numbers in a gutter. Defaults to on when the code has more than one line. */
  lineNumbers?: boolean
  /** The copy button in the title bar. */
  copyable?: boolean
  /** Wraps long lines instead of scrolling them sideways: for prose such as a prompt. */
  wrap?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}

const C = {
  comment: 'text-[var(--color-text-secondary)] italic',
  atRule: 'text-[var(--color-accent-signal-text)]',
  string: 'text-[var(--color-accent-ok-text)]',
  selector: 'text-[var(--color-accent-signal-text)]',
  prop: 'text-[var(--color-accent-info-text)]',
  punct: 'text-[var(--color-text-secondary)]',
}

/** Colours one line of CSS. A small reader, not a parser: comments, @import, selectors,
 *  `--name: value;` declarations and closing braces, which is what the docs show. */
function highlightCss(line: string): ReactNode {
  if (/^\s*\/\*/.test(line)) return <span className={C.comment}>{line}</span>
  const imp = /^(@import)( url\()(".*")(\);)$/.exec(line)
  if (imp) return <><span className={C.atRule}>{imp[1]}</span><span className={C.punct}>{imp[2]}</span><span className={C.string}>{imp[3]}</span><span className={C.punct}>{imp[4]}</span></>
  const imp2 = /^(@import) (".*")(;)$/.exec(line)
  if (imp2) return <><span className={C.atRule}>{imp2[1]}</span> <span className={C.string}>{imp2[2]}</span><span className={C.punct}>{imp2[3]}</span></>
  const decl = /^(\s+)(--[\w-]+)(:)(.*)(;)$/.exec(line)
  if (decl) return <>{decl[1]}<span className={C.prop}>{decl[2]}</span><span className={C.punct}>{decl[3]}</span>{decl[4]}<span className={C.punct}>{decl[5]}</span></>
  if (line.endsWith('{')) return <><span className={C.selector}>{line.slice(0, -1)}</span><span className={C.punct}>{'{'}</span></>
  if (line.trim() === '}') return <span className={C.punct}>{line}</span>
  return line
}

/**
 * A code panel: a title bar with the file name or language and a copy button, then the code, with
 * line numbers when it runs to more than one line. The look of the theme builder's "Apply it"
 * panel, which every snippet on the site now uses.
 *
 * On surface.base, not sunken: the CSS colours are accent.*.text, which the contrast gate
 * measures on surface.base. The `pre` scrolls sideways (code does not reflow, and SC 1.4.10
 * excepts it), so it is a named, focusable region with a ring (axe: scrollable-region-focusable).
 * The copy is confirmed twice: the icon turns into a tick, and a toast says so for anyone who
 * cannot see the icon change. That needs the app's one Toaster.
 */
export function CodeBlock({ code, label, title, language = 'text', lineNumbers, copyable = true, wrap = false, className, ref }: CodeBlockProps) {
  const lines = code.replace(/\n$/, '').split('\n')
  const numbered = lineNumbers ?? lines.length > 1
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({ title: `Copied: ${label}`, replace: 'copy' })
    } catch {
      toast({ tone: 'warning', title: 'Copying is blocked here. Select the text and copy it yourself.', replace: 'copy' })
    }
  }

  return (
    // min-w-0 lets a grid or flex column shrink it, so long lines scroll inside the pre instead
    // of widening the page.
    <div ref={ref} className={cn('min-w-0 border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)]', className)}>
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--color-border-hairline)] py-1 pl-4 pr-1">
        <span className="truncate font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">{title}</span>
        {copyable ? (
          <IconButton label={`Copy ${label}`} variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
          </IconButton>
        ) : null}
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label={title ? `${title}, ${label}` : label}
        className={cn(
          'max-h-[32rem] overflow-auto py-3 font-mono text-sm leading-relaxed text-[var(--color-text-primary)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          !numbered && 'px-4'
        )}
      >
        <code>
          {lines.map((line, i) => (
            <span key={i} className="flex">
              {numbered ? (
                <span aria-hidden="true" className="w-12 shrink-0 select-none pr-4 text-right text-[var(--color-text-muted)]">
                  {i + 1}
                </span>
              ) : null}
              <span className={cn(wrap ? 'min-w-0 whitespace-pre-wrap break-words' : 'whitespace-pre', numbered && 'pr-4')}>{(language === 'css' ? highlightCss(line) : line) || '\u200b'}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
