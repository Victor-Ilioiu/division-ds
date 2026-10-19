import { Search, ShoppingBag } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Navbar.meta'
import { Example } from '../../docs/Example'
import { IconButton } from '../../atoms'
import { Navbar } from './Navbar'

const ITEMS = [
  { label: 'Replicas', href: '#replicas' },
  { label: 'Optics', href: '#optics', current: true },
  { label: 'Parts', href: '#parts' },
  { label: 'Care', href: '#care' },
  { label: 'Field notes', href: '#field-notes' },
]

// Contrast: "text.primary on surface.raised (over surface.base)" — the Example wrapper is surface.raised.
const BRAND = (
  <a
    href="#home"
    className="inline-flex items-center min-h-10 font-display font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
  >
    Hexline
  </a>
)

const ACTIONS = (
  <>
    <IconButton label="Search" variant="ghost">
      <Search aria-hidden="true" className="w-5 h-5" />
    </IconButton>
    <IconButton label="Cart, 2 items" variant="ghost" asChild>
      <a href="#cart">
        <ShoppingBag aria-hidden="true" className="w-5 h-5" />
      </a>
    </IconButton>
  </>
)

export function NavbarDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Store navigation" className="block">
        <Navbar label="Store navigation" brand={BRAND} items={ITEMS} actions={ACTIONS} />
      </Example>

      <Example caption="A narrow container" className="block">
        <div className="max-w-sm">
          <Navbar label="Store navigation, narrow" brand={BRAND} items={ITEMS} actions={ACTIONS} />
        </div>
      </Example>
    </ComponentDocs>
  )
}
