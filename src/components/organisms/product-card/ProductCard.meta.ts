import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ProductCard',
  title: 'Product card',
  tier: 'organisms',
  slug: 'product-card',
  summary:
    "One product as one link. Clicking anywhere on the card opens it, Add to cart stays a separate control, and a grid of cards adapts to the space it's given.",
  anatomy: [
    { part: 'Image', description: "Optional. Without one, there's a decorative placeholder. renderMedia can draw something else in the same box." },
    {
      part: 'Badge',
      description:
        "Optional. A short solid tag over the corner of the picture, like New or Sale. It sits outside the text flow, so names line up along a row of cards.",
    },
    {
      part: 'Name',
      description: "The heading, and the link. Its click area and its focus ring (the outline keyboard users see) cover the whole card.",
    },
    {
      part: 'Rating',
      description: "Optional. Screen readers hear the stars as 'rated 4.5 out of 5', and the review count is plain text.",
    },
    {
      part: 'Price',
      description: 'In text.primary, with tabular (equal-width) figures. A sale adds the old price struck through, which screen readers hear as "was".',
    },
    { part: 'Add to cart', description: "Sits above the link as its own target, and it's named after the product." },
  ],
  props: [
    {
      name: 'product (ProductCard)',
      type: 'Product',
      description:
        "Required. id, name, href and price (in the currency's minor unit, so cents for EUR). rating, image, badge and soldOut are optional.",
    },
    {
      name: 'onAddToCart',
      type: '(product: Product) => void',
      description: 'Draws Add to cart. Leave it out for a card that only links to the product.',
    },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: "Pick the level that fits the page's heading outline." },
    { name: 'currency', type: 'string', default: "'EUR'", description: 'Passed to formatMoney.' },
    { name: 'locale', type: 'string', default: "'en-IE'", description: 'Passed to formatMoney.' },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description:
        "Draws the name's link. It must pass className through, because that class carries the stretched click area and the focus ring.",
    },
    {
      name: 'renderMedia',
      type: '(product: Product) => ReactNode',
      default: "the product's image, 4:3, cover",
      description:
        "Draws the picture instead of the image or the placeholder, for example a staged cutout. Keep the 4:3 box and keep it decorative. The badge still sits over it.",
    },
    {
      name: 'className (ProductCard)',
      type: 'string',
      description: "Merged with the root classes. Later Tailwind utilities win.",
    },
    { name: 'ref (ProductCard)', type: 'Ref<HTMLElement>', description: 'Points at the article element.' },
    { name: 'products (Grid)', type: 'Product[]', description: 'Required.' },
    { name: 'label (Grid)', type: 'string', description: "Required. The list's accessible name, the name a screen reader announces for it." },
    {
      name: 'emptyMessage (Grid)',
      type: 'string',
      default: "'No products match.'",
      description:
        "Announced by a status message that's always on the page when products is empty. The list itself keeps rendering (so its ref stays stable), but it's hidden while there's nothing in it.",
    },
    {
      name: 'className (Grid)',
      type: 'string',
      description: "Merged with the list's own classes. Later Tailwind utilities win.",
    },
    { name: 'ref (Grid)', type: 'Ref<HTMLUListElement>', description: 'Points at the list element.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves to the product's link, then to Add to cart, then to the next card." },
    { keys: ['Enter'], does: 'On the link, opens the product. On Add to cart, adds it.' },
  ],
  useWhen: 'One product in a shop grid, where the whole card opens it and Add to cart sits on it.',
  notFor: 'A general content panel: use Card.',
  dos: [
    'Give the grid a label that says what it holds.',
    "Store prices in the currency's minor unit (cents for EUR). The card formats them.",
    "Pass headingLevel so the names fit the page's heading outline.",
  ],
  donts: [
    "Don't put another link or button in the card body. Only Add to cart sits above the stretched link.",
    "Don't colour the price. It's text.primary.",
    "Don't write alt text (the image description for screen readers) that repeats the name.",
  ],
}
