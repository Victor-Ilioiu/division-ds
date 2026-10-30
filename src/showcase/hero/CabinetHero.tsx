import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { HL } from './hairline-kernel.js'
import { cabinet } from './cabinet.js'
import { REGISTRY } from '../../links'
import { cn } from '../../lib/cn'

// The folders in the cabinet's two drawers; each name is a real item in public/r/.
const FOLDERS = ['button', 'input', 'select', 'checkbox', 'switch', 'slider', 'dialog', 'tabs', 'toast', 'badge', 'data-table', 'chart-panel']

type Stops = Record<string, { drawer: number; face: [number, number]; top: [number, number] }>

// The figure's palette, mapped onto Division tokens: the chosen folder lights in the signal accent.
const PALETTE = {
  '--hairline-plate': 'var(--color-surface-base)',
  '--hairline-hi': 'var(--color-accent-signal-text)',
  '--hairline-edge': 'var(--color-border-control)',
  '--hairline-mid': 'var(--color-border-hairline-strong)',
  '--hairline-lo': 'var(--color-border-hairline)',
} as CSSProperties

/**
 * A lap of the unseen pointer, in the bottom drawer only: its six folders once each, in a random
 * order, each visited three times in a row to hold it open for a few seconds. The lap starts at the
 * bottom drawer's face, which pulls it back out if a visitor left the top drawer open. The top
 * drawer and its folders open only under a real pointer.
 */
function lap(stops: Stops) {
  const auto = FOLDERS.filter(name => stops[name].drawer === 0).sort(() => Math.random() - 0.5)
  const face = stops[auto[0]].face
  return [face, face, ...auto.flatMap(name => [stops[name].top, stops[name].top, stops[name].top, null])]
}

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The homepage figure: a cabinet of component folders drawn with Hairline. A folder lifts out and
 * opens a terminal; the terminal beside it types that component's install command. With no hand on
 * it, an unseen pointer opens folders at random; a real pointer takes over and picks the folder under it.
 */
export function CabinetHero({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState<string | null>(null)
  // the last folder shown, so the terminal keeps its text while it fades out
  const [shown, setShown] = useState(FOLDERS[0])
  useEffect(() => { if (name) setShown(name) }, [name])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    HL.inject(document)
    stage.setAttribute('data-hairline', cabinet.name)
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage) as SVGSVGElement
    let text: string | null = null
    const read = {
      get textContent() { return text },
      set textContent(value: string | null) {
        text = value == null ? '' : String(value)
        setName(FOLDERS.includes(text) ? text : null)
      },
    }
    const figure = cabinet.mount({ stage, svg, read }, cabinet.range[1])

    let playing: { stop: () => void } | null = null
    const play = () => {
      const route = lap(figure.stops)
      playing = HL.tour(stage, route, i => {
        if (i === route.length - 1) {
          playing?.stop()
          play()
        }
      })
    }
    if (!reduce()) play()

    return () => {
      playing?.stop()
      figure.destroy()
      svg.remove()
    }
  }, [])

  // a real pointer over the cabinet makes the floating mark shine; the unseen tour pointer does not
  const [shine, setShine] = useState(false)

  const command = `npx shadcn@latest add ${REGISTRY}/${shown}.json`
  const typed = useTyped(command)

  return (
    <div className={cn('relative', className)} style={PALETTE}>
      <div ref={stageRef} onPointerEnter={() => setShine(true)} onPointerLeave={() => setShine(false)} data-shine={shine || undefined} role="img" aria-label="A filing cabinet of component folders. One at a time, a folder lifts out and shows the command that installs that component." className="w-full [&_.mark]:stroke-[var(--color-text-primary)] [&_.spin]:transition-[filter] [&_.spin]:duration-500 data-[shine]:[&_.spin]:[filter:drop-shadow(0_0_4px_var(--color-accent-signal-fill))] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" />
      <div
        role="group"
        aria-label={`Install command for ${shown}`}
        className={cn(
          'pointer-events-none absolute z-10 left-0 top-[4%] w-[min(20rem,50%)] border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-raised)] transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
          name ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <div className="flex items-center gap-1.5 border-b border-[var(--color-border-hairline)] py-2 px-3">
          <span aria-hidden="true" className="size-2 bg-[var(--color-border-control)]" />
          <span aria-hidden="true" className="size-2 bg-[var(--color-border-control)]" />
          <span aria-hidden="true" className="size-2 bg-[var(--color-accent-signal-fill)]" />
          <span className="ml-2 flex-1 font-mono text-xs text-[var(--color-text-secondary)]">{shown}</span>
        </div>
        <p className="min-h-[4.5rem] break-all px-3 py-3 font-mono text-xs leading-relaxed text-[var(--color-text-primary)]">
          <span aria-hidden="true" className="text-[var(--color-accent-signal-text)]">$ </span>
          <span className="sr-only">{command}</span>
          <span aria-hidden="true">{typed}</span>
          <span aria-hidden="true" className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-[var(--color-text-primary)] motion-reduce:animate-none" />
        </p>
      </div>
    </div>
  )
}

/** Types `text` out a few characters at a time; shows it whole when the reader asked for less motion. */
function useTyped(text: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!text || reduce()) {
      setCount(text.length)
      return
    }
    setCount(0)
    const id = window.setInterval(() => {
      setCount(c => {
        if (c >= text.length) {
          window.clearInterval(id)
          return c
        }
        return c + 3
      })
    }, 28)
    return () => window.clearInterval(id)
  }, [text])
  return text.slice(0, count)
}
