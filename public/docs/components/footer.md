# Footer

> The bottom of a site: where else to go, one more thing to say, the small print, and the name. Link groups sit on the left and a section of your own on the right. Under them is the wordmark, as wide as the footer and cut off by its bottom edge. One nav holds every group, so a screen reader meets one navigation landmark (a labelled region it can jump to), not six.

- **Best for:** The bottom of a site: link groups, a section of your own, the small print and the wordmark.
- **Not for:** A copy of the main navigation, or the only route to a page: use Navbar.
- Organism. Source: `src/components/organisms/footer/Footer.tsx`
- Rendered docs page: `/components/footer`

## Import

```tsx
import { Footer } from 'src/components/organisms/footer/Footer'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The name of the nav landmark. |
| `columns` | `FooterColumn[]` |  | Required. Each has a title, links and an optional defaultOpen. A link can be external. The grid is laid out for up to six groups; more wrap onto extra rows. |
| `aside` | `{ title: string; content: ReactNode }` |  | The second section, such as a sign-up form, an address or opening hours. The footer draws the title as a heading at headingLevel, with the slash. |
| `wordmark` | `string` |  | The name, drawn across the whole width at the bottom edge. It's a string, not a node, because the footer sizes the line from its letters and uses it to name the image. |
| `backdrop` | `ReactNode` |  | Decoration behind the wordmark. Position it with absolute inset-0. It's hidden from assistive technology (screen readers and similar tools) and takes no pointer input, so it mustn't hold content or anything focusable. |
| `brand` | `ReactNode` |  | A small brand mark above the groups, for a footer with no wordmark. |
| `tagline` | `string` |  | A line under the brand, or on its own above the groups. |
| `legal` | `ReactNode` |  | The small print, such as a copyright line or a legal link. |
| `headingLevel` | `2 \| 3 \| 4` | `2` | The level of the group headings and the aside's heading. Match the page's heading outline. |
| `renderLink` | `(props: LinkRenderProps) => ReactNode` | `a plain anchor` | Internal links only. An external link always renders through the Link atom. Pass your router's link component here, mapping href to its own prop and passing className through. |
| `className` | `string` |  | Merged with the root classes. Later Tailwind utilities win. The side spacing is the page gutter, --page-gutter (1rem unless a shell sets it). The wordmark and the backdrop ignore it. |
| `ref` | `Ref<HTMLElement>` |  | The footer element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type FooterLink = { label: string; href: string; external?: boolean }
```

```ts
export type FooterColumn = {
  title: string
  links: FooterLink[]
  /** Whether this group starts open where the groups are an accordion. Ignored where they are a
   *  grid, because nothing collapses there. @default false */
  defaultOpen?: boolean
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Store footer: four groups, a small brand and no wordmark

```tsx
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

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

const BRAND = (
  <span className="font-display font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
    Hexline
  </span>
)

<Footer label="Store footer" headingLevel={4} brand={BRAND} tagline="Airsoft replicas, optics and parts." columns={STORE_COLUMNS} legal={LEGAL} />
```

### Six groups: four across, then two

```tsx
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

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

const BRAND = (
  <span className="font-display font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
    Hexline
  </span>
)

<Footer label="Six-group footer" headingLevel={4} brand={BRAND} columns={SIX_COLUMNS} legal={LEGAL} />
```

### In a narrow container: an accordion (groups that open and close), with the second group open to start

```tsx
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

<div className="max-w-sm">
  <Footer label="Compact footer" headingLevel={4} columns={COMPACT_COLUMNS} legal={LEGAL} />
</div>
```

### With an aside: below the groups at this width, and to their right once there's 64rem (rem is a unit based on the page's text size) of room

```tsx
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

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

const ASIDE = {
  title: 'Visit',
  content: (
    <p className="font-body text-sm text-[var(--color-text-secondary)]">
      Unit 4, Fieldside Yard. Weekdays, nine to five. Bring your replica in a bag.
    </p>
  ),
}

<Footer label="Aside footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 3)} aside={ASIDE} legal={LEGAL} />
```

### With a wordmark: the name is the last thing in the footer, edge to edge

```tsx
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

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

<Footer label="Wordmark footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 2)} legal={LEGAL} wordmark="Hexline" />
```

### With a wordmark and a backdrop: a layer behind the letters, with headroom over them

```tsx
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

const LEGAL = '© 2026 Hexline. A demo brand for this design system.'

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

<Footer label="Backdrop footer" headingLevel={4} columns={STORE_COLUMNS.slice(0, 2)} legal={LEGAL} wordmark="Hexline" backdrop={BACKDROP} />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each link, group by group, then into the aside. In the accordion, it moves through each group button and the links of the open groups. The wordmark and the backdrop aren't tab stops (places the Tab key lands). |
| `Enter` | Follows the link. On a group button, opens or closes the group, and focus stays on the button. |
| `Space` | On a group button, opens or closes the group. |

## Do

- Keep groups short: four to six links each, and six groups at most.
- Set headingLevel so the headings carry on the page's outline.
- Mark links that leave the site as external.
- Leave the accordion closed unless one group is where most readers are heading. Then give that one defaultOpen.
- Say the name once: a wordmark or a brand, not both.
- Give the backdrop a still version for people who've asked for reduced motion, and pass none where it can't draw.

## Don't

- Don't repeat the whole navbar here.
- Don't put the only route to a page in the footer.
- Don't shrink the small print below 12px.
- Don't type the slash into a title. The footer draws it, and a typed one would be read out.
- Don't put anything under the wordmark. The footer ends on it.
- Don't put a control, a link or anything a reader needs in the backdrop. It's aria-hidden, so a focusable element there fails axe, the automated accessibility checker (rule aria-hidden-focus).
- Don't switch to the accordion with a JavaScript width check. The component does it in CSS, so the accessibility tree is right on the first paint and after every resize.

## Anatomy

- **footer**: On a real page, it's the contentinfo landmark at the top level (the region screen readers know as the page footer). The examples here sit inside <main>, so they aren't. It's a CSS container, so the two sections sit side by side based on the footer's own width, not the browser window's (the viewport).
- **Link section**: On the left. It's a container of its own: the grid below and the switch to an accordion both measure this section, so next to an aside the groups respond to the space they really have.
- **Brand and tagline**: Optional, above the groups. Leave brand out when there is a wordmark, since the wordmark is the name.
- **nav**: Named by label, holding every group. It's one column while the link section is under 28rem wide (rem is a unit tied to the base text size), then two, three from 42rem and four from 48rem.
- **Group title**: A heading in the monospaced face, in capitals, at the 11px (pixel) label size, followed by a slash. The slash is decoration and isn't part of any accessible name (the name a screen reader announces).
- **Group title, below 28rem**: The same heading holds a button instead of text, with aria-expanded, aria-controls, a 44px height and a chevron. (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what a control does.) CSS shows one form and removes the other from the accessibility tree, the page structure screen readers read, so from 28rem up there's no button to announce.
- **List**: Named by its title. Below 28rem a closed group's list is display: none, so it's out of the accessibility tree and out of the Tab order. Every group starts closed unless its defaultOpen says otherwise.
- **Corner mark**: Before each link: one corner of the crosshair, 7px in size with a 1px line, in text.muted, sitting on the text baseline. When the link's hovered it takes the signal colour. It's aria-hidden, so screen readers skip it.
- **Link**: The Link atom's quiet tone at 14px, with a 24px target. An external link says it opens a new tab.
- **Aside**: Only with aside. A heading drawn like a group title, then whatever you pass. It sits under the link section, and moves to its right at 21rem wide once the footer is 64rem wide. It isn't a landmark, because a form inside it already is one.
- **Small print**: In text.muted at 12px, under a hairline and above the wordmark.
- **Wordmark**: Only with wordmark. The name in the display face, bold and in capitals, exactly as wide as the footer at every width, with its foot cut off by the bottom edge. Nothing sits under it. It's an image named by the string, so it's announced once. Its box is sized from the letters alone, so it's already at its final size before the font loads.
- **Backdrop layer**: Only with backdrop. A layer the full width of the footer behind the wordmark, with room above the letters so it can be seen. It's aria-hidden and ignores the pointer. Its height comes from the footer's width, so the space is there before the backdrop draws.
