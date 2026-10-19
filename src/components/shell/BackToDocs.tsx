import { Link as RouterLink } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { Button } from '../atoms/button/Button'

/**
 * The way back from any demo (Hexline, Corvane, Halden Console) to the design system's own docs,
 * set beside the ThemeToggle in each demo's sticky header. One component, so the three demos
 * cannot drift apart on its words or where it goes. A link, not a button: it navigates.
 *
 * On a narrow screen a header has no room for it beside its other controls, so each demo hides
 * the header copy below its menu breakpoint and puts this same link in its menu sheet instead.
 * `labelClassName` can hide the word in a header that is tight at some widths (Hexline's, signed
 * in, just above its menu breakpoint); the link keeps its name through `aria-label` either way.
 */
export function BackToDocs({ labelClassName }: { labelClassName?: string }) {
  return (
    <Button asChild variant="secondary" size="sm">
      <RouterLink to="/" aria-label="Design system">
        <BookOpen aria-hidden="true" className="h-4 w-4" />
        <span className={labelClassName ?? 'ml-2'}>Design system</span>
      </RouterLink>
    </Button>
  )
}
