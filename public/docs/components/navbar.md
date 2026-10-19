# Navbar

> The top of a page: the brand, the main links and a few actions. When its container gets narrow, the links move into a menu sheet. Nothing gets cut off, and nothing is hidden for good.

- **Best for:** The top of a site: the brand, up to about six main links and a few actions.
- **Not for:** App navigation across many grouped pages: use Sidebar.
- Organism. Source: `src/components/organisms/navbar/Navbar.tsx`
- Rendered docs page: `/components/navbar`

## Import

```tsx
import { Navbar } from 'src/components/organisms/navbar/Navbar'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The name screen readers give the navigation region. |
| `brand` | `ReactNode` |  | Required. The wordmark or logo, usually a link to the home page. |
| `items` | `NavbarItem[]` |  | Required. Each item has label, href and current. |
| `actions` | `ReactNode` |  | Controls on the right: icon buttons, a cart link, an account menu. Keep them small, because they stay visible at every width. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | Pass your router's link component here. Map href to its own prop, and pass className, aria-current and onClick through. |
| `menuLabel` | `string` | `'Menu'` | The menu button's name for screen readers, and the sheet's title. |
| `menuFooter` | `ReactNode` |  | Shown in the menu sheet under the links. Use it for an action that doesn't fit in actions on a narrow bar. Hide the matching copy in actions below the breakpoint by wrapping it in an element with the classes hidden @2xl:flex. |
| `className` | `string` |  | Added to the root classes. Where two Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLElement>` |  | The header element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type NavbarItem = { label: string; href: string; current?: boolean }
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Store navigation

```tsx
const ITEMS = [
  { label: 'Replicas', href: '#replicas' },
  { label: 'Optics', href: '#optics', current: true },
  { label: 'Parts', href: '#parts' },
  { label: 'Care', href: '#care' },
  { label: 'Field notes', href: '#field-notes' },
]

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

<Navbar label="Store navigation" brand={BRAND} items={ITEMS} actions={ACTIONS} />
```

### A narrow container

```tsx
const ITEMS = [
  { label: 'Replicas', href: '#replicas' },
  { label: 'Optics', href: '#optics', current: true },
  { label: 'Parts', href: '#parts' },
  { label: 'Care', href: '#care' },
  { label: 'Field notes', href: '#field-notes' },
]

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

<div className="max-w-sm">
  <Navbar label="Store navigation, narrow" brand={BRAND} items={ITEMS} actions={ACTIONS} />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the brand, each link and the actions, then the menu button when it shows. |
| `Enter` | Follows a link, or opens the menu. |
| `Esc` | Closes the menu and sends focus back to its button. |

## Do

- Mark exactly one item as current.
- Keep actions to icon buttons with names, or one short button.
- If a page has more than one navbar, give each its own label.

## Don't

- Don't put more than about six links in the bar. Group the rest under a page.
- Don't hide an action inside the menu that the bar shows at wide widths only.
- Don't mark a link as current with colour alone. The fill and aria-current both move with it.

## Anatomy

- **Header**: The page's banner landmark, a region screen readers can jump straight to, at the top level of the page.
- **Brand**: The wordmark or logo, usually a link to the home page.
- **Links**: A named navigation region. The current page gets the signal fill, plus aria-current, an ARIA attribute (Accessible Rich Internet Applications, the labels screen readers rely on) that tells screen readers this is the page you are on.
- **Actions**: They stay visible at every width.
- **Menu**: When the container is narrower than 42rem (rem is a unit based on the root text size, usually 16 pixels), an icon button opens the same links in a Sheet. If the container widens past that breakpoint while the sheet is open, the sheet stays open. It doesn't close itself when the links reappear in the bar.
