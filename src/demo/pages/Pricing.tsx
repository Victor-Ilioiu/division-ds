import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Badge, Button, Switch } from '../../components/atoms'
import { Card, CardBody, CardFooter, CardTitle } from '../../components/molecules'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/money'
import { CARE, type CareTier } from '../content'
import { DEFAULT_PAGE } from '../DefaultPage'
import { useSession } from '../store/session'

/** A fictional tech-service plan, priced with two periods -- the switch never replaces one
 *  price with the other silently: a persistent status (mounted before the toggle, so a later text
 *  change to it is picked up as an update) announces which one is now showing. `?billing=annual`
 *  is the only state this page keeps outside the URL, so a shared or reloaded link always opens on
 *  the same prices the person who sent it was looking at. */
function useBilling(): [boolean, (annual: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const annual = searchParams.get('billing') === 'annual'
  const setAnnual = (next: boolean) => {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('billing', 'annual')
    else params.delete('billing')
    setSearchParams(params)
  }
  return [annual, setAnnual]
}

/** `formatMoney` plus a unit suffix, composed so the visible "/mo" or "/yr" never reaches
 *  assistive tech (it is a graphic abbreviation, not a word) while the accessible text still
 *  reads as a full phrase -- "€4.00 per month", not "€4.00" with the unit silently dropped. */
function Price({ minorUnits, annual }: { minorUnits: number; annual: boolean }) {
  return (
    <p className="font-mono text-3xl tabular-nums text-[var(--color-text-primary)]">
      {formatMoney(minorUnits)}
      <span aria-hidden="true" className="text-base text-[var(--color-text-secondary)]">
        {annual ? '/yr' : '/mo'}
      </span>
      <span className="sr-only">{annual ? ' per year' : ' per month'}</span>
    </p>
  )
}

function TierFeatures({ tier }: { tier: CareTier }) {
  const included = CARE.features.filter(feature => feature.tiers[tier.id])
  return (
    <ul role="list" className="flex flex-col gap-2">
      {included.map(feature => (
        <li key={feature.name} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <Check aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-accent-ok-text)]" />
          {feature.name}
        </li>
      ))}
      <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
        <Check aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-accent-ok-text)]" />
        {tier.supportChannel}
      </li>
    </ul>
  )
}

function TierCard({ tier, annual }: { tier: CareTier; annual: boolean }) {
  const { user } = useSession()
  const ctaHref = user ? '/demo/account' : '/demo/create-account'
  const price = annual ? tier.monthlyPrice * 10 : tier.monthlyPrice
  return (
    <Card
      // Inline, not a Tailwind utility class: `.panel` (elevation.css) sets its own `border`
      // shorthand, unlayered, so any `border-*` utility class -- however specific -- loses the
      // cascade to it regardless of source order (an unlayered rule always outranks a layered
      // one). An inline style is the one thing that still wins.
      style={tier.recommended ? { border: '2px solid var(--color-accent-signal-fill)' } : undefined}
    >
      <CardBody className="flex flex-col gap-4">
        {/* Reserved on every card, recommended or not, at the Badge atom's own fixed height
            (`h-[22px]`) -- rendering it only on the recommended tier left that tier's title,
            price and feature list all sitting lower than its two siblings, whose CardBody starts
            one row shorter. The badge's own text is the signal -- "Most chosen" reads the same
            with colour turned off. The thicker border above is a second, redundant cue, never
            the only one. */}
        <div className="h-[22px]">
          {tier.recommended ? (
            <Badge tone="signal" emphasis="solid">
              Most chosen
            </Badge>
          ) : null}
        </div>
        <CardTitle level={2} className="text-xl">
          {tier.name}
        </CardTitle>
        <Price minorUnits={price} annual={annual} />
        <TierFeatures tier={tier} />
      </CardBody>
      <CardFooter className="justify-start">
        <Button asChild>
          <RouterLink to={ctaHref} aria-label={`Get started with ${tier.name}`}>
            Get started
          </RouterLink>
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Marks with an aria-hidden glyph and a companion sr-only word each, never the glyph alone --
 *  "✓" and "—" read as "check mark" and "em dash" to a screen reader, neither of which says
 *  anything about coverage. */
function Included({ included }: { included: boolean }) {
  return (
    <>
      <span aria-hidden="true">{included ? '✓' : '—'}</span>
      <span className="sr-only">{included ? 'Included' : 'Not included'}</span>
    </>
  )
}

const CELL = 'px-3 py-2.5 text-left align-top text-[var(--color-text-primary)]'
const HEADER_CELL =
  'px-3 py-2 text-left align-bottom font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]'
const RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'

function ComparisonTable() {
  const captionId = 'care-comparison-caption'
  return (
    <div role="region" aria-labelledby={captionId} tabIndex={0} className={cn('overflow-x-auto', RING)}>
      <table className="w-full border-collapse font-body text-sm">
        {/* sr-only, and the SAME text as the visible "Compare plans" heading above this table --
            two different phrases side by side (this one used to read "Compare Care plans") read
            as a duplicated section title to a sighted person; a screen reader still needs SOME
            name on the table itself (this region's own `aria-labelledby` points here), just not
            a second visible one. */}
        <caption id={captionId} className="sr-only">
          Compare plans
        </caption>
        <thead>
          <tr className="border-b border-[var(--color-border-hairline-strong)]">
            <th scope="col" className={HEADER_CELL}>
              Feature
            </th>
            {CARE.tiers.map(tier => (
              <th key={tier.id} scope="col" className={HEADER_CELL}>
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CARE.features.map(feature => (
            <tr key={feature.name} className="border-b border-[var(--color-border-hairline)]">
              <th scope="row" className={cn(CELL, 'font-semibold')}>
                {feature.name}
              </th>
              {CARE.tiers.map(tier => (
                <td key={tier.id} className={CELL}>
                  <Included included={feature.tiers[tier.id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Faq() {
  return (
    <ul role="list" className="flex flex-col gap-2">
      {CARE.faq.map(item => (
        <li key={item.question} className="border-b border-[var(--color-border-hairline)]">
          <details className="group py-3">
            <summary
              className={cn(
                'flex items-center justify-between gap-2 cursor-pointer list-none font-display font-semibold text-[var(--color-text-primary)]',
                '[&::-webkit-details-marker]:hidden [&::marker]:hidden',
                RING
              )}
            >
              {item.question}
              <ChevronDown
                aria-hidden="true"
                className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="pt-2 text-sm text-[var(--color-text-secondary)]">{item.answer}</p>
          </details>
        </li>
      ))}
    </ul>
  )
}

/**
 * Hexline Care: a fictional tech-service plan for the concept store, not a real product
 * -- the visible note below the header says so. Three tiers, a monthly/annual billing switch, a
 * comparison table and an FAQ, all reading from the one `CARE` catalogue in `content.ts` so a
 * plan's price or coverage can never drift between the card that sells it and the table that
 * compares it.
 */
export function Pricing() {
  const [annual, setAnnual] = useBilling()
  // Persistent and sr-only regardless of content, the same reason Onboarding's own save-error
  // region is mounted before its text exists: a live region has to already be in the tree before
  // a later change to its text is picked up as an update, not just be given text once it renders.
  const status = annual ? 'Showing annual prices' : 'Showing monthly prices'

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-10`}>
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-semibold text-3xl text-[var(--color-text-primary)]">{CARE.title}</h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)] max-w-2xl">{CARE.lede}</p>
        <p className="font-body text-xs text-[var(--color-text-muted)]">
          Hexline Care is a concept for this design system demo. Nothing here is a real product or plan.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* The billing switch sits next to the heading for the section it actually controls --
            three tier cards immediately below -- rather than up in the page header, disconnected
            from anything it visibly changes. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display font-semibold text-xl text-[var(--color-text-primary)]">Plans</h2>
          <div className="flex items-center gap-3">
            <Switch id="care-billing-annual" checked={annual} onCheckedChange={setAnnual} />
            <label htmlFor="care-billing-annual" className="font-body text-sm text-[var(--color-text-primary)]">
              {CARE.billingLabel}
            </label>
          </div>
        </div>
        <p role="status" className="sr-only">
          {status}
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARE.tiers.map(tier => (
            <TierCard key={tier.id} tier={tier} annual={annual} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-xl text-[var(--color-text-primary)]">Compare plans</h2>
        <ComparisonTable />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display font-semibold text-xl text-[var(--color-text-primary)]">
          Frequently asked questions
        </h2>
        <Faq />
      </div>
    </div>
  )
}
