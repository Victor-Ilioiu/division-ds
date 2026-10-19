import type { AnchorHTMLAttributes, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ExternalLink } from 'lucide-react'
import { cn } from '../../../lib/cn'

export const linkVariants = cva(
  cn(
    'inline underline underline-offset-2 decoration-1',
    // `transition-control`, not `transition-colors`: Tailwind v4's colour transition
    // includes `outline-color`, which made the focus ring animate in from currentColor
    // (near-white) instead of painting the ring token at the instant of focus. See
    // control.css, which also owns the reduced-motion case.
    'transition-control',
    // Not bevelled, so it draws its own ring. Nothing clips it.
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'focus-visible:outline-[var(--color-focus-ring)]'
  ),
  {
    variants: {
      tone: {
        signal: 'text-[var(--color-accent-signal-text)] hover:decoration-2',
        quiet: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      },
    },
    defaultVariants: { tone: 'signal' },
  }
)

/** Shared across both external variants: CVA variant props plus the ref, common to every
 *  rendered anchor regardless of whether it opens in a new tab. */
type LinkSharedProps = VariantProps<typeof linkVariants> & {
  ref?: Ref<HTMLAnchorElement>
}

/** The default path: a normal in-app anchor. Every native anchor prop, including target/rel,
 *  is available — nothing here is guaranteed by the component, so nothing needs excluding. */
type LinkDefaultProps = LinkSharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    external?: false
  }

/** The external path: opens in a new tab, with target="_blank" and rel="noopener noreferrer"
 *  set by the component. `target`/`rel` are typed `never` rather than merely omitted — unlike
 *  `aria-label` on IconButton, these are ordinary (non-hyphenated) attribute names, so TypeScript's
 *  normal excess-property checking already flags a stray one; declaring them `never` here is what
 *  makes the rejection message legible and keeps this union reading the same as Button's
 *  asChild/native split and IconButton's aria-label exclusion. Without it, `{...rest}` — spread
 *  after the component's own `target`/`rel` — would let a caller-supplied value silently win at
 *  runtime and defeat the hardening `external` exists to guarantee. */
type LinkExternalProps = LinkSharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> & {
    external: true
    target?: never
    rel?: never
  }

export type LinkProps = LinkDefaultProps | LinkExternalProps

export function Link({ tone, external = false, className, children, ref, ...rest }: LinkProps) {
  return (
    <a
      ref={ref}
      className={cn(linkVariants({ tone }), className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
      {external ? (
        <>
          <ExternalLink aria-hidden="true" className="inline-block w-3 h-3 ml-1 align-baseline" />
          {/* The space is a plain sibling text node, not part of the sr-only span's own text: the
              accessible-name algorithm trims each subtree's text before concatenating it with its
              siblings, so a leading space *inside* the span is discarded and "Supplier" runs
              straight into "(opens in a new tab)" with no separating space. */}
          {' '}
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : null}
    </a>
  )
}
