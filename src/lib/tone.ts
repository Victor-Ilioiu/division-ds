import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'

export type Tone = 'info' | 'ok' | 'warning' | 'hostile'

/** How each status tone shows itself, in one place, for Alert and Toast.
 *
 *  Every tone has an icon and a word as well as a colour, because SC 1.4.1 forbids colour as the
 *  only cue. Colour comes from the `.text` step, the theme-adaptive one gated at 4.5:1 on the
 *  page in both themes, never from `.fill`, which is theme-invariant and fails on the light page.
 *
 *  The class strings are written out in full rather than built from the tone name, because
 *  Tailwind finds classes by scanning source text and cannot see a template literal's result. */
export const TONES: Record<Tone, { icon: LucideIcon; word: string; text: string; border: string }> = {
  info: {
    icon: Info,
    word: 'Information',
    text: 'text-[var(--color-accent-info-text)]',
    border: 'border-[var(--color-accent-info-text)]',
  },
  ok: {
    icon: CircleCheck,
    word: 'Success',
    text: 'text-[var(--color-accent-ok-text)]',
    border: 'border-[var(--color-accent-ok-text)]',
  },
  warning: {
    icon: TriangleAlert,
    word: 'Warning',
    text: 'text-[var(--color-accent-warning-text)]',
    border: 'border-[var(--color-accent-warning-text)]',
  },
  hostile: {
    icon: CircleAlert,
    word: 'Error',
    text: 'text-[var(--color-accent-hostile-text)]',
    border: 'border-[var(--color-accent-hostile-text)]',
  },
}
