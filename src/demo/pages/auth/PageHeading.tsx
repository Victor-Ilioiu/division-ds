import type { ReactNode } from 'react'

/**
 * The auth pages' own `h1`, styled as an eyebrow -- a small, quiet section label rather than a
 * competing title. AuthForm renders its own `h2` at 24px/600 for the mode ("Sign in", "Enter your
 * code", ...); an unstyled `h1` here defaults to larger and heavier than that `h2`, inverting the
 * hierarchy the outline is supposed to read (h1 -> h2). `text.secondary on surface.base` is
 * already a gated pair (see `scripts/lib/contrast-pairs.mjs`), so this needs no row of its own.
 * One shared component rather than four copies of the same className string.
 */
export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
      {children}
    </h1>
  )
}
