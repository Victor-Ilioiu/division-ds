import { useEffect, useRef, useState, type HTMLAttributes, type Ref } from 'react'
import { cn } from '../../../lib/cn'
import { motionAllowed, onReducedMotionChange } from '../../../fx/core/gate'
import { hasWebGL2 } from '../../../fx/core/webgl'
import { Spinner } from '../spinner/Spinner'
import { readPalette } from './palette'
import type { LoaderVariant } from './variants'

/** CSS box per size. The renderer draws at the same size, so a 1px hairline stays 1px. */
const SIZE = {
  sm: { className: 'w-24 h-24', px: 96 },
  md: { className: 'w-40 h-40', px: 160 },
  lg: { className: 'w-60 h-60', px: 240 },
} as const

/** `role` is excluded for the same reason as Spinner's: `label` is the sole source of
 *  role="status", and a role arriving in `rest` would silently replace it. */
export type LoadingAnimationProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  /** `aperture` (default): shaded blades indexing round a spinning core. `gyro`: nested rings
   *  turning against each other. `reticle`: a progress ring filling from a 12 o'clock marker. */
  variant?: LoaderVariant
  /** A 96px, 160px or 240px square. @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** Visually hidden status text. Passing it makes the loader a live region. */
  label?: string
  ref?: Ref<HTMLDivElement>
  role?: never
}

/**
 * A full-panel wait: an animated instrument dial drawn in WebGL, in the theme's own greys with the
 * signal accent on the one element reporting progress. For a wait inside a line of text or a
 * control, use Spinner.
 *
 * The dial is decoration over a status: the canvas is aria-hidden and `label` carries the meaning.
 * Under reduced motion (or save-data) it renders one still frame and never starts a loop; without
 * WebGL it shows the Conveyor spinner in the same box.
 */
export function LoadingAnimation({ variant = 'aperture', size = 'md', label, className, ref, ...rest }: LoadingAnimationProps) {
  const stage = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(() => !hasWebGL2())
  const [animate, setAnimate] = useState(() => motionAllowed())
  const [ready, setReady] = useState(false)

  useEffect(() => onReducedMotionChange(reduced => setAnimate(motionAllowed(reduced))), [])

  useEffect(() => {
    const host = stage.current
    if (failed || !host) return
    // The canvas is created here, not in JSX: a disposed renderer loses its context for good, so
    // every mount (Strict Mode's replay included) needs a canvas of its own.
    const canvas = document.createElement('canvas')
    canvas.className = 'block w-full h-full'
    host.appendChild(canvas)
    let dispose: (() => void) | undefined
    let cancelled = false
    import('./scene')
      .then(({ mountLoader }) => {
        if (cancelled) return
        dispose = mountLoader(canvas, { variant, sizePx: SIZE[size].px, animate, readPalette: () => readPalette(host) })
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      dispose?.()
      canvas.remove()
      setReady(false)
    }
  }, [variant, size, animate, failed])

  return (
    <div
      ref={ref}
      role={label ? 'status' : undefined}
      data-variant={variant}
      className={cn('relative inline-grid place-items-center max-w-full aspect-square shrink-0', SIZE[size].className, className)}
      {...rest}
    >
      {failed ? (
        <span aria-hidden="true">
          <Spinner variant="conveyor" size={size} />
        </span>
      ) : (
        <div
          ref={stage}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 transition-opacity [transition-duration:var(--duration-base)] motion-reduce:transition-none',
            ready ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}
