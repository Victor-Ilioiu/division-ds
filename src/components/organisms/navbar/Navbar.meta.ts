import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Navbar',
  title: 'Navbar',
  tier: 'organisms',
  slug: 'navbar',
  summary:
    "The top of a page: the brand, the main links and a few actions. When its container gets narrow, the links move into a menu sheet. Nothing gets cut off, and nothing is hidden for good.",
  anatomy: [
    {
      part: 'Header',
      description: "The page's banner landmark, a region screen readers can jump straight to, at the top level of the page.",
    },
    { part: 'Brand', description: 'The wordmark or logo, usually a link to the home page.' },
    {
      part: 'Links',
      description:
        'A named navigation region. The current page gets the signal fill, plus aria-current, an ARIA attribute (Accessible Rich Internet Applications, the labels screen readers rely on) that tells screen readers this is the page you are on.',
    },
    { part: 'Actions', description: 'They stay visible at every width.' },
    {
      part: 'Menu',
      description:
        "When the container is narrower than 42rem (rem is a unit based on the root text size, usually 16 pixels), an icon button opens the same links in a Sheet. If the container widens past that breakpoint while the sheet is open, the sheet stays open. It doesn't close itself when the links reappear in the bar.",
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. The name screen readers give the navigation region.' },
    { name: 'brand', type: 'ReactNode', description: 'Required. The wordmark or logo, usually a link to the home page.' },
    {
      name: 'items',
      type: 'NavbarItem[]',
      description:
        "Required. A link is { label, href, current }. A menu among the links is { label, menu, current }: menu lists { label, href, description } entries, opened from a dropdown on a wide bar and listed as a labelled group in the menu sheet on a narrow one.",
    },
    {
      name: 'actions',
      type: 'ReactNode',
      description:
        "Controls on the right: icon buttons, a cart link, an account menu. Keep them small, because they stay visible at every width.",
    },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description:
        "Pass your router's link component here. Map href to its own prop, and pass className, aria-current and onClick through.",
    },
    {
      name: 'menuLabel',
      type: 'string',
      default: "'Menu'",
      description: "The menu button's name for screen readers, and the sheet's title.",
    },
    {
      name: 'menuFooter',
      type: 'ReactNode',
      description:
        "Shown in the menu sheet under the links. Use it for an action that doesn't fit in actions on a narrow bar. Hide the matching copy in actions below the breakpoint by wrapping it in an element with the classes hidden @2xl:flex (hidden @4xl:flex when collapseBelow is '4xl').",
    },
    {
      name: 'collapseBelow',
      type: "'2xl' | '4xl'",
      default: "'2xl'",
      description:
        "The bar's own width below which the links fold into the menu sheet: 2xl is 42rem, 4xl is 56rem. Pick the one at which the brand, every link and the actions still fit on one row with room to spare.",
    },
    {
      name: 'className',
      type: 'string',
      description: 'Added to the root classes. Where two Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'The header element.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: 'Moves through the brand, each link and the actions, then the menu button when it shows.',
    },
    { keys: ['Enter'], does: 'Follows a link, or opens the menu.' },
    { keys: ['Esc'], does: 'Closes the menu and sends focus back to its button.' },
  ],
  useWhen: 'The top of a site: the brand, up to about six main links and a few actions.',
  notFor: 'App navigation across many grouped pages: use Sidebar.',
  dos: [
    'Mark exactly one item as current.',
    'Keep actions to icon buttons with names, or one short button.',
    'If a page has more than one navbar, give each its own label.',
  ],
  donts: [
    "Don't put more than about six links in the bar. Group the rest under a page.",
    "Don't hide an action inside the menu that the bar shows at wide widths only.",
    "Don't mark a link as current with colour alone. The fill and aria-current both move with it.",
  ],
}
