import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Carousel',
  title: 'Carousel',
  tier: 'organisms',
  slug: 'carousel',
  summary:
    "A row of items that scrolls sideways. The browser does the scrolling, and Previous and Next move it a page at a time. Nothing ever moves on its own.",
  anatomy: [
    {
      part: 'Region',
      description: 'A section with aria-roledescription="carousel", named by the label. (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what an element is.)',
    },
    {
      part: 'Position',
      description: "Monospaced text such as \"1 to 3 of 8\", saying which items are showing. It updates on every scroll, but it isn't a live region, so screen readers don't read it out each time.",
    },
    {
      part: 'Previous / Next',
      description:
        "Secondary IconButtons, placed before the items in the Tab order. At the ends they're marked aria-disabled instead of disabled, so each stays a tab stop (a place the Tab key lands).",
    },
    {
      part: 'Track',
      description:
        "A list that's the browser's own scroll container, with scroll snap and no visible scrollbar. It's padded on all four sides, so an item at the edge draws its focus ring inside the track.",
    },
    { part: 'Item', description: 'A list item, one per child, at the item width. The edge of the next one always shows.' },
    {
      part: 'Status',
      description: "Hidden from view, read by screen readers. Says where the track stopped after a press on Previous or Next.",
    },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      description: "Required. The region's accessible name (the name a screen reader announces), for example \"Offers\". Leaving it out is a compile error.",
    },
    { name: 'children', type: 'ReactNode', description: 'Each child becomes one list item and keeps its own key.' },
    {
      name: 'itemWidth',
      type: 'string',
      default: "'min(18rem, 80%)'",
      description:
        "Any CSS length. A percentage is a share of the track's width. Keep it under the full width, so the edge of the next item shows.",
    },
    {
      name: 'gutter',
      type: 'string',
      default: "'0.5rem'",
      description:
        "The space between the track's edge and the first and last item, in any CSS length (rem is a unit tied to the base text size). It's never less than 0.5rem, whatever you pass, because an edge item draws its focus ring there. Set it to the page gutter to run the track edge to edge.",
    },
    { name: 'className', type: 'string', description: 'Merged onto the region.' },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Forwarded to the region.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to Previous, then Next, then through anything focusable in each item. An item scrolls into view as it takes focus.' },
    { keys: ['Enter', 'Space'], does: "On Previous or Next, scrolls one page of items. Does nothing (it's inert) at the matching end." },
    {
      keys: ['←', '→'],
      does: "Scroll the track when the track itself has focus. The track is only a tab stop when no item holds anything focusable.",
    },
  ],
  useWhen: 'A sideways preview of more items than fit, with a link to the full list nearby.',
  notFor: "A few items that fit: use a grid. And it's not for the only copy of anything.",
  dos: [
    'Name it for what it holds: "Offers", "Top-rated accessories".',
    'Give it enough items to scroll. Three that fit are a grid.',
    "Link to the full list nearby. A carousel is a preview, so it shouldn't be the only way to reach the rest.",
    'Set the gutter to the page gutter when the track should run to the edge of the page.',
  ],
  donts: [
    "Don't add autoplay. Content that moves on its own needs a pause control, and it pulls attention away from whoever's reading the page.",
    "Don't put the only copy of anything in it. What's off to the side is easy to miss.",
    "Don't hide the buttons on touch screens. A pointer, a switch device or a screen magnifier may be all someone has.",
    "Don't wrap it in an element with overflow hidden to tidy the edges. That clips the focus ring the gutter is there to show.",
  ],
}
