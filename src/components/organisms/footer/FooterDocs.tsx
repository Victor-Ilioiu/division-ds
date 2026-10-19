import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Footer.meta'
import { Example } from '../../docs/Example'
import { Footer, type FooterColumn } from './Footer'

const STORE_COLUMNS: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'Replicas', href: '#replicas' },
      { label: 'Optics', href: '#optics' },
      { label: 'Parts', href: '#parts' },
      { label: 'Care', href: '#care' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Shipping', href: '#shipping' },
      { label: 'Returns', href: '#returns' },
      { label: 'Warranty', href: '#warranty' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Field notes', href: '#field-notes' },
      { label: 'Careers', href: '#careers' },
    ],
  },
  {
    title: 'Elsewhere',
    links: [
      { label: 'Site finder', href: 'https://example.com/sites', external: true },
      { label: 'Field guides', href: 'https://example.com/field-guides', external: true },
    ],
  },
]

const SIX_COLUMNS: FooterColumn[] = [
  ...STORE_COLUMNS,
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '#sign-in' },
      { label: 'Orders', href: '#orders' },
      { label: 'Settings', href: '#settings' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '#six-terms' },
      { label: 'Privacy', href: '#six-privacy' },
    ],
  },
]

const COMPACT_COLUMNS: FooterColumn[] = [
  {
    title: 'Help',
    links: [
      { label: 'Shipping', href: '#compact-shipping' },
      { label: 'Returns', href: '#compact-returns' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '#terms' },
      { label: 'Privacy', href: '#privacy' },
    ],
    defaultOpen: true,
  },
]

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

// Contrast: "text.primary on surface.raised (over surface.base)" — the Example wrapper is surface.raised.
const BRAND = (
  <span className="font-display font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
    Hexline
  </span>
)

/**
 * A stand-in backdrop for this page: a field of dots drawn with one CSS gradient in text.muted,
 * fading out toward the top. It fills the layer the Footer gives it. The demo store passes a
 * three.js scene here instead; the Footer does not know the difference.
 */
const BACKDROP = (
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: 'radial-gradient(var(--color-text-muted) 1px, transparent 1.5px)',
      backgroundSize: '14px 14px',
      maskImage: 'linear-gradient(to bottom, transparent, black 70%)',
    }}
  />
)

// Contrast: "alert body and ghost dismiss (text.secondary) on surface.raised (over surface.base)".
const ASIDE = {
  title: 'Visit',
  content: (
    <p className="font-body text-sm text-[var(--color-text-secondary)]">
      Unit 4, Fieldside Yard. Weekdays, nine to five. Bring your replica in a bag.
    </p>
  ),
}

export function FooterDocs() {
  return (
    <ComponentDocs meta={meta}>
      {/* Inside <main>, so these examples are not contentinfo landmarks. */}
      <Example caption="Store footer: four groups, a small brand and no wordmark" className="block">
        <Footer label="Store footer" headingLevel={4} brand={BRAND} tagline="Airsoft replicas, optics and parts." columns={STORE_COLUMNS} legal={LEGAL} />
      </Example>

      <Example caption="Six groups: four across, then two" className="block">
        <Footer label="Six-group footer" headingLevel={4} brand={BRAND} columns={SIX_COLUMNS} legal={LEGAL} />
      </Example>

      <Example caption="In a narrow container: an accordion (groups that open and close), with the second group open to start" className="block">
        <div className="max-w-sm">
          <Footer label="Compact footer" headingLevel={4} columns={COMPACT_COLUMNS} legal={LEGAL} />
        </div>
      </Example>

      <Example caption="With an aside: below the groups at this width, and to their right once there's 64rem (rem is a unit based on the page's text size) of room" className="block">
        <Footer label="Aside footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 3)} aside={ASIDE} legal={LEGAL} />
      </Example>

      <Example caption="With a wordmark: the name is the last thing in the footer, edge to edge" className="block">
        <Footer label="Wordmark footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 2)} legal={LEGAL} wordmark="Hexline" />
      </Example>

      <Example caption="With a wordmark and a backdrop: a layer behind the letters, with headroom over them" className="block">
        <Footer label="Backdrop footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 2)} legal={LEGAL} wordmark="Hexline" backdrop={BACKDROP} />
      </Example>
    </ComponentDocs>
  )
}
