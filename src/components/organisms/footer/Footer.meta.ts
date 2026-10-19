import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Footer',
  title: 'Footer',
  tier: 'organisms',
  slug: 'footer',
  summary:
    "The bottom of a site: where else to go, one more thing to say, the small print, and the name. Link groups sit on the left and a section of your own on the right. Under them is the wordmark, as wide as the footer and cut off by its bottom edge. One nav holds every group, so a screen reader meets one navigation landmark (a labelled region it can jump to), not six.",
  anatomy: [
    {
      part: 'footer',
      description:
        "On a real page, it's the contentinfo landmark at the top level (the region screen readers know as the page footer). The examples here sit inside <main>, so they aren't. It's a CSS container, so the two sections sit side by side based on the footer's own width, not the browser window's (the viewport).",
    },
    {
      part: 'Link section',
      description:
        "On the left. It's a container of its own: the grid below and the switch to an accordion both measure this section, so next to an aside the groups respond to the space they really have.",
    },
    {
      part: 'Brand and tagline',
      description:
        'Optional, above the groups. Leave brand out when there is a wordmark, since the wordmark is the name.',
    },
    {
      part: 'nav',
      description:
        "Named by label, holding every group. It's one column while the link section is under 28rem wide (rem is a unit tied to the base text size), then two, three from 42rem and four from 48rem.",
    },
    {
      part: 'Group title',
      description:
        "A heading in the monospaced face, in capitals, at the 11px (pixel) label size, followed by a slash. The slash is decoration and isn't part of any accessible name (the name a screen reader announces).",
    },
    {
      part: 'Group title, below 28rem',
      description:
        "The same heading holds a button instead of text, with aria-expanded, aria-controls, a 44px height and a chevron. (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what a control does.) CSS shows one form and removes the other from the accessibility tree, the page structure screen readers read, so from 28rem up there's no button to announce.",
    },
    {
      part: 'List',
      description:
        "Named by its title. Below 28rem a closed group's list is display: none, so it's out of the accessibility tree and out of the Tab order. Every group starts closed unless its defaultOpen says otherwise.",
    },
    {
      part: 'Corner mark',
      description:
        "Before each link: one corner of the crosshair, 7px in size with a 1px line, in text.muted, sitting on the text baseline. When the link's hovered it takes the signal colour. It's aria-hidden, so screen readers skip it.",
    },
    {
      part: 'Link',
      description: "The Link atom's quiet tone at 14px, with a 24px target. An external link says it opens a new tab.",
    },
    {
      part: 'Aside',
      description:
        "Only with aside. A heading drawn like a group title, then whatever you pass. It sits under the link section, and moves to its right at 21rem wide once the footer is 64rem wide. It isn't a landmark, because a form inside it already is one.",
    },
    { part: 'Small print', description: 'In text.muted at 12px, under a hairline and above the wordmark.' },
    {
      part: 'Wordmark',
      description:
        "Only with wordmark. The name in the display face, bold and in capitals, exactly as wide as the footer at every width, with its foot cut off by the bottom edge. Nothing sits under it. It's an image named by the string, so it's announced once. Its box is sized from the letters alone, so it's already at its final size before the font loads.",
    },
    {
      part: 'Backdrop layer',
      description:
        "Only with backdrop. A layer the full width of the footer behind the wordmark, with room above the letters so it can be seen. It's aria-hidden and ignores the pointer. Its height comes from the footer's width, so the space is there before the backdrop draws.",
    },
  ],
  props: [
    { name: 'label', type: 'string', description: "Required. The name of the nav landmark." },
    {
      name: 'columns',
      type: 'FooterColumn[]',
      description:
        'Required. Each has a title, links and an optional defaultOpen. A link can be external. The grid is laid out for up to six groups; more wrap onto extra rows.',
    },
    {
      name: 'aside',
      type: '{ title: string; content: ReactNode }',
      description:
        'The second section, such as a sign-up form, an address or opening hours. The footer draws the title as a heading at headingLevel, with the slash.',
    },
    {
      name: 'wordmark',
      type: 'string',
      description:
        "The name, drawn across the whole width at the bottom edge. It's a string, not a node, because the footer sizes the line from its letters and uses it to name the image.",
    },
    {
      name: 'backdrop',
      type: 'ReactNode',
      description:
        "Decoration behind the wordmark. Position it with absolute inset-0. It's hidden from assistive technology (screen readers and similar tools) and takes no pointer input, so it mustn't hold content or anything focusable.",
    },
    { name: 'brand', type: 'ReactNode', description: 'A small brand mark above the groups, for a footer with no wordmark.' },
    { name: 'tagline', type: 'string', description: 'A line under the brand, or on its own above the groups.' },
    { name: 'legal', type: 'ReactNode', description: 'The small print, such as a copyright line or a legal link.' },
    {
      name: 'headingLevel',
      type: '2 | 3 | 4',
      default: '2',
      description: "The level of the group headings and the aside's heading. Match the page's heading outline.",
    },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description:
        "Internal links only. An external link always renders through the Link atom. Pass your router's link component here, mapping href to its own prop and passing className through.",
    },
    {
      name: 'className',
      type: 'string',
      description:
        "Merged with the root classes. Later Tailwind utilities win. The side spacing is the page gutter, --page-gutter (1rem unless a shell sets it). The wordmark and the backdrop ignore it.",
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'The footer element.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: "Moves through each link, group by group, then into the aside. In the accordion, it moves through each group button and the links of the open groups. The wordmark and the backdrop aren't tab stops (places the Tab key lands).",
    },
    {
      keys: ['Enter'],
      does: 'Follows the link. On a group button, opens or closes the group, and focus stays on the button.',
    },
    { keys: ['Space'], does: 'On a group button, opens or closes the group.' },
  ],
  useWhen: 'The bottom of a site: link groups, a section of your own, the small print and the wordmark.',
  notFor: 'A copy of the main navigation, or the only route to a page: use Navbar.',
  dos: [
    'Keep groups short: four to six links each, and six groups at most.',
    "Set headingLevel so the headings carry on the page's outline.",
    'Mark links that leave the site as external.',
    "Leave the accordion closed unless one group is where most readers are heading. Then give that one defaultOpen.",
    'Say the name once: a wordmark or a brand, not both.',
    "Give the backdrop a still version for people who've asked for reduced motion, and pass none where it can't draw.",
  ],
  donts: [
    "Don't repeat the whole navbar here.",
    "Don't put the only route to a page in the footer.",
    "Don't shrink the small print below 12px.",
    "Don't type the slash into a title. The footer draws it, and a typed one would be read out.",
    "Don't put anything under the wordmark. The footer ends on it.",
    "Don't put a control, a link or anything a reader needs in the backdrop. It's aria-hidden, so a focusable element there fails axe, the automated accessibility checker (rule aria-hidden-focus).",
    "Don't switch to the accordion with a JavaScript width check. The component does it in CSS, so the accessibility tree is right on the first paint and after every resize.",
  ],
}
