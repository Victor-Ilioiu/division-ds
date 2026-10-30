import { useEffect, useState } from 'react'
import { getStoredTheme, setTheme, type Theme } from '../../lib/theme'
import { Button } from '../atoms/button/Button'

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    const initial = getStoredTheme()
    setTheme(initial)
    setThemeState(initial)
  }, [])

  function toggle() {
    setTheme(next)
    setThemeState(next)
  }

  // A real Button, not a hand-rolled <button>: this control is on all 28 pages and was the most
  // visible thing in the system with no focus ring at all, falling back to the UA default
  // (rgb(16, 16, 16) auto 1px). Routing it through the atom is how it inherits the ring, the
  // disabled vocabulary and the bevel, rather than re-deriving them here and drifting again.
  //
  // The label names the ACTION, not the state. It used to read "Dark" while the dark theme was
  // live, with no aria-pressed — so the only thing announced was a word that could equally have
  // been the current theme or the one the button would switch to, and nothing said which. The
  // alternative fix, aria-pressed, needs a label that names a fixed thing and lets pressed carry
  // the state; this label changes with the theme, so pressed would have had nothing stable to
  // qualify ("Dark, toggle button, pressed" says no more than "Dark" did). Naming the action
  // removes the ambiguity outright. The visible word is the destination theme and the accessible
  // name contains it verbatim, which is what SC 2.5.3 (label in name) requires of a visible label.
  //
  // `sm` (32px, `--component-control-height-sm`): every header control beside it -- the site
  // search, the Design system link, the cart -- is the sm height, so the row is one height.
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
    >
      {next === 'dark' ? 'Dark' : 'Light'}
    </Button>
  )
}
