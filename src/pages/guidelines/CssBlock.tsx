import type { ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { IconButton } from '../../components/atoms/icon-button/IconButton'
import { useCopy } from './InstallGuideline'

const C = {
  comment: 'text-[var(--color-text-secondary)] italic',
  atRule: 'text-[var(--color-accent-signal-text)]',
  string: 'text-[var(--color-accent-ok-text)]',
  selector: 'text-[var(--color-accent-signal-text)]',
  prop: 'text-[var(--color-accent-info-text)]',
  punct: 'text-[var(--color-text-secondary)]',
}

/** Colours one line of the CSS this page writes. It only has to read our own output: comments,
 *  @import, selectors, `--name: value;` declarations and closing braces. */
function highlight(line: string): ReactNode {
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

/** A terminal-style code panel: a title bar with the file name and a copy button, then the
 *  CSS with line numbers and colour on comments, at-rules, selectors and property names. */
export function CssBlock({ code, file, label }: { code: string; file: string; label: string }) {
  const { copied, copy } = useCopy(code, label)
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <div className="max-w-3xl border border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-hairline)] py-1 pl-4 pr-1">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">{file}</span>
        <IconButton label={`Copy ${label}`} variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
        </IconButton>
      </div>
      <pre className="max-h-[32rem] overflow-auto py-3 font-mono text-sm leading-relaxed text-[var(--color-text-primary)]">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="flex">
              <span aria-hidden="true" className="w-12 shrink-0 select-none pr-4 text-right text-[var(--color-text-muted)]">{i + 1}</span>
              <span className="whitespace-pre pr-4">{highlight(line)}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
