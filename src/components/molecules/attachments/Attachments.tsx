import {
  useId,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { FileText, Paperclip, X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Button, IconButton, Spinner } from '../../atoms'

/**
 * Files attached to one item: a drop zone with a Choose files button, and the list of what is
 * attached, each with a preview for images, its size, a link to open it and a Remove button.
 * Images pasted while focus is inside the component are added too, so a screenshot goes straight
 * from the clipboard onto a ticket.
 *
 * Controlled: the component never uploads. onAdd gets the File objects; the parent uploads them and
 * passes the results back in `files` (with `status: 'uploading'` while that runs).
 *
 * Contrast: the zone is surface.base with a dashed hairline.strong border, accent.signal.indicator
 * while a file is dragged over it (the board's drop colour). Names are "text.primary on
 * surface.base", sizes and the zone's text "text.secondary on surface.base", an error line
 * "accent.hostile.text on surface.base". A preview tile is surface.sunken behind the image.
 */

export type Attachment = {
  id: string
  name: string
  /** In bytes. */
  size: number
  /** The MIME type. Images get a preview. */
  type?: string
  /** Where the file opens. Without it the name is plain text. */
  href?: string
  /** An image URL for the preview. Defaults to href for an image type. */
  previewSrc?: string
  status?: 'uploading' | 'error'
  /** Why it failed, shown under the name with status 'error'. */
  error?: string
}

export type AttachmentsProps = {
  /** Required. Names the list and the drop zone: "Attachments". */
  label: string
  files: readonly Attachment[]
  /** Turns on the drop zone, Choose files and paste. Gets the files that passed accept and
   *  maxSize. */
  onAdd?: (files: File[]) => void
  /** Turns on a Remove button on each file. */
  onRemove?: (id: string) => void
  /** The input's accept attribute, also applied to dropped and pasted files: "image/*,.pdf". */
  accept?: string
  /** The largest file in bytes. Larger files are refused with a message. */
  maxSize?: number
  /** @default 'Drop files here, paste an image, or' */
  dropLabel?: string
  /** @default 'Choose files' */
  browseLabel?: string
  /** Shown instead of the list when nothing is attached and nothing can be added. @default 'No attachments' */
  emptyMessage?: string
  /** What opens a file: your router's link, or a plain anchor. */
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** 1536 -> "1.5 KB". Binary units, one decimal under 10. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** Whether a file matches an accept string: extensions, exact types and type/* wildcards. */
export function acceptsFile(file: { name: string; type: string }, accept?: string): boolean {
  if (!accept?.trim()) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(rule => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

const isImage = (type?: string) => Boolean(type?.startsWith('image/'))
const plainLink = ({ href, className, children }: { href: string; className: string; children: ReactNode }) => (
  <a href={href} className={className} target="_blank" rel="noreferrer">{children}</a>
)

export function Attachments({
  label,
  files,
  onAdd,
  onRemove,
  accept,
  maxSize,
  dropLabel = 'Drop files here, paste an image, or',
  browseLabel = 'Choose files',
  emptyMessage = 'No attachments',
  renderLink = plainLink,
  className,
  ref,
}: AttachmentsProps) {
  const input = useRef<HTMLInputElement | null>(null)
  const zoneId = useId()
  const [over, setOver] = useState(false)
  const [refused, setRefused] = useState<string[]>([])

  const take = (list: FileList | File[] | null | undefined) => {
    if (!onAdd || !list) return
    const all = Array.from(list)
    const ok: File[] = []
    const no: string[] = []
    for (const file of all) {
      if (!acceptsFile(file, accept)) no.push(`${file.name} is not a type this accepts`)
      else if (maxSize !== undefined && file.size > maxSize) no.push(`${file.name} is larger than ${formatBytes(maxSize)}`)
      else ok.push(file)
    }
    setRefused(no)
    if (ok.length) onAdd(ok)
  }

  const onDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    take(event.dataTransfer?.files)
  }
  const onDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!onAdd || !Array.from(event.dataTransfer?.types ?? []).includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }
  const onPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    // A paste into a text field is text; only a paste elsewhere in the component adds files.
    const target = event.target as HTMLElement
    if (target.closest('input:not([type=file]), textarea, [contenteditable="true"]')) return
    const pasted = Array.from(event.clipboardData?.files ?? [])
    if (!pasted.length) return
    event.preventDefault()
    take(pasted)
  }

  return (
    <div ref={ref} className={cn('flex flex-col gap-3', className)} onPaste={onAdd ? onPaste : undefined}>
      {files.length ? (
        <ul role="list" aria-label={label} className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
          {files.map(file => {
            const preview = file.previewSrc ?? (isImage(file.type) ? file.href : undefined)
            return (
              <li
                key={file.id}
                className="relative flex min-w-0 flex-col border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-base)]"
              >
                <div className="flex h-24 items-center justify-center overflow-hidden bg-[var(--color-surface-sunken)]">
                  {file.status === 'uploading' ? (
                    <Spinner label={`Uploading ${file.name}`} />
                  ) : preview ? (
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText aria-hidden="true" className="h-8 w-8 text-[var(--color-text-secondary)]" />
                  )}
                </div>
                <div className="flex min-w-0 items-start gap-1 p-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {file.href && file.status !== 'uploading' ? (
                      renderLink({
                        href: file.href,
                        className: 'truncate text-sm font-semibold text-[var(--color-text-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                        children: file.name,
                      })
                    ) : (
                      <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.name}</span>
                    )}
                    <span className="font-data text-sm text-[var(--color-text-secondary)]">
                      {file.status === 'uploading' ? 'Uploading' : formatBytes(file.size)}
                    </span>
                    {file.status === 'error' ? (
                      <span className="text-sm text-[var(--color-accent-hostile-text)]">{file.error ?? 'Not uploaded'}</span>
                    ) : null}
                  </div>
                  {onRemove && file.status !== 'uploading' ? (
                    <IconButton label={`Remove ${file.name}`} variant="ghost" size="sm" onClick={() => onRemove(file.id)}>
                      <X aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : onAdd ? null : (
        <p className="text-sm text-[var(--color-text-secondary)]">{emptyMessage}</p>
      )}
      {onAdd ? (
        <div
          role="group"
          aria-labelledby={zoneId}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setOver(false)}
          data-over={over ? '' : undefined}
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border border-dashed bg-[var(--color-surface-base)] px-4 py-5 text-center"
          style={{ borderColor: over ? 'var(--color-accent-signal-indicator)' : 'var(--color-border-hairline-strong)' }}
        >
          <Paperclip aria-hidden="true" className="h-4 w-4 text-[var(--color-text-secondary)]" />
          <span id={zoneId} className="text-sm text-[var(--color-text-secondary)]">
            <span className="sr-only">{label}: </span>
            {dropLabel}
          </span>
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
            {browseLabel}
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={accept}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={event => {
              take(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      ) : null}
      {/* Always mounted, so a refusal is announced when it appears. */}
      <div aria-live="polite">
        {refused.length ? (
          <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-[var(--color-accent-hostile-text)]">
            {refused.map(line => <li key={line}>{line}</li>)}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
