import { createContext, useContext, useEffect, useState } from 'react'

/** True while the media query matches. False where `matchMedia` does not exist (jsdom). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(query).matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const change = () => setMatches(list.matches)
    change()
    list.addEventListener('change', change)
    return () => list.removeEventListener('change', change)
  }, [query])
  return matches
}

/** Tailwind's `lg`: from here the assistant docks beside the page instead of taking its own. */
export const WIDE_QUERY = '(min-width: 64rem)'

export type ConsoleUi = {
  /** The docked assistant panel is open (it only shows from `lg` up, off the assistant page). */
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  /** From `lg` up. */
  wide: boolean
}

export const ConsoleUiContext = createContext<ConsoleUi>({ assistantOpen: false, setAssistantOpen: () => {}, wide: false })

export function useConsoleUi(): ConsoleUi {
  return useContext(ConsoleUiContext)
}
