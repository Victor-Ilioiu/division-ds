import { PageHeader, docsItemHeading } from '../../components/docs/PageChrome'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/atoms/button/Button'

const TARGET = 89

function CountUp({ replayKey }: { replayKey: number }) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(TARGET)
      return
    }
    const start = performance.now()
    const duration = 600
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(t * TARGET))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [replayKey])

  return (
    <span>
      {/* The real value is in the DOM immediately -- a screen reader never hears the roll. */}
      <span className="sr-only">{TARGET}</span>
      <span aria-hidden="true" className="font-display font-semibold text-5xl">{display}</span>
    </span>
  )
}

export function MotionGuideline() {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Motion</span>
          </>
        }
        title="Snap in, settle, stay out of the way"
        lede={
          <>
            If someone has asked their device for less motion (the{' '}
            <code className="font-mono text-sm">prefers-reduced-motion: reduce</code> setting),
            every animation below turns into an instant change. You don&apos;t have to take the
            CSS on faith: switch the setting on in the Rendering panel of your browser&apos;s
            DevTools (the built-in developer tools) and check.
          </>
        }
      />
      {/* The Button atom, not a bare <button>: the hand-rolled one here had no system focus
          ring and no type, the same defect Divider's docs Replay carried. */}
      <Button variant="secondary" size="sm" wrapperClassName="mb-10" onClick={() => setReplayKey(k => k + 1)}>
        Replay
      </Button>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className={`${docsItemHeading} mb-3`}>M1. Snap-in</h2>
          <div key={`snap-${replayKey}`} className="anim-snap-in bg-[var(--color-accent-signal-fill)] text-[var(--color-accent-signal-ink)] font-display font-semibold px-4 py-3 w-fit">
            Target locked
          </div>
        </div>

        <div>
          <h2 className={`${docsItemHeading} mb-3`}>M2. Draw-on line</h2>
          <div key={`draw-${replayKey}`} className="anim-draw-on h-0.5 w-40 bg-[var(--color-accent-signal-fill)]" />
        </div>

        <div>
          <h2 className={`${docsItemHeading} mb-3`}>M3. Count-up</h2>
          <CountUp replayKey={replayKey} />
        </div>

        <div>
          <h2 className={`${docsItemHeading} mb-3`}>M4. Rationed glitch</h2>
          <div key={`glitch-${replayKey}`} className="anim-glitch border border-[var(--color-accent-hostile-fill)] text-[var(--color-accent-hostile-text)] font-mono text-sm px-4 py-3 w-fit">
            SIGNAL LOST
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs mt-2">
            It plays at most 2 times through a 400ms (millisecond) cycle, about 2.5 flashes a
            second. That&apos;s under the limit of 3 flashes per second set by WCAG 2.3.1, a rule
            in the Web Content Accessibility Guidelines that protects people who can have seizures
            from flashing. It&apos;s used for errors only, never as decoration.
          </p>
        </div>

        <div>
          <h2 className={`${docsItemHeading} mb-3`}>M5. Stepped arrival</h2>
          {/* Live controls, not a swatch: this one only exists while a pointer is on it. */}
          <div className="flex gap-3 w-fit">
            <Button variant="primary" size="sm">
              Hover me
            </Button>
            <Button variant="secondary" size="sm">
              And me
            </Button>
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs mt-2">
            The hover colour arrives in 3 jumps over 180ms, 60ms a step. It&apos;s built as a
            transition with stepped timing (a change that runs once each time the state is
            entered) instead of a looping keyframe animation. So by design nothing can replay
            while the pointer rests on the button. It needs no flash limit, because the steps only
            ever move toward the hover colour, and WCAG 2.3.1 counts a flash as a pair of opposite
            changes in brightness (luminance). The press stays instant. This applies to every
            Button and IconButton, and{' '}
            <code className="font-mono text-sm">e2e/button-hover.spec.ts</code>, an automated
            browser test, checks it.
          </p>
        </div>
      </div>
    </div>
  )
}
